import { NextRequest, NextResponse } from 'next/server'
import { authenticateRouteRequest, createServiceClient, jsonWithAuthCookies } from '@/lib/supabase-server'

export async function POST(req: NextRequest) {
  const { user, pendingCookies } = await authenticateRouteRequest(req)

  if (!user) {
    return jsonWithAuthCookies({ error: 'Not signed in' }, pendingCookies, {
      status: 401,
    })
  }

  let body: { invite_code?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const inviteCode = (body.invite_code || '').trim().toUpperCase()
  if (!inviteCode) {
    return NextResponse.json({ error: 'Invite code is required' }, { status: 400 })
  }

  const serviceClient = createServiceClient()
  const { data: classroom } = await serviceClient
    .from('classrooms')
    .select('id')
    .ilike('invite_code', inviteCode)
    .maybeSingle()

  if (!classroom) {
    return NextResponse.json({ error: 'Invalid invite code' }, { status: 404 })
  }

  const { error } = await serviceClient
    .from('classroom_memberships')
    .insert({ classroom_id: classroom.id, student_id: user.id })

  if (error) {
    if (error.code === '23505') {
      return jsonWithAuthCookies({ success: true, message: 'Already enrolled' }, pendingCookies)
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return jsonWithAuthCookies({ success: true }, pendingCookies)
}
