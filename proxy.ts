import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { isOnboardingComplete } from '@/lib/onboarding'
import { isAdminEmail } from '@/lib/admin-auth'
import { requireTeacher } from '@/lib/teacher-auth'
import {
  readPostAuthNextParam,
  resolvePostAuthPath,
  postOnboardingHref,
} from '@/lib/auth-redirect'

const PROTECTED_PREFIXES = ['/dashboard', '/account', '/onboarding', '/teacher', '/admin']
const AUTH_ENTRY_PREFIXES = ['/auth/signin', '/auth/signup']

const ONBOARDING_REQUIRED_PREFIXES = ['/dashboard', '/account', '/mark']

const TEACHER_PREFIXES = ['/teacher']
const ADMIN_PREFIXES = ['/admin']

function matchesPrefix(pathname: string, prefixes: string[]) {
  return prefixes.some(
    (prefix) => pathname === prefix || pathname.startsWith(prefix + '/')
  )
}

/** Preserve Supabase session cookies when issuing redirects. */
function redirectWithCookies(url: URL | string, supabaseResponse: NextResponse) {
  const response = NextResponse.redirect(url)
  supabaseResponse.cookies.getAll().forEach((cookie) => {
    response.cookies.set(cookie)
  })
  return response
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  let supabaseResponse = NextResponse.next({ request })

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
          supabaseResponse = NextResponse.next({ request })
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

  if (matchesPrefix(pathname, AUTH_ENTRY_PREFIXES)) {
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
      return redirectWithCookies(new URL(destination, request.url), supabaseResponse)
    }
    return supabaseResponse
  }

  if (!matchesPrefix(pathname, PROTECTED_PREFIXES)) {
    return supabaseResponse
  }

  if (!user) {
    // Let the route handler refresh cookies and send a clean sign-in next=.
    if (pathname === '/onboarding/complete') {
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

  if (matchesPrefix(pathname, TEACHER_PREFIXES)) {
    const teacherCheck = await requireTeacher(supabase, user.id)
    if (!teacherCheck.ok) {
      return redirectWithCookies(new URL('/dashboard', request.url), supabaseResponse)
    }
  }

  if (matchesPrefix(pathname, ADMIN_PREFIXES) && !isAdminEmail(user.email)) {
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

    const redirectUrl = request.nextUrl.clone()
    const next = request.nextUrl.searchParams.get('next')
    redirectUrl.pathname =
      next && next.startsWith('/') && !next.startsWith('//') && !next.includes('://')
        ? next
        : '/dashboard'
    redirectUrl.search = ''
    return redirectWithCookies(redirectUrl, supabaseResponse)
  }

  if (
    !onboarded &&
    matchesPrefix(pathname, ONBOARDING_REQUIRED_PREFIXES) &&
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
