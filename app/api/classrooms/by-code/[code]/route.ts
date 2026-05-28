import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-server'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code: rawCode } = await params
  const code = rawCode.trim()

  console.log(
    '[by-code] Looking up:',
    code,
    'env service key present:',
    !!process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  let supabase
  try {
    supabase = createServiceClient()
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Service client error'
    console.error('[by-code] Service client failed:', message)
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

  console.log('[by-code] Result:', { found: !!data, error: error?.message })

  if (error || !data) {
    return NextResponse.json({
      classroom: null,
      debug: { code, error: error?.message },
    })
  }

  const { count } = await supabase
    .from('classroom_memberships')
    .select('*', { count: 'exact', head: true })
    .eq('classroom_id', data.id)

  return NextResponse.json({
    classroom: { ...data, studentCount: count || 0 },
  })
}
