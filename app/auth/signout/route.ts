import { NextRequest, NextResponse } from 'next/server'
import {
  applyAuthCookies,
  createClientFromRequest,
  type SupabaseAuthCookie,
} from '@/lib/supabase-server'

/**
 * POST — the only method that signs out.
 *
 * GET used to sign out as well ("Safari and footer links navigate"). That made
 * sign-out a CSRF target: any page on the web could log a student out mid-mark
 * with `<img src="https://markscheme.app/auth/signout">` (review §3). Every
 * in-app sign-out is a form POST (AppFooter, SignOutButton, TeacherNav); the
 * one navigation link left — the onboarding wizard's back link — goes to
 * /auth/signout/confirm, a page whose button POSTs here.
 */
export async function POST(request: NextRequest) {
  const pendingCookies: SupabaseAuthCookie[] = []
  const supabase = createClientFromRequest(request, (cookiesToSet) => {
    pendingCookies.push(...cookiesToSet)
  })
  await supabase.auth.signOut()

  // 303: the browser follows a POST with a GET, which is what "/" expects.
  const response = NextResponse.redirect(new URL('/', request.url), {
    status: 303,
  })
  return applyAuthCookies(response, pendingCookies)
}

/**
 * GET — never signs out. Old bookmarks and any link that still navigates here
 * land on the confirm page and sign out with one deliberate click.
 */
export async function GET(request: NextRequest) {
  return NextResponse.redirect(new URL('/auth/signout/confirm', request.url), {
    status: 303,
  })
}
