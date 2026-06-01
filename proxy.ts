import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { isOnboardingComplete } from '@/lib/onboarding'

const PROTECTED_PREFIXES = [
  '/dashboard',
  '/mark',
  '/account',
  '/onboarding',
]

const ONBOARDING_REQUIRED_PREFIXES = [
  '/dashboard',
  '/mark',
  '/account',
]

function matchesPrefix(pathname: string, prefixes: string[]) {
  return prefixes.some(
    (prefix) => pathname === prefix || pathname.startsWith(prefix + '/')
  )
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (pathname.startsWith('/teacher') || pathname.startsWith('/join')) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

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

  if (!matchesPrefix(pathname, PROTECTED_PREFIXES)) {
    return supabaseResponse
  }

  if (!user) {
    const redirectUrl = request.nextUrl.clone()
    redirectUrl.pathname = '/auth/signin'
    redirectUrl.search = ''
    const intended = request.nextUrl.pathname + request.nextUrl.search
    redirectUrl.searchParams.set('next', intended)
    return NextResponse.redirect(redirectUrl)
  }

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('onboarded, onboarding_completed')
    .eq('id', user.id)
    .maybeSingle()

  const onboarded = isOnboardingComplete(profile)
  const onOnboardingPage = matchesPrefix(pathname, ['/onboarding'])

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
    return NextResponse.redirect(redirectUrl)
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
    return NextResponse.redirect(redirectUrl)
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
}
