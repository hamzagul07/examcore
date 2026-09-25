import { NextResponse } from 'next/server'
import { normalizePaperSession } from '@/lib/marking/normalize-paper-session'
import { sortQuestionNumbers } from '@/lib/marking/page-detection'
import { createClient } from '@/lib/supabase-server'
import { createServiceClient } from '@/lib/supabase/service'
import { requireTeacher } from '@/lib/teacher-auth'
import {
  pickTopicQuestions,
  questionPreview,
  resolveDepsFor,
  topicCodesFor,
  type BankQuestion,
} from '@/lib/teacher/assignments/resolve-items'
import { isPaperCode, isSubjectCode, isTopicCode } from '@/lib/teacher/assignments/validate'

export const dynamic = 'force-dynamic'

/** Questions a topic lookup returns — enough to choose from, small enough to scan. */
const TOPIC_RESULTS = 24

type PickerQuestion = {
  id: string
  paper_code: string
  paper_session: string
  question_number: string
  total_marks: number | null
  syllabus_tags: string[] | null
  preview: string | null
}

function badRequest(error: string, field: string) {
  return NextResponse.json({ error, field }, { status: 400 })
}

/**
 * GET `?subject_code&paper_code&paper_session` (one paper's questions, in
 * question order) or `?subject_code&topic_code` (questions tagged with a
 * syllabus topic, newest papers first, walking up the syllabus when the leaf
 * has none) → `{questions: [{id, paper_code, paper_session, question_number,
 * total_marks, syllabus_tags, preview}]}`.
 *
 * Teachers only. The bank is read with the service client for exactly those
 * columns plus question_text, which is cut to a ≤160-character preview here:
 * the mark scheme itself is never selected, so it cannot leak through this
 * route whatever the client asks for.
 */
export async function GET(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const teacherCheck = await requireTeacher(supabase, user.id)
  if (!teacherCheck.ok) return NextResponse.json({ error: 'Not a teacher' }, { status: 403 })

  const sp = new URL(request.url).searchParams
  const subjectCode = sp.get('subject_code')?.trim() ?? ''
  if (!isSubjectCode(subjectCode)) return badRequest('Pick a subject.', 'subject_code')
  const paperCode = sp.get('paper_code')?.trim() || null
  const paperSessionRaw = sp.get('paper_session')?.trim() || null
  const topicCode = sp.get('topic_code')?.trim() || null

  const admin = createServiceClient()
  const deps = resolveDepsFor(admin)
  let questions: BankQuestion[]

  try {
    if (paperCode || paperSessionRaw) {
      if (!isPaperCode(paperCode) || paperCode.split('/')[0] !== subjectCode) {
        return badRequest('Pick a paper for this subject (for example 9709/12).', 'paper_code')
      }
      const paperSession = paperSessionRaw && paperSessionRaw.length <= 40 ? normalizePaperSession(paperSessionRaw).label : ''
      if (!paperSession) return badRequest('Pick the paper’s exam session.', 'paper_session')
      const rows = await deps.paperQuestions(paperCode, paperSession)
      const order = sortQuestionNumbers(rows.map((r) => r.question_number))
      questions = order
        .map((qn) => rows.find((r) => r.question_number === qn))
        .filter((r): r is BankQuestion => !!r)
    } else if (topicCode) {
      if (!isTopicCode(topicCode)) return badRequest('Pick a topic from the syllabus.', 'topic_code')
      const codes = topicCodesFor(subjectCode, topicCode)
      if (!codes) return badRequest('That topic is not in this subject’s syllabus.', 'topic_code')
      questions = []
      const taken = new Set<string>()
      for (const code of codes) {
        if (questions.length >= TOPIC_RESULTS) break
        const candidates = (await deps.topicQuestions(subjectCode, code, 60)).filter(
          (q) => q.paper_code.split('/')[0] === subjectCode
        )
        for (const q of pickTopicQuestions(candidates, TOPIC_RESULTS - questions.length, taken)) {
          questions.push(q)
          taken.add(q.id)
        }
      }
    } else {
      return badRequest('Pick a paper or a topic.', 'paper_code')
    }

    // Previews in one read of the chosen rows' question text — never the scheme.
    const previews = new Map<string, string | null>()
    if (questions.length > 0) {
      const { data, error } = await admin
        .from('mark_schemes')
        .select('id, question_text')
        .in(
          'id',
          questions.map((q) => q.id)
        )
      if (error) throw new Error(`mark_schemes: ${error.message}`)
      for (const r of (data ?? []) as Array<{ id: string; question_text: string | null }>) {
        previews.set(r.id, questionPreview(r.question_text))
      }
    }

    const body: { questions: PickerQuestion[] } = {
      questions: questions.map((q) => ({
        id: q.id,
        paper_code: q.paper_code,
        paper_session: q.paper_session,
        question_number: q.question_number,
        total_marks: q.total_marks,
        syllabus_tags: q.syllabus_tags,
        preview: previews.get(q.id) ?? null,
      })),
    }
    // The bank changes when papers are extracted, not per request; a teacher
    // flicking between papers should not refetch the same one.
    return NextResponse.json(body, { headers: { 'Cache-Control': 'private, max-age=300' } })
  } catch (err) {
    console.error('[teacher/question-picker] failed', err instanceof Error ? err.message : err)
    return NextResponse.json({ error: 'Could not load questions.' }, { status: 500 })
  }
}
