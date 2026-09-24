import { NextRequest, NextResponse } from 'next/server'
import {
  authenticateRouteRequest,
  createServiceClient,
  jsonWithAuthCookies,
} from '@/lib/supabase-server'
import {
  buildAndSaveRoadmap,
  buildAndSaveStudyPlan,
  deleteStudyPlan,
  isKnownPlanSubject,
  loadRoadmapRolled,
  markCheckinOpened,
  previewRoadmap,
  setPlanDayDone,
  type BuildPlanRequest,
  type RoadmapServiceRequest,
} from '@/lib/plan/study-plan-service'
import { recordRoadmapEvent } from '@/lib/plan/events'
import { planLength, type WeekAvailability } from '@/lib/plan/build-study-plan'
import { isValidTimeZone, isoDate, todayInZone } from '@/lib/plan/plan-view'
import { isRoadmapMode, modeFromStored } from '@/lib/plan/modes'
import { isClockTime, minuteOfDayInZone } from '@/lib/plan/availability'
import { minuteOfDay } from '@/lib/plan/roadmap-view'
import {
  COMMITMENT_KIND_LABEL,
  MAX_PAPERS_PER_SUBJECT,
  type RoadmapBuildRequest,
  MIN_DAY_MINUTES,
  SELF_RATINGS,
  SESSION_LENGTHS,
  type Commitment,
  type RoadmapAvailability,
  type SelfRating,
  type SessionLength,
  type TimeWindow,
  type Weekday,
} from '@/lib/plan/roadmap-types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * The student's study plan.
 *
 *   GET    → { plan, done, taskState, revision, evidence, canUndo } (plan
 *            null when none). Runs the lazy rollover first, so the day the
 *            student sees has already settled what happened since they last
 *            looked; the plan carries lastDiff so "what changed" and Undo
 *            survive the page load. ?src=checkin marks a check-in as opened;
 *            so does any read within a day of a send.
 *   POST   → build. A v3 body (mode, availabilityDetail, …) builds a
 *            roadmap; preview: true returns { plan, feasibility } without
 *            saving. When the plan starts today, the server's minute in the
 *            student's zone rides along (startMinute) for both, so the
 *            wizard's preview and the saved day 1 begin now rather than at
 *            the first window. A legacy body (preparedness, minutesPerDay,
 *            availability) still builds a v2 plan. Replaces any existing plan.
 *   PATCH  → { day, done } ticks a day off
 *   DELETE → removes the plan
 *
 * `study_plans` is service-role only, so every branch authenticates the
 * session first and then acts through the service client on that user id.
 */

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/
const MAX_SUBJECTS = 4
/** A 10-minute recall task is real work; below it nothing is. */
const MIN_MINUTES = MIN_DAY_MINUTES
const MAX_MINUTES = 600
const MAX_BLOCKED_DATES = 60
const MAX_WINDOWS = 4
const MAX_COMMITMENTS = 20
const MAX_LABEL = 40
const MAX_COMPONENT = 40
const MAX_TARGET_GRADE = 12
/** Previews per minute per student; the wizard debounces, a loop does not. */
const PREVIEW_PER_MINUTE = 20

function validIso(s: unknown): s is string {
  if (typeof s !== 'string' || !ISO_DATE.test(s)) return false
  const d = new Date(`${s}T00:00:00Z`)
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s
}

type Parsed =
  | { ok: true; kind: 'roadmap'; value: RoadmapServiceRequest }
  | { ok: true; kind: 'legacy'; value: BuildPlanRequest & { remindMe?: boolean } }
  | { ok: false; error: string }

type Common = {
  startDate: string
  examDate: string
  subjectCodes: string[]
  timeZone: string
  blockedDates: string[]
  subjectExamDates: Record<string, string>
  remindMe?: boolean
}

/** What every body shares: dates, subjects, zone, days away. */
function parseCommon(b: Record<string, unknown>): { ok: true; value: Common } | { ok: false; error: string } {
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

  // The browser's zone, so "today" on the plan is the student's. An unknown
  // or missing zone reads as UTC rather than failing the build.
  const timeZone = typeof b.timeZone === 'string' && isValidTimeZone(b.timeZone) ? b.timeZone : 'UTC'

  const blockedRaw = Array.isArray(b.blockedDates) ? b.blockedDates : []
  if (blockedRaw.length > MAX_BLOCKED_DATES) {
    return { ok: false, error: `That's more than ${MAX_BLOCKED_DATES} days away — check the dates.` }
  }
  const blockedDates = [...new Set(blockedRaw.filter(validIso))].sort()

  // A subject's own paper date. Only for subjects on the plan, only real
  // future dates; anything else means "same as the plan's date".
  const subjectExamDates: Record<string, string> = {}
  if (b.subjectExamDates && typeof b.subjectExamDates === 'object') {
    for (const [code, value] of Object.entries(b.subjectExamDates as Record<string, unknown>)) {
      if (subjectCodes.includes(code) && validIso(value) && planLength(startDate, value) > 0) {
        subjectExamDates[code] = value
      }
    }
  }

  return {
    ok: true,
    value: {
      startDate,
      examDate: b.examDate,
      subjectCodes,
      timeZone,
      blockedDates,
      subjectExamDates,
      remindMe: typeof b.remindMe === 'boolean' ? b.remindMe : undefined,
    },
  }
}

function minutesIn(v: unknown, lo: number, hi: number): number | null {
  const n = Number(v)
  if (!Number.isFinite(n) || n < lo || n > hi) return null
  return Math.round(n)
}

/** A list of clock windows. Windows may not cross midnight; spans (no-study, quiet hours, commitments) may. */
function parseWindows(v: unknown, opts: { allowCross: boolean; max: number }): TimeWindow[] | string {
  if (!Array.isArray(v)) return 'Expected a list of times.'
  if (v.length > opts.max) return `At most ${opts.max} windows.`
  const out: TimeWindow[] = []
  for (const w of v) {
    const win = w as { start?: unknown; end?: unknown }
    if (!win || !isClockTime(win.start) || !isClockTime(win.end)) return 'Times should look like 16:30.'
    if (!opts.allowCross && minuteOfDay(win.end) <= minuteOfDay(win.start)) return 'Windows must end after they start'
    if (win.start === win.end) return 'Windows must end after they start'
    out.push({ start: win.start, end: win.end })
  }
  return out
}

function parseAvailability(v: unknown): { ok: true; value: RoadmapAvailability } | { ok: false; error: string } {
  if (!v || typeof v !== 'object') return { ok: false, error: 'Tell us when you can study.' }
  const a = v as Record<string, unknown>
  const weekdayMinutes = minutesIn(a.weekdayMinutes, 0, MAX_MINUTES)
  const weekendMinutes = minutesIn(a.weekendMinutes, 0, MAX_MINUTES)
  if (weekdayMinutes === null || weekendMinutes === null) {
    return { ok: false, error: `Minutes per day should be between 0 and ${MAX_MINUTES}.` }
  }
  if (Math.max(weekdayMinutes, weekendMinutes) < MIN_MINUTES) {
    return { ok: false, error: `At least ${MIN_MINUTES} minutes on some day, or there is nothing to plan.` }
  }
  const windowsRaw = (a.windows ?? {}) as Record<string, unknown>
  const weekday = parseWindows(windowsRaw.weekday ?? [], { allowCross: false, max: MAX_WINDOWS })
  if (typeof weekday === 'string') return { ok: false, error: weekday }
  const weekend = parseWindows(windowsRaw.weekend ?? [], { allowCross: false, max: MAX_WINDOWS })
  if (typeof weekend === 'string') return { ok: false, error: weekend }

  const sessionLength = Number(a.sessionLength)
  if (!SESSION_LENGTHS.includes(sessionLength as SessionLength)) return { ok: false, error: 'Pick a session length.' }
  const breakRhythm = a.breakRhythm
  if (breakRhythm !== 'short' && breakRhythm !== 'standard' && breakRhythm !== 'generous') {
    return { ok: false, error: 'Pick a break rhythm.' }
  }

  const commitmentsRaw = Array.isArray(a.commitments) ? a.commitments : []
  if (commitmentsRaw.length > MAX_COMMITMENTS) return { ok: false, error: `At most ${MAX_COMMITMENTS} commitments.` }
  const commitments: Commitment[] = []
  for (const c of commitmentsRaw as Array<Record<string, unknown>>) {
    if (!c || typeof c !== 'object') return { ok: false, error: 'A commitment needs a label and times.' }
    const kind = typeof c.kind === 'string' && c.kind in COMMITMENT_KIND_LABEL ? (c.kind as Commitment['kind']) : 'other'
    const label = typeof c.label === 'string' && c.label.trim() ? c.label.trim().slice(0, MAX_LABEL) : COMMITMENT_KIND_LABEL[kind]
    if (!isClockTime(c.start) || !isClockTime(c.end) || c.start === c.end) return { ok: false, error: 'Commitment times should look like 16:30.' }
    const daysRaw = Array.isArray(c.days) ? c.days : []
    const days = [...new Set(daysRaw.map(Number).filter((d) => Number.isInteger(d) && d >= 0 && d <= 6))] as Weekday[]
    if (days.length === 0) return { ok: false, error: `Pick at least one day for ${label}.` }
    const id = typeof c.id === 'string' && c.id.trim() ? c.id.trim().slice(0, 40) : `c${commitments.length + 1}`
    commitments.push({ id, label, kind, days: days.sort(), start: c.start, end: c.end })
  }

  const noStudy = parseWindows(a.noStudy ?? [], { allowCross: true, max: MAX_WINDOWS })
  if (typeof noStudy === 'string') return { ok: false, error: noStudy }
  const quiet = parseWindows(a.quietHours ? [a.quietHours] : [], { allowCross: true, max: 1 })
  if (typeof quiet === 'string') return { ok: false, error: quiet }
  const quietHours = quiet[0] ?? { start: '22:00', end: '07:00' }
  const reminderTime = isClockTime(a.reminderTime) ? a.reminderTime : '08:00'

  return {
    ok: true,
    value: {
      weekdayMinutes,
      weekendMinutes,
      windows: { weekday, weekend },
      sessionLength: sessionLength as SessionLength,
      breakRhythm,
      commitments,
      noStudy,
      quietHours,
      reminderTime,
    },
  }
}

function parseBuildBody(body: unknown): Parsed {
  if (!body || typeof body !== 'object') return { ok: false, error: 'Invalid body.' }
  const b = body as Record<string, unknown>
  const common = parseCommon(b)
  if (!common.ok) return common
  const { subjectCodes } = common.value

  const modeRaw = b.mode ?? b.preparedness
  if (typeof modeRaw !== 'string' || !(isRoadmapMode(modeRaw) || modeRaw === 'pass' || modeRaw === 'secure' || modeRaw === 'stretch')) {
    return { ok: false, error: 'Tell us how prepared you feel.' }
  }
  const mode = modeFromStored(modeRaw)

  // Legacy body: the seven-weekday form. Kept so the first plans' builder
  // and any older client still build.
  if (b.availabilityDetail === undefined || b.availabilityDetail === null) {
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
    return {
      ok: true,
      kind: 'legacy',
      value: {
        ...common.value,
        preparedness: modeRaw === 'pass' || modeRaw === 'secure' || modeRaw === 'stretch' ? modeRaw : 'secure',
        minutesPerDay: Math.round(minutesPerDay),
        availability: availability.map((m) => Math.round(Number(m))) as WeekAvailability,
      },
    }
  }

  // v3: availabilityDetail is the only capacity input; anything else sent
  // about minutes is ignored.
  const availability = parseAvailability(b.availabilityDetail)
  if (!availability.ok) return availability

  const subjectExamTimes: Record<string, string> = {}
  if (b.subjectExamTimes && typeof b.subjectExamTimes === 'object') {
    for (const [code, value] of Object.entries(b.subjectExamTimes as Record<string, unknown>)) {
      if (!subjectCodes.includes(code)) continue
      if (!isClockTime(value)) return { ok: false, error: 'Exam times should look like 09:00.' }
      subjectExamTimes[code] = value
    }
  }
  const subjectComponents: Record<string, string> = {}
  if (b.subjectComponents && typeof b.subjectComponents === 'object') {
    for (const [code, value] of Object.entries(b.subjectComponents as Record<string, unknown>)) {
      if (!subjectCodes.includes(code) || typeof value !== 'string' || !value.trim()) continue
      subjectComponents[code] = value.trim().slice(0, MAX_COMPONENT)
    }
  }
  const selfRatings: Record<string, SelfRating> = {}
  if (b.selfRatings && typeof b.selfRatings === 'object') {
    for (const [code, value] of Object.entries(b.selfRatings as Record<string, unknown>)) {
      if (!subjectCodes.includes(code)) continue
      if (!SELF_RATINGS.includes(value as SelfRating)) return { ok: false, error: 'Pick where you stand in each subject.' }
      selfRatings[code] = value as SelfRating
    }
  }
  const targetGrade = typeof b.targetGrade === 'string' && b.targetGrade.trim() ? b.targetGrade.trim().slice(0, MAX_TARGET_GRADE) : null
  const prioritySubject = typeof b.prioritySubject === 'string' && subjectCodes.includes(b.prioritySubject) ? b.prioritySubject : null

  // Day 1 from now. The server's clock in the student's zone, never the
  // client's minute, so a wrong device clock cannot lay tasks in the past.
  const { startDate, timeZone } = common.value
  const startMinute = startDate === todayInZone(timeZone) ? minuteOfDayInZone(timeZone) : undefined

  // Every paper per subject, when the client lists them. Only subjects on
  // the plan, only future dates, no paper listed twice, at most
  // MAX_PAPERS_PER_SUBJECT each. The three per-subject maps are then
  // derived from the list — the subject's date is its last paper, its
  // component and time the nearest paper's — and the plan runs to the last
  // paper of all, whatever the body's examDate said.
  const exams: NonNullable<RoadmapBuildRequest['exams']> = []
  if (Array.isArray(b.exams)) {
    if (b.exams.length > MAX_SUBJECTS * MAX_PAPERS_PER_SUBJECT) return { ok: false, error: 'That is more papers than a plan can hold.' }
    const seen = new Set<string>()
    const perSubject = new Map<string, number>()
    for (const raw of b.exams as unknown[]) {
      if (!raw || typeof raw !== 'object') return { ok: false, error: 'Each paper needs a subject and a date.' }
      const e = raw as Record<string, unknown>
      const subjectCode = typeof e.subjectCode === 'string' ? e.subjectCode.trim() : ''
      if (!subjectCodes.includes(subjectCode)) continue
      if (!validIso(e.examDate) || planLength(startDate, e.examDate) <= 0) return { ok: false, error: 'Every paper date needs to be after today.' }
      if (e.examTime !== undefined && e.examTime !== '' && !isClockTime(e.examTime)) return { ok: false, error: 'Exam times should look like 09:00.' }
      const component = typeof e.component === 'string' && e.component.trim() ? e.component.trim().slice(0, MAX_COMPONENT) : undefined
      const key = `${subjectCode}|${component ?? ''}|${e.examDate}`
      if (seen.has(key)) continue
      seen.add(key)
      const n = (perSubject.get(subjectCode) ?? 0) + 1
      if (n > MAX_PAPERS_PER_SUBJECT) return { ok: false, error: `At most ${MAX_PAPERS_PER_SUBJECT} papers per subject.` }
      perSubject.set(subjectCode, n)
      exams.push({ subjectCode, ...(component ? { component } : {}), examDate: e.examDate, ...(isClockTime(e.examTime) ? { examTime: e.examTime } : {}) })
    }
  }
  const subjectExamDates = { ...common.value.subjectExamDates }
  let examDate = common.value.examDate
  if (exams.length > 0) {
    exams.sort((x, y) => (x.examDate < y.examDate ? -1 : x.examDate > y.examDate ? 1 : 0))
    for (const code of subjectCodes) {
      const own = exams.filter((e) => e.subjectCode === code)
      if (own.length === 0) continue
      const first = own[0]!
      const last = own[own.length - 1]!
      subjectExamDates[code] = last.examDate
      if (first.examTime) subjectExamTimes[code] = first.examTime
      else delete subjectExamTimes[code]
      if (first.component) subjectComponents[code] = first.component
      else delete subjectComponents[code]
      if (last.examDate > examDate) examDate = last.examDate
    }
  }

  return {
    ok: true,
    kind: 'roadmap',
    value: {
      startDate,
      ...(startMinute !== undefined ? { startMinute } : {}),
      examDate,
      mode,
      subjects: subjectCodes,
      subjectExamDates,
      subjectExamTimes,
      subjectComponents,
      ...(exams.length > 0 ? { exams } : {}),
      selfRatings,
      availabilityDetail: availability.value,
      timeZone: common.value.timeZone,
      blockedDates: common.value.blockedDates,
      targetGrade,
      prioritySubject,
      remindMe: common.value.remindMe,
      preview: b.preview === true,
    },
  }
}

// --- preview rate limit ------------------------------------------------------------

const previewHits = new Map<string, number[]>()

function previewAllowed(userId: string, now = Date.now()): boolean {
  const windowStart = now - 60_000
  const hits = (previewHits.get(userId) ?? []).filter((t) => t > windowStart)
  if (hits.length >= PREVIEW_PER_MINUTE) {
    previewHits.set(userId, hits)
    return false
  }
  hits.push(now)
  previewHits.set(userId, hits)
  // Forget everyone else's stale buckets now and then.
  if (previewHits.size > 500) {
    for (const [k, v] of previewHits) if (!v.some((t) => t > windowStart)) previewHits.delete(k)
  }
  return true
}

// --- handlers -----------------------------------------------------------------------

export async function GET(request: NextRequest) {
  const { user, pendingCookies } = await authenticateRouteRequest(request)
  if (!user) return jsonWithAuthCookies({ error: 'Not signed in' }, pendingCookies, { status: 401 })

  const admin = createServiceClient()
  const rolled = await loadRoadmapRolled(admin, user.id)
  if (!rolled) return jsonWithAuthCookies({ plan: null, done: {}, taskState: {}, revision: 0, evidence: [], canUndo: false }, pendingCookies)
  const { loaded, ctx } = rolled

  // Opened from a check-in email or push (or soon after one went out): the backoff counter starts again.
  const explicit = request.nextUrl.searchParams.get('src') === 'checkin'
  if (await markCheckinOpened(admin, user.id, loaded, { explicit, now: ctx.now })) {
    await recordRoadmapEvent(admin, user.id, { eventType: 'reminder_clicked', planGeneratedAt: loaded.generatedAt, revision: loaded.revision })
  }

  return jsonWithAuthCookies(
    { plan: loaded.plan, done: loaded.done, taskState: loaded.taskState, revision: loaded.revision, evidence: [...ctx.evidence], canUndo: loaded.undo !== null },
    pendingCookies
  )
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
    if (parsed.kind === 'roadmap' && parsed.value.preview) {
      if (!previewAllowed(user.id)) {
        return jsonWithAuthCookies({ error: 'Too many previews. Give it a moment.' }, pendingCookies, { status: 429 })
      }
      const preview = await previewRoadmap(admin, user.id, parsed.value)
      return jsonWithAuthCookies({ plan: preview.plan, feasibility: preview.feasibility, preview: true }, pendingCookies)
    }

    const saved =
      parsed.kind === 'roadmap'
        ? await buildAndSaveRoadmap(admin, user.id, parsed.value)
        : { ...(await buildAndSaveStudyPlan(admin, user.id, parsed.value)), taskState: {}, revision: 1, feasibility: null }

    // The plan's exam date is the profile's exam date — the countdown, the
    // reminders and the plan should never disagree. The morning check-in
    // rides on the existing exam-reminder consent, set here only when the
    // student ticked the box.
    const profilePatch: Record<string, unknown> = { exam_date: saved.plan.examDate }
    if (typeof parsed.value.remindMe === 'boolean') {
      profilePatch.email_exam_reminders = parsed.value.remindMe
    }
    await admin.from('user_profiles').update(profilePatch).eq('id', user.id)

    if (parsed.kind === 'roadmap') {
      await recordRoadmapEvent(admin, user.id, {
        eventType: 'roadmap_generated',
        planGeneratedAt: saved.plan.generatedAt,
        revision: 1,
        meta: { mode: parsed.value.mode, feasibility: saved.feasibility?.state ?? null, subjects: parsed.value.subjects.length },
      })
    }

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
