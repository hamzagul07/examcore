import { NextRequest, NextResponse } from 'next/server'
import { authenticateRouteRequest, jsonWithAuthCookies } from '@/lib/supabase-server'
import { saveOnboardingProfile, type OnboardingInput } from '@/lib/onboarding/save-profile'

export async function POST(request: NextRequest) {
  const { supabase, user, pendingCookies } = await authenticateRouteRequest(request)

  if (!user) {
    return jsonWithAuthCookies({ error: 'Not signed in' }, pendingCookies, {
      status: 401,
    })
  }

  let body: OnboardingInput
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const result = await saveOnboardingProfile(supabase, user.id, body)

  if (!result.ok) {
    return jsonWithAuthCookies({ error: result.error }, pendingCookies, {
      status: result.status,
    })
  }

  return jsonWithAuthCookies({ ok: true, role: result.role }, pendingCookies)
}
