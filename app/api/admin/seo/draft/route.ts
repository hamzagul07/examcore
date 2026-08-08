import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase-server'
import { isAdminUser } from '@/lib/admin-auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!isAdminUser(user)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: {
    concept?: string
    subjectCode?: string | null
    gradeLevel?: string
    prerequisites?: string[]
  }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const concept = (body.concept || '').trim().slice(0, 200)
  if (!concept) {
    return NextResponse.json({ error: 'Concept required' }, { status: 400 })
  }

  const subjectCode =
    typeof body.subjectCode === 'string' && /^\d{4}$/.test(body.subjectCode)
      ? body.subjectCode
      : null
  const prerequisites = Array.isArray(body.prerequisites)
    ? body.prerequisites.map((p) => String(p).slice(0, 40)).slice(0, 20)
    : []

  const draft = {
    title: concept,
    description: `${concept} — syllabus-aligned revision page`,
    breadcrumbs: ['Home', subjectCode ?? 'CAIE', concept],
    toc: [
      'definition',
      'diagram',
      'explanation',
      'examples',
      'questions',
      'quiz',
      'flashcards',
      'common misconceptions',
      'related topics',
      'references',
    ],
    prerequisites,
    surfaces: ['lesson', 'flashcards', 'faq', 'quiz', 'questions', 'mistakes'],
    markCta: subjectCode
      ? `/mark?subject=${subjectCode}`
      : '/mark',
  }

  const admin = createServiceClient()
  const { error } = await admin.from('seo_page_drafts').insert({
    concept,
    subject_code: subjectCode,
    grade_level: (body.gradeLevel || 'A-Level').slice(0, 40),
    prerequisites,
    draft,
    status: 'draft',
    created_by: user!.id,
  })

  if (error) {
    console.error('[seo/draft]', error.message)
    return NextResponse.json({ error: 'Could not save draft' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
