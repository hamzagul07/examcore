import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code: rawCode } = await params
  const code = rawCode.trim()

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

  const { data, error } = await supabase
    .from('classrooms')
    .select(
      'id, name, description, teacher_id, board, level, subject, invite_code'
    )
    .ilike('invite_code', code)
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
