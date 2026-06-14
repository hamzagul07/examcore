import { NextRequest, NextResponse } from 'next/server'
import {
  applyAuthCookies,
  authenticateRouteRequest,
  jsonWithAuthCookies,
} from '@/lib/supabase-server'
import { createServiceClient } from '@/lib/supabase/service'
import { CONTACT_EMAIL } from '@/lib/site-config'

type Body = {
  confirm?: string
}

export async function POST(request: NextRequest) {
  const { supabase, user, pendingCookies } = await authenticateRouteRequest(request)

  if (!user) {
    return jsonWithAuthCookies({ error: 'Not signed in' }, pendingCookies, {
      status: 401,
    })
  }

  let body: Body = {}
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  if (body.confirm !== 'DELETE') {
    return NextResponse.json(
      { error: 'Type DELETE to confirm account removal.' },
      { status: 400 }
    )
  }

  const admin = createServiceClient()
  const { error } = await admin.auth.admin.deleteUser(user.id)

  if (error) {
    console.error('[account/delete]', error)
    return NextResponse.json(
      { error: `Could not delete your account. Contact ${CONTACT_EMAIL} for help.` },
      { status: 500 }
    )
  }

  await supabase.auth.signOut()

  return applyAuthCookies(NextResponse.json({ ok: true }), pendingCookies)
}
