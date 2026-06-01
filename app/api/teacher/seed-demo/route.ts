import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { createAdminClient } from '@/lib/supabase-admin'
import { requireTeacher } from '@/lib/teacher-auth'

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

const SYLLABUS_CODES = [
  '1.1',
  '1.2',
  '1.5',
  '1.7',
  '1.8',
  '2.2',
  '2.3',
  '3.7',
  '4.1',
  '5.5',
]

function demoAiMarking(totalMarks: number, earned: number) {
  const marksAwarded = Array.from({ length: totalMarks }, (_, i) => ({
    mark_id: `M${i + 1}`,
    type: i === 0 ? 'M1' : 'A1',
    earned: i < earned,
    reasoning:
      i < earned
        ? 'Correct method and answer.'
        : 'Sign error or incomplete working.',
  }))

  return {
    marks_awarded: marksAwarded,
    summary: 'Demo marking for teacher dashboard testing.',
    weak_topics: [],
    what_to_study_next: 'Review algebraic manipulation.',
  }
}

function demoLineReferences(totalMarks: number, earned: number) {
  return Array.from({ length: totalMarks }, (_, i) => ({
    mark_id: `M${i + 1}`,
    earned: i < earned,
    margin_note: i < earned ? null : 'Check your algebra here.',
    error_classification: i < earned ? null : 'algebraic_error',
    bbox: null,
    snippet: `Line ${i + 1} of working`,
  }))
}

export async function POST() {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not available in production' }, { status: 404 })
  }

  const supabase = await createClient()
  const admin = createAdminClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const teacherCheck = await requireTeacher(supabase, user.id)
  if (!teacherCheck.ok) {
    return NextResponse.json({ error: 'Not a teacher' }, { status: 403 })
  }

  const { data: classroom, error: classroomError } = await supabase
    .from('classrooms')
    .insert({
      teacher_id: user.id,
      name: 'Demo Class — Year 13 Mathematics',
      description: 'Auto-generated demo classroom with simulated student data',
    })
    .select()
    .single()

  if (classroomError || !classroom) {
    console.error('[teacher/seed-demo] classroom failed:', classroomError)
    return NextResponse.json(
      { error: 'Failed to create demo classroom' },
      { status: 500 }
    )
  }

  let attemptsCreated = 0

  for (const name of DEMO_STUDENT_NAMES) {
    const slug = name.toLowerCase().replace(/\s/g, '')
    const email = `demo-${classroom.id.slice(0, 8)}-${slug}@examcore-demo.local`

    const { data: authUser, error: authError } =
      await admin.auth.admin.createUser({
        email,
        password: `demo-${crypto.randomUUID().slice(0, 12)}`,
        email_confirm: true,
        user_metadata: { demo: true, full_name: name },
      })

    if (authError || !authUser.user) {
      console.error('[teacher/seed-demo] auth user failed:', authError)
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

    await admin.from('classroom_memberships').insert({
      classroom_id: classroom.id,
      student_id: studentId,
    })

    const attemptCount = 5 + Math.floor(Math.random() * 11)
    const studentAbility = Math.random()

    for (let i = 0; i < attemptCount; i++) {
      const totalMarks = 3 + Math.floor(Math.random() * 6)
      const earnedRatio = Math.max(
        0,
        Math.min(1, studentAbility + (Math.random() * 0.4 - 0.2))
      )
      const marksEarned = Math.round(totalMarks * earnedRatio)

      const topicCount = 1 + Math.floor(Math.random() * 2)
      const tags = [
        ...new Set(
          Array.from(
            { length: topicCount },
            () => SYLLABUS_CODES[Math.floor(Math.random() * SYLLABUS_CODES.length)]
          )
        ),
      ]

      const timePerMark = 1.0 + Math.random() * 1.5
      const timeSeconds = Math.round(totalMarks * timePerMark * 60)
      const daysAgo = Math.floor(Math.random() * 30)
      const createdAt = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000)

      const withFullMarking = i < 2

      await admin.from('attempts').insert({
        user_id: studentId,
        source_type: 'other',
        question_text: withFullMarking
          ? 'Find the value of ∫₀¹ (2x + 1) dx.'
          : null,
        marks_earned: marksEarned,
        total_marks: totalMarks,
        syllabus_tags: tags,
        time_spent_seconds: timeSeconds,
        created_at: createdAt.toISOString(),
        ai_marking: withFullMarking
          ? demoAiMarking(totalMarks, marksEarned)
          : null,
        line_references: withFullMarking
          ? demoLineReferences(totalMarks, marksEarned)
          : null,
      })

      attemptsCreated++
    }
  }

  return NextResponse.json({
    success: true,
    classroom_id: classroom.id,
    students_created: DEMO_STUDENT_NAMES.length,
    attempts_created: attemptsCreated,
  })
}
