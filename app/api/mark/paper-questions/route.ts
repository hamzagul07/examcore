import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/marking/mark-runner'
import { sortQuestionNumbers } from '@/lib/marking/page-detection'

export async function GET(request: NextRequest) {
  const paperCode = new URL(request.url).searchParams.get('paper_code')
  const paperSession = new URL(request.url).searchParams.get('paper_session')

  if (!paperCode || !paperSession) {
    return NextResponse.json(
      { error: 'paper_code and paper_session required' },
      { status: 400 }
    )
  }

  const { data, error } = await supabaseAdmin
    .from('mark_schemes')
    .select('question_number, total_marks')
    .eq('paper_code', paperCode)
    .eq('paper_session', paperSession)

  if (error) {
    console.error('[mark/paper-questions] query failed:', error)
    return NextResponse.json({ error: 'Could not load paper questions' }, { status: 500 })
  }

  const nums = sortQuestionNumbers((data || []).map((r) => r.question_number))
  const fallback = Array.from({ length: 12 }, (_, i) => String(i + 1))

  return NextResponse.json({
    questions: nums.length ? nums : fallback,
    from_database: nums.length > 0,
  })
}
