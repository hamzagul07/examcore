import { NextRequest, NextResponse } from 'next/server'
import {
  authenticateRouteRequest,
  createServiceClient,
  jsonWithAuthCookies,
} from '@/lib/supabase-server'
import {
  buildAndSaveStudyPlan,
  deleteStudyPlan,
  isKnownPlanSubject,
  loadStudyPlan,
  setPlanDayDone,
  type BuildPlanRequest,
} from '@/lib/plan/study-plan-service'
import { PREPAREDNESS_LABEL, planLength, type Preparedness, type WeekAvailability } from '@/lib/plan/build-study-plan'
import { isoDate } from '@/lib/plan/plan-view'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * The student's study plan.
 *
 *   GET    → { plan, done } (plan null when none)
 *   POST   → build from { examDate, preparedness, minutesPerDay, availability,
 *            subjects, startDate?, remindMe? }; replaces any existing plan
 *   PATCH  → { day, done } ticks a day off
 *   DELETE → removes the plan
 *
 * `study_plans` is service-role only, so every branch authenticates the
 * session first and then acts through the service client on that user id.
 */

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/
const MAX_SUBJECTS = 4
const MIN_MINUTES = 25
const MAX_MINUTES = 300

function validIso(s: unknown): s is string {
  if (typeof s !== 'string' || !ISO_DATE.test(s)) return false
  const d = new Date(`${s}T00:00:00Z`)
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s
}

type ParsedBody = BuildPlanRequest & { remindMe?: boolean }

function parseBuildBody(body: unknown): { ok: true; value: ParsedBody } | { ok: false; error: string } {
  if (!body || typeof body !== 'object') return { ok: false, error: 'Invalid body.' }
  const b = body as Record<string, unknown>

  if (!validIso(b.examDate)) return { ok: false, error: 'Pick your exam date.' }

  // The client sends its local date so "Day 1" is the student's today, not
  // the server's. Anything further than a day from the server's clock is a
  // wrong clock, and the server's date wins.
  const serverToday = isoDate(new Date())
  let startDate = serverToday
  if (validIso(b.startDate)) {
    const diff = Math.abs(planLength(serverToday, b.startDate) || planLength(b.startDate, serverToday))
    if (diff <= 1) startDate = b.startDate
  }
  if (planLength(startDate, b.examDate) === 0) {
    return { ok: false, error: 'Your exam date needs to be after today.' }
  }

  const preparedness = b.preparedness
  if (typeof preparedness !== 'string' || !(preparedness in PREPAREDNESS_LABEL)) {
    return { ok: false, error: 'Tell us how prepared you feel.' }
  }

  const minutesPerDay = Number(b.minutesPerDay)
  if (!Number.isFinite(minutesPerDay) || minutesPerDay < MIN_MINUTES || minutesPerDay > MAX_MINUTES) {
    return { ok: false, error: `Minutes per day should be between ${MIN_MINUTES} and ${MAX_MINUTES}.` }
  }

  const availability = b.availability
  if (
    !Array.isArray(availability) ||
    availability.length !== 7 ||
    !availability.every((m) => Number.isFinite(Number(m)) && Number(m) >= 0 && Number(m) <= MAX_MINUTES)
  ) {
    return { ok: false, error: 'Availability needs seven weekday values.' }
  }

  const subjects = b.subjects
  if (!Array.isArray(subjects) || subjects.length === 0) {
    return { ok: false, error: 'Pick at least one subject.' }
  }
  const subjectCodes = [...new Set(subjects.map((s) => String(s).trim()).filter(Boolean))]
  if (subjectCodes.length === 0 || subjectCodes.length > MAX_SUBJECTS) {
    return { ok: false, error: `Pick between one and ${MAX_SUBJECTS} subjects.` }
  }
  for (const code of subjectCodes) {
    if (!isKnownPlanSubject(code)) return { ok: false, error: `Subject "${code}" isn't supported yet.` }
  }

  return {
    ok: true,
    value: {
      startDate,
      examDate: b.examDate,
      preparedness: preparedness as Preparedness,
      minutesPerDay: Math.round(minutesPerDay),
      availability: availability.map((m) => Math.round(Number(m))) as WeekAvailability,
      subjectCodes,
      remindMe: typeof b.remindMe === 'boolean' ? b.remindMe : undefined,
    },
  }
}

export async function GET(request: NextRequest) {
  const { user, pendingCookies } = await authenticateRouteRequest(request)
  if (!user) return jsonWithAuthCookies({ error: 'Not signed in' }, pendingCookies, { status: 401 })

  const saved = await loadStudyPlan(createServiceClient(), user.id)
  return jsonWithAuthCookies(saved ?? { plan: null, done: {} }, pendingCookies)
}

export async function POST(request: NextRequest) {
  const { user, pendingCookies } = await authenticateRouteRequest(request)
  if (!user) return jsonWithAuthCookies({ error: 'Not signed in' }, pendingCookies, { status: 401 })

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }
  const parsed = parseBuildBody(body)
  if (!parsed.ok) return jsonWithAuthCookies({ error: parsed.error }, pendingCookies, { status: 400 })

  const admin = createServiceClient()
  try {
    const saved = await buildAndSaveStudyPlan(admin, user.id, parsed.value)

    // The plan's exam date is the profile's exam date — the countdown, the
    // reminders and the plan should never disagree. The morning check-in
    // rides on the existing exam-reminder consent, set here only when the
    // student ticked the box.
    const profilePatch: Record<string, unknown> = { exam_date: parsed.value.examDate }
    if (typeof parsed.value.remindMe === 'boolean') {
      profilePatch.email_exam_reminders = parsed.value.remindMe
    }
    await admin.from('user_profiles').update(profilePatch).eq('id', user.id)

    return jsonWithAuthCookies(saved, pendingCookies)
  } catch (err) {
    console.error('[plan] build failed', err)
    return jsonWithAuthCookies(
      { error: "We couldn't build your plan just now. Try again in a moment." },
      pendingCookies,
      { status: 500 }
    )
  }
}

export async function PATCH(request: NextRequest) {
  const { user, pendingCookies } = await authenticateRouteRequest(request)
  if (!user) return jsonWithAuthCookies({ error: 'Not signed in' }, pendingCookies, { status: 401 })

  let body: { day?: unknown; done?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }
  const day = Number(body.day)
  if (!Number.isInteger(day) || day < 1 || typeof body.done !== 'boolean') {
    return jsonWithAuthCookies({ error: 'Expected { day, done }.' }, pendingCookies, { status: 400 })
  }

  const done = await setPlanDayDone(createServiceClient(), user.id, day, body.done)
  if (!done) return jsonWithAuthCookies({ error: 'No such plan day.' }, pendingCookies, { status: 404 })
  return jsonWithAuthCookies({ done }, pendingCookies)
}

export async function DELETE(request: NextRequest) {
  const { user, pendingCookies } = await authenticateRouteRequest(request)
  if (!user) return jsonWithAuthCookies({ error: 'Not signed in' }, pendingCookies, { status: 401 })
  await deleteStudyPlan(createServiceClient(), user.id)
  return jsonWithAuthCookies({ ok: true }, pendingCookies)
}
