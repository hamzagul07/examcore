import { NextRequest, NextResponse } from 'next/server'
import {
  authenticateRouteRequest,
  createServiceClient,
  jsonWithAuthCookies,
} from '@/lib/supabase-server'
import {
  saveOnboardingProfile,
  type OnboardingInput,
} from '@/lib/onboarding/save-profile'
import { verifyOnboardingSaveToken } from '@/lib/onboarding/save-token'

type OnboardingApiBody = OnboardingInput & {
  saveToken?: string
}

export async function POST(request: NextRequest) {
  let body: OnboardingApiBody
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { saveToken, ...input } = body
  const verified = verifyOnboardingSaveToken(saveToken)

  if (verified) {
    const service = createServiceClient()
    const result = await saveOnboardingProfile(service, verified.userId, input)
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status })
    }
    return NextResponse.json({ ok: true, role: result.role })
  }

  const { supabase, user, pendingCookies } =
    await authenticateRouteRequest(request)

  if (!user) {
    return jsonWithAuthCookies({ error: 'Not signed in' }, pendingCookies, {
      status: 401,
    })
  }

  const result = await saveOnboardingProfile(supabase, user.id, input)

  if (!result.ok) {
    return jsonWithAuthCookies({ error: result.error }, pendingCookies, {
      status: result.status,
    })
  }

  return jsonWithAuthCookies({ ok: true, role: result.role }, pendingCookies)
}
