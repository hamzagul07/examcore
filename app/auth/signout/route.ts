import { NextRequest, NextResponse } from 'next/server'
import {
  applyAuthCookies,
  createClientFromRequest,
  type SupabaseAuthCookie,
} from '@/lib/supabase-server'

async function signOutAndRedirectHome(request: NextRequest) {
  const pendingCookies: SupabaseAuthCookie[] = []
  const supabase = createClientFromRequest(request, (cookiesToSet) => {
    pendingCookies.push(...cookiesToSet)
  })
  await supabase.auth.signOut()

  const response = NextResponse.redirect(new URL('/', request.url), {
    status: 302,
  })
  return applyAuthCookies(response, pendingCookies)
}

/** POST — preferred (footer forms, settings). */
export async function POST(request: NextRequest) {
  return signOutAndRedirectHome(request)
}

/**
 * GET — Safari and footer links use navigation; without this, iOS Safari can
 * offer to "download" the route instead of signing out.
 */
export async function GET(request: NextRequest) {
  return signOutAndRedirectHome(request)
}
