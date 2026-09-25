import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { requireTeacher } from '@/lib/teacher-auth'
import { loadTeacherOverview } from '@/lib/teacher/overview'

export const dynamic = 'force-dynamic'

/**
 * GET → `TeacherOverview` — every class with its open sets, due-this-week,
 * unreviewed hand-ins and overdue students, plus the "Needs you" totals the
 * desk leads with. Read entirely with the teacher's RLS client; the
 * definitions live in lib/teacher/overview.ts.
 */
export async function GET() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const teacherCheck = await requireTeacher(supabase, user.id)
  if (!teacherCheck.ok) return NextResponse.json({ error: 'Not a teacher' }, { status: 403 })

  try {
    const overview = await loadTeacherOverview(supabase, user.id)
    return NextResponse.json(overview, { headers: { 'Cache-Control': 'no-store' } })
  } catch (err) {
    console.error('[teacher/overview] load failed:', err instanceof Error ? err.message : err)
    return NextResponse.json({ error: 'Could not load your desk.' }, { status: 500 })
  }
}
