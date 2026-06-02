import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

async function signOutAndRedirectHome(request: Request) {
  const supabase = await createClient()
  await supabase.auth.signOut()
  return NextResponse.redirect(new URL('/', request.url), { status: 302 })
}

/** POST — preferred (footer forms, settings). */
export async function POST(request: Request) {
  return signOutAndRedirectHome(request)
}

/**
 * GET — Safari and footer links use navigation; without this, iOS Safari can
 * offer to "download" the route instead of signing out.
 */
export async function GET(request: Request) {
  return signOutAndRedirectHome(request)
}