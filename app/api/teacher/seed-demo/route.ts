import { NextResponse } from 'next/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase-server'
import { createServiceClient } from '@/lib/supabase/service'
import { requireTeacher } from '@/lib/teacher-auth'
import { generateInviteCode } from '@/lib/teacher/invite-code'
import { isLate } from '@/lib/teacher/assignment-status'
import { demoSeedingEnabled } from '@/lib/teacher/list-classrooms'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 60

const DEMO_STUDENT_NAMES = [
  'Sarah Chen',
  'Marcus Johnson',
  'Priya Patel',
  'James Wilson',
  'Aisha Khan',
  'Daniel Lee',
  'Emma Brown',
  'Mohammed Al-Sayed',
  'Lily Zhang',
  'Noah Garcia',
  'Zara Ahmed',
  'Oliver Smith',
]

/** 9709 syllabus codes the demo attempts are tagged with. */
const SYLLABUS_CODES = ['1.1', '1.2', '1.5', '1.7', '1.8', '2.2', '2.3', '3.7', '4.1', '5.5']

const DEMO_PROMPTS = [
  { prompt: 'Find ∫₀¹ (2x + 1) dx, showing your working.', marks: 3 },
  { prompt: 'Differentiate y = x³ − 4x and find the stationary points.', marks: 5 },
  { prompt: 'Solve 2cos²θ − cos θ − 1 = 0 for 0° ≤ θ ≤ 360°.', marks: 4 },
]

const DAY_MS = 86_400_000

/**
 * Deterministic PRNG (mulberry32) seeded from the classroom id, so the same
 * example class looks the same every time it is rebuilt — which matters when
 * it is used to reproduce a bug or record a walkthrough.
 */
function seededRandom(seed: string): () => number {
  let a = 0
  for (let i = 0; i < seed.length; i++) a = (Math.imul(a ^ seed.charCodeAt(i), 2654435761) + i) | 0
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function demoAiMarking(totalMarks: number, earned: number, detailed: boolean) {
  return {
    // The paper code places every demo attempt in 9709 for the class's
    // subject-scoped analytics, the way a real past-paper mark is placed.
    paper_code: '9709/12',
    paper_session: 'm/j/24',
    ...(detailed
      ? {
          marks_awarded: Array.from({ length: totalMarks }, (_, i) => ({
            mark_id: `M${i + 1}`,
            type: i === 0 ? 'M1' : 'A1',
            earned: i < earned,
            reasoning: i < earned ? 'Correct method and answer.' : 'Sign error or incomplete working.',
          })),
          summary: 'Example marking for the teacher demo class.',
          weak_topics: [],
          what_to_study_next: 'Review algebraic manipulation.',
        }
      : {}),
  }
}

async function createDemoClassroom(supabase: SupabaseClient, teacherId: string) {
  for (let attempt = 1; attempt <= 5; attempt++) {
    const { data, error } = await supabase
      .from('classrooms')
      .insert({
        teacher_id: teacherId,
        name: 'Example class — Year 13 Mathematics',
        description: 'Simulated students and marks, so you can see the desk before your own class arrives.',
        board: 'Cambridge International',
        level: 'A-Level',
        subject: 'Mathematics',
        subject_code: '9709',
        year_group: 'Year 13',
        settings: { demo: true, notify_submissions: 'off' },
        invite_code: generateInviteCode(),
      })
      .select('id')
      .single()
    if (data) return data.id as string
    if (error?.code !== '23505') throw new Error(error?.message ?? 'classroom insert failed')
  }
  throw new Error('could not make a unique invite code')
}

/**
 * POST → `{ success, classroom_id, … }` — builds an example class for the
 * signed-in teacher: twelve simulated students with a month of marked work,
 * and one published set (due two days ago) with a realistic spread of
 * on-time, late, excused and missing hand-ins, so every state of the desk,
 * the week strip and the completion matrix has something in it.
 *
 * Never in production (demoSeedingEnabled): it creates real auth users. A
 * teacher who already has a live example class gets that one back instead of
 * a second set of fake students. The class carries `settings.demo = true`,
 * which is what every page keys its "Example data" flag on.
 */
export async function POST() {
  if (!demoSeedingEnabled()) {
    return NextResponse.json({ error: 'Not available in production' }, { status: 404 })
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const teacherCheck = await requireTeacher(supabase, user.id)
  if (!teacherCheck.ok) return NextResponse.json({ error: 'Not a teacher' }, { status: 403 })

  const { data: existing } = await supabase
    .from('classrooms')
    .select('id')
    .eq('teacher_id', user.id)
    .contains('settings', { demo: true })
    .is('archived_at', null)
    .limit(1)
    .maybeSingle()
  if (existing?.id) {
    return NextResponse.json({ success: true, classroom_id: existing.id, reused: true })
  }

  const admin = createServiceClient()
  let classroomId: string
  try {
    classroomId = await createDemoClassroom(supabase, user.id)
  } catch (err) {
    console.error('[teacher/seed-demo] classroom failed:', err instanceof Error ? err.message : err)
    return NextResponse.json({ error: 'Could not build the example class.' }, { status: 500 })
  }

  const rand = seededRandom(classroomId)
  const now = Date.now()
  const joinedAt = new Date(now - 35 * DAY_MS).toISOString()
  const students: Array<{ id: string; ability: number }> = []
  let attemptsCreated = 0

  for (const name of DEMO_STUDENT_NAMES) {
    const slug = name.toLowerCase().replace(/[^a-z]/g, '')
    const email = `demo-${classroomId.slice(0, 8)}-${slug}@markscheme-demo.local`
    const { data: authUser, error: authError } = await admin.auth.admin.createUser({
      email,
      password: `demo-${crypto.randomUUID()}`,
      email_confirm: true,
      user_metadata: { demo: true, full_name: name },
    })
    if (authError || !authUser.user) {
      console.error('[teacher/seed-demo] auth user failed:', authError?.message)
      continue
    }
    const studentId = authUser.user.id

    await admin.from('user_profiles').upsert({
      id: studentId,
      full_name: name,
      role: 'student',
      board: 'Cambridge International',
      level: 'A-Level',
      subjects: ['Mathematics'],
      onboarded: true,
    })

    // Memberships are service-role writes (CONTRACTS ruling 15).
    const { error: memberError } = await admin
      .from('classroom_memberships')
      .insert({ classroom_id: classroomId, student_id: studentId, status: 'active', joined_at: joinedAt })
    if (memberError) {
      console.error('[teacher/seed-demo] membership failed:', memberError.message)
      continue
    }

    const ability = rand()
    students.push({ id: studentId, ability })

    const count = 5 + Math.floor(rand() * 11)
    const rows = Array.from({ length: count }, (_, i) => {
      const totalMarks = 3 + Math.floor(rand() * 6)
      const ratio = Math.max(0, Math.min(1, ability + (rand() * 0.4 - 0.2)))
      const earned = Math.round(totalMarks * ratio)
      const tags = [
        ...new Set(
          Array.from({ length: 1 + Math.floor(rand() * 2) }, () => SYLLABUS_CODES[Math.floor(rand() * SYLLABUS_CODES.length)])
        ),
      ]
      return {
        user_id: studentId,
        source_type: 'other',
        question_text: i < 2 ? 'Find the value of ∫₀¹ (2x + 1) dx.' : null,
        marks_earned: earned,
        total_marks: totalMarks,
        syllabus_tags: tags,
        time_spent_seconds: Math.round(totalMarks * (1 + rand() * 1.5) * 60),
        created_at: new Date(now - Math.floor(rand() * 28) * DAY_MS - Math.floor(rand() * DAY_MS)).toISOString(),
        ai_marking: demoAiMarking(totalMarks, earned, i < 2),
      }
    })
    const { error: attemptsError } = await admin.from('attempts').insert(rows)
    if (attemptsError) console.error('[teacher/seed-demo] attempts failed:', attemptsError.message)
    else attemptsCreated += rows.length
  }

  // One published set, due two days ago, so the desk has late and missing
  // students to show and the set is still inside its week of grace.
  const dueAt = new Date(now - 2 * DAY_MS)
  dueAt.setUTCHours(16, 0, 0, 0)
  const { data: set, error: setError } = await supabase
    .from('assignments')
    .insert({
      classroom_id: classroomId,
      teacher_id: user.id,
      title: 'Calculus and trig — practice set 1',
      instructions: 'Three short questions. Show every step; method marks are where this set is won.',
      kind: 'practice_prompt',
      subject_code: '9709',
      target: 'all',
      due_at: dueAt.toISOString(),
      published_at: new Date(now - 9 * DAY_MS).toISOString(),
      settings: { allow_late: true },
    })
    .select('id')
    .single()

  let handIns = 0
  if (setError || !set) {
    console.error('[teacher/seed-demo] assignment failed:', setError?.message)
  } else {
    const { data: items, error: itemsError } = await supabase
      .from('assignment_items')
      .insert(
        DEMO_PROMPTS.map((p, position) => ({
          assignment_id: set.id,
          position,
          item_type: 'prompt',
          prompt_text: p.prompt,
          total_marks: p.marks,
        }))
      )
      .select('id, position, total_marks')
    if (itemsError || !items) {
      console.error('[teacher/seed-demo] items failed:', itemsError?.message)
    } else {
      const ordered = [...items].sort((a, b) => a.position - b.position)
      // Spread: most on time, two late, one part-done, one excused, the rest missing.
      for (const [index, student] of students.entries()) {
        if (index === 9) {
          await admin.from('assignment_students').insert({
            assignment_id: set.id,
            student_id: student.id,
            excused_at: new Date(now - 4 * DAY_MS).toISOString(),
          })
          continue
        }
        if (index >= 10) continue
        const late = index === 7 || index === 8
        const partial = index === 6
        const handedAt = late ? now - 1 * DAY_MS : dueAt.getTime() - (1 + Math.floor(rand() * 4)) * DAY_MS
        for (const item of partial ? ordered.slice(0, 1) : ordered) {
          const total = Number(item.total_marks) || 3
          const earned = Math.round(total * Math.max(0, Math.min(1, student.ability + (rand() * 0.3 - 0.15))))
          const at = new Date(handedAt + Math.floor(rand() * 3_600_000)).toISOString()
          const { data: attempt } = await admin
            .from('attempts')
            .insert({
              user_id: student.id,
              source_type: 'other',
              question_text: DEMO_PROMPTS[item.position]?.prompt ?? null,
              marks_earned: earned,
              total_marks: total,
              syllabus_tags: [SYLLABUS_CODES[item.position % SYLLABUS_CODES.length]],
              time_spent_seconds: total * 90,
              created_at: at,
              assignment_item_id: item.id,
              ai_marking: demoAiMarking(total, earned, true),
            })
            .select('id')
            .single()
          const { error: subError } = await admin.from('assignment_submissions').insert({
            assignment_id: set.id,
            item_id: item.id,
            student_id: student.id,
            attempt_id: attempt?.id ?? null,
            attempt_count: 1,
            marks_earned: earned,
            total_marks: total,
            status: isLate(at, dueAt.toISOString(), null) ? 'late' : 'submitted',
            source: 'linked',
            first_submitted_at: at,
            last_submitted_at: at,
          })
          if (subError) console.error('[teacher/seed-demo] hand-in failed:', subError.message)
          else handIns++
          if (attempt) attemptsCreated++
        }
      }
    }
  }

  return NextResponse.json({
    success: true,
    classroom_id: classroomId,
    students_created: students.length,
    attempts_created: attemptsCreated,
    hand_ins_created: handIns,
    assignment_id: set?.id ?? null,
  })
}
