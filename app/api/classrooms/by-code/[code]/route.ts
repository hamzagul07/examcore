import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { parseInviteCode } from '@/lib/teacher/invite-code'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code: rawCode } = await params
  // Validated against a strict charset before it can reach the query. This used
  // to be a bare `.trim()` fed into ILIKE, which made `/join/%` a wildcard that
  // matched every classroom and returned one of them to an anonymous caller.
  const code = parseInviteCode(rawCode)

  if (!code) {
    return NextResponse.json({ classroom: null, error: 'Invalid invite code' })
  }

  let supabase
  try {
    supabase = createServiceClient()
  } catch {
    return NextResponse.json(
      { error: 'Invite lookup is temporarily unavailable' },
      { status: 503 }
    )
  }

  // `teacher_id` is deliberately not selected: this endpoint is unauthenticated
  // and its only job is to show a student what they are about to join.
  const { data, error } = await supabase
    .from('classrooms')
    .select('id, name, description, board, level, subject, invite_code')
    .eq('invite_code', code)
    .maybeSingle()

  if (error || !data) {
    return NextResponse.json({ classroom: null })
  }

  const { count } = await supabase
    .from('classroom_memberships')
    .select('*', { count: 'exact', head: true })
    .eq('classroom_id', data.id)

  return NextResponse.json({
    classroom: { ...data, studentCount: count || 0 },
  })
}
