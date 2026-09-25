import { createServerClient } from '@supabase/ssr'
import { NextRequest, NextResponse } from 'next/server'
import { isOnboardingComplete } from '@/lib/onboarding'
import { isAdminEmail } from '@/lib/admin-auth'
import { requireTeacher } from '@/lib/teacher-auth'
import {
  matchesRoutePrefix,
  requiresAuthMiddleware,
  requiresGuestSignup,
  requiresOnboarding,
} from '@/lib/auth-gates'
import {
  readPostAuthNextParam,
  resolvePostAuthPath,
  postOnboardingHref,
  resolveSameOriginUrl,
} from '@/lib/auth-redirect'

const AUTH_ENTRY_PREFIXES = ['/auth/signin', '/auth/signup']

const TEACHER_PREFIXES = ['/teacher']
const ADMIN_PREFIXES = ['/admin']

/** HTTP redirects for marketing URLs — avoids Next.js meta-refresh from `redirect()`. */
function marketingSeoRedirect(request: NextRequest): NextResponse | null {
  const { pathname, searchParams } = request.nextUrl

  if (pathname === '/community') {
    if (searchParams.get('ask') === '1') {
      const url = request.nextUrl.clone()
      url.pathname = '/community/submit'
      url.searchParams.delete('ask')
      if (!url.searchParams.has('kind')) url.searchParams.set('kind', 'question')
      return NextResponse.redirect(url, 307)
    }
    const subject = searchParams.get('subject')?.trim()
    if (subject) {
      const url = request.nextUrl.clone()
      url.pathname = `/community/s/${encodeURIComponent(subject)}`
      url.searchParams.delete('subject')
      return NextResponse.redirect(url, 307)
    }
  }

  if (pathname === '/blog/browse' || pathname === '/blog/browse/') {
    const url = request.nextUrl.clone()
    url.pathname = '/blog'
    url.search = ''
    return NextResponse.redirect(url, 308)
  }

  // Metadata generateSitemaps 404s /sitemap.xml; real index lives here.
  if (pathname === '/sitemap.xml') {
    const url = request.nextUrl.clone()
    url.pathname = '/sitemap-index.xml'
    return NextResponse.redirect(url, 308)
  }

  return null
}

/** Preserve Supabase session cookies when issuing redirects. */
function redirectWithCookies(url: URL | string, supabaseResponse: NextResponse) {
  const response = NextResponse.redirect(url)
  supabaseResponse.cookies.getAll().forEach((cookie) => {
    response.cookies.set(cookie)
  })
  return response
}

/**
 * Redirect to a user-influenced destination, refusing to leave this origin.
 *
 * The sanitizers upstream (`resolvePostAuthPath`, `postOnboardingHref`) check
 * the *shape* of a path; this is the sink, where `new URL(dest, request.url)`
 * would happily turn `/\evil.com` into `https://evil.com/` (WHATWG treats `\`
 * as `/`). A signed-in user hitting `/auth/signin?next=/\evil.com` was sent
 * off-site with freshly refreshed auth cookies attached (review §1.1). Asking
 * the URL parser itself, right here, is the check that cannot drift.
 */
function redirectSameOrigin(
  destination: string,
  request: NextRequest,
  supabaseResponse: NextResponse,
  fallback = '/dashboard'
) {
  // The absolute URL built ON the checked origin, not a path string
  // re-resolved against request.url: a path that normalised to `//evil.com`
  // (dot segments collapse before the origin check) once survived the
  // string check and went off-site at exactly this second resolution.
  const target =
    resolveSameOriginUrl(destination, request.nextUrl.origin) ??
    new URL(fallback, request.nextUrl.origin)
  return redirectWithCookies(target, supabaseResponse)
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  const seoRedirect = marketingSeoRedirect(request)
  if (seoRedirect) return seoRedirect

  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-pathname', pathname)
  const forwardedRequest = new NextRequest(request.url, { headers: requestHeaders })

  let supabaseResponse = NextResponse.next({ request: forwardedRequest })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          // Keep the forwarded request so the session refresh below sees the
          // same headers the route will.
          //
          // `x-pathname` (set above) no longer has a reader: marketing chrome
          // used to resolve its variant from it at request time, which opted the
          // whole route group out of static generation. That decision now lives
          // in the route tree — app/(marketing)/(reading|chrome|bare). The header
          // is left in place because unsetting it means reworking this forwarded
          // request, which is on the auth path, for no gain.
          supabaseResponse = NextResponse.next({ request: forwardedRequest })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Signed-in users opening the marketing homepage land on their desk.
  // Sign-in from `/` used to pass next=/ and dump them back on the landing page.
  if (user && pathname === '/') {
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('onboarded, onboarding_completed, role')
      .eq('id', user.id)
      .maybeSingle()
    const destination = resolvePostAuthPath(
      isOnboardingComplete(profile),
      null,
      profile?.role === 'teacher' ? 'teacher' : 'student'
    )
    return redirectSameOrigin(destination, request, supabaseResponse)
  }

  if (matchesRoutePrefix(pathname, AUTH_ENTRY_PREFIXES)) {
    if (user) {
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('onboarded, onboarding_completed')
        .eq('id', user.id)
        .maybeSingle()

      const nextParam = readPostAuthNextParam(
        request.nextUrl.searchParams.get('next'),
        request.nextUrl.searchParams.get('redirect')
      )
      const destination = resolvePostAuthPath(
        isOnboardingComplete(profile),
        nextParam
      )
      return redirectSameOrigin(destination, request, supabaseResponse)
    }
    return supabaseResponse
  }

  if (!requiresAuthMiddleware(pathname)) {
    return supabaseResponse
  }

  if (!user) {
    // The completion hop handles its own missing-session case: it sends the
    // user to sign in with `completed=1` so the page can say the profile was
    // saved. Bouncing here would lose that hint. It never restores a session
    // on its own — that path was removed with the onboarding save token.
    if (pathname === '/onboarding/complete') {
      return supabaseResponse
    }

    if (requiresGuestSignup(pathname)) {
      return supabaseResponse
    }

    const redirectUrl = request.nextUrl.clone()
    redirectUrl.pathname = '/auth/signin'
    redirectUrl.search = ''
    const intended = request.nextUrl.pathname + request.nextUrl.search
    const cleanNext = postOnboardingHref(
      new URL(intended, request.url).searchParams.get('next'),
      pathname.startsWith('/onboarding') ? '/onboarding' : '/dashboard'
    )
    redirectUrl.searchParams.set('next', cleanNext)
    return redirectWithCookies(redirectUrl, supabaseResponse)
  }

  if (matchesRoutePrefix(pathname, TEACHER_PREFIXES)) {
    const teacherCheck = await requireTeacher(supabase, user.id)
    if (!teacherCheck.ok) {
      return redirectWithCookies(new URL('/dashboard', request.url), supabaseResponse)
    }
  }

  if (matchesRoutePrefix(pathname, ADMIN_PREFIXES) && !isAdminEmail(user.email)) {
    return redirectWithCookies(new URL('/dashboard', request.url), supabaseResponse)
  }

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('onboarded, onboarding_completed')
    .eq('id', user.id)
    .maybeSingle()

  const onboarded = isOnboardingComplete(profile)
  const onOnboardingPage = pathname === '/onboarding'

  if (onOnboardingPage && onboarded) {
    const rerun = request.nextUrl.searchParams.get('rerun') === '1'
    if (rerun) {
      return supabaseResponse
    }

    // `postOnboardingHref` rather than a bare shape check: it also refuses a
    // `next` back to /onboarding or /auth/*, which for an already-onboarded
    // user is a redirect loop, and it keeps the destination's query string
    // (assigning the whole thing to `pathname` used to encode `?` as `%3F`).
    const next = request.nextUrl.searchParams.get('next')
    return redirectSameOrigin(
      postOnboardingHref(next, '/dashboard'),
      request,
      supabaseResponse
    )
  }

  if (
    !onboarded &&
    requiresOnboarding(pathname) &&
    !onOnboardingPage
  ) {
    const redirectUrl = request.nextUrl.clone()
    redirectUrl.pathname = '/onboarding'
    redirectUrl.search = ''
    const intended = request.nextUrl.pathname + request.nextUrl.search
    redirectUrl.searchParams.set('next', intended)
    return redirectWithCookies(redirectUrl, supabaseResponse)
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
}
