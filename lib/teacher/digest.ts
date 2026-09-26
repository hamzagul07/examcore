import 'server-only'

import type { SupabaseClient } from '@supabase/supabase-js'
import { unsubscribeUrl } from '@/lib/community/email-unsubscribe'
import { buildTeacherDigestEmail } from '@/lib/email/teacher-digest'
import { sendEmail } from '@/lib/email/send'
import { createServiceClient } from '@/lib/supabase/service'
import { summariseProgress } from '@/lib/teacher/assignment-status'
import { buildCohortGapReport, headlineGapText } from '@/lib/teacher/cohort-gaps'
import { loadEmailRecipients, loadProfileNames } from '@/lib/teacher/email/recipients'
import { subjectCodeLabel } from '@/lib/teacher/list-classrooms'
import type { ClassroomSettings } from '@/lib/teacher/types'
import {
  completedAt,
  currentIsoWeek,
  DAY_MS,
  pickLastCompletedSet,
  setsLiveInWindow,
  setStudentStates,
  SILENT_AFTER_DAYS,
  silentStudents,
  weekReference,
  type IsoWeek,
} from '@/lib/teacher/week'
import {
  scopeClassroomAttempts,
  type ClassroomAttempt,
  type ClassroomMember,
} from '@/lib/teacher-analytics'
import {
  chunk,
  fetchAllFiltered,
  getMembersForClassrooms,
  hydrateSets,
  loadAttemptRows,
  loadAttemptsByIds,
  loadPublishedSets,
  type ClassSet,
} from '@/lib/teacher-classroom-data'

/**
 * The Sunday teacher digest (docs/TEACHER_SYSTEM_SPEC.md §5): one email per
 * teacher, per class what came in this week, who is late, the class mean,
 * where the marks went, what is waiting for review and who has gone quiet.
 *
 * Cron: /api/cron/teacher-digest, Sunday 16:00 UTC — an hour before the
 * students' weekly report, so a teacher reads about the week before their
 * students are nudged about it. Ships as a dry run: without
 * TEACHER_DIGEST_SEND=true it builds every digest, logs a one-line summary
 * per teacher and sends and stamps nothing.
 *
 * Definitions match the class week page (lib/teacher/week.ts) because they
 * are built from the same helpers: the week is the ISO week in UTC, a set is
 * in it if it was live at any point in it, "late" and "handed in" come from
 * lib/teacher/assignment-status, "gone quiet" is SILENT_AFTER_DAYS without
 * marked work in the class's subject, names are displayName() ("Amira K.").
 * Two deliberate differences for an email:
 *
 *   - The headline gap is only reported when its set completed THIS week; a
 *     gap from a set that closed a month ago is not news.
 *   - Unreviewed and hand-in counts are for current members only (as the
 *     teacher's own RLS reads would see them), not for students who left.
 *
 * Guard: `user_profiles.teacher_digest_last_sent_at` (service-role only). A
 * teacher is due when it is empty or older than DIGEST_MIN_INTERVAL_MS, and
 * the stamp is claimed with a conditional update BEFORE the send, so two
 * overlapping runs cannot both mail the same teacher; a send that fails puts
 * the previous value back so the next run tries again.
 */

export const DIGEST_MIN_INTERVAL_MS = 6 * DAY_MS
/** Sets listed per class; the rest are summarised as "+N more". */
export const DIGEST_MAX_SETS_PER_CLASS = 5
/** Quiet students named per class; the rest are counted. */
export const DIGEST_MAX_SILENT_NAMES = 3
/** Stop starting new teachers after this long, well inside the 300 s function limit. */
export const DIGEST_TIME_BUDGET_MS = 240_000

// ---------------------------------------------------------------------------
// Model
// ---------------------------------------------------------------------------

export type DigestSet = {
  id: string
  title: string
  due_at: string | null
  /** Students who handed in every item. */
  handed_in: number
  /** handed_in + those still missing work (excused and departed students owe nothing). */
  expected: number
  /** Students with at least one late hand-in. */
  late: number
  mean_pct: number | null
}

export type DigestClass = {
  id: string
  name: string
  subject_label: string
  /** Active members. */
  members: number
  /** The week's sets, soonest deadline first, at most DIGEST_MAX_SETS_PER_CLASS. */
  sets: DigestSet[]
  /** How many of the week's sets are not listed. */
  more_sets: number
  handed_in: number
  expected: number
  late: number
  /** Mean of the students' percentages over every set of the week, or null with none marked. */
  mean_pct: number | null
  headline_gap: string | null
  /** Hand-ins with an attempt that no teacher has confirmed or re-marked. */
  unreviewed: number
  /** Hand-ins first received this week. */
  new_hand_ins: number
  /** displayName()s of quiet students, quietest first, at most DIGEST_MAX_SILENT_NAMES. */
  silent: string[]
  silent_count: number
}

export type TeacherDigest = {
  week_key: string
  week_label: string
  classes: DigestClass[]
  totals: {
    unreviewed: number
    late: number
    silent: number
    handed_in: number
    expected: number
  }
}

function toMs(iso: string | null | undefined): number | null {
  if (!iso) return null
  const ms = Date.parse(iso)
  return Number.isFinite(ms) ? ms : null
}

/** Whether a teacher is due a digest: never sent, unreadable, or sent at least DIGEST_MIN_INTERVAL_MS ago. */
export function digestDue(lastSentAt: string | null | undefined, now: Date): boolean {
  const last = toMs(lastSentAt)
  if (last === null) return true
  return now.getTime() - last >= DIGEST_MIN_INTERVAL_MS
}

/** The instant a stamp must be older than for a new digest to be claimed (see digestDue). */
export function digestClaimCutoff(now: Date): string {
  return new Date(now.getTime() - DIGEST_MIN_INTERVAL_MS).toISOString()
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

/** "21–27 Sep 2026", "28 Sep – 4 Oct 2026", "29 Dec 2025 – 4 Jan 2026" (Monday to Sunday, UTC). */
export function digestWeekLabel(week: IsoWeek): string {
  const start = week.start
  const end = new Date(week.end.getTime() - DAY_MS)
  const sd = start.getUTCDate()
  const ed = end.getUTCDate()
  const sm = MONTHS[start.getUTCMonth()]
  const em = MONTHS[end.getUTCMonth()]
  const sy = start.getUTCFullYear()
  const ey = end.getUTCFullYear()
  if (sy !== ey) return `${sd} ${sm} ${sy} – ${ed} ${em} ${ey}`
  if (sm !== em) return `${sd} ${sm} – ${ed} ${em} ${ey}`
  return `${sd}–${ed} ${sm} ${ey}`
}

function roundPct(value: number): number {
  return Math.round(value * 10) / 10
}

/** One set's line in the digest, from the same progress rules as the completion matrix. */
export function summariseDigestSet(
  set: ClassSet,
  members: readonly ClassroomMember[],
  names: ReadonlyMap<string, string | null>
): { line: DigestSet; pcts: number[] } {
  const states = setStudentStates(set, members, names)
  const progress = summariseProgress(states, set.items)
  const pcts = states
    .map((s) => s.overall_pct)
    .filter((p): p is number => p !== null && Number.isFinite(p))
  return {
    line: {
      id: set.id,
      title: set.title,
      due_at: set.due_at,
      handed_in: progress.handed_in,
      expected: progress.handed_in + progress.missing,
      late: progress.late,
      mean_pct: progress.class_mean_pct,
    },
    pcts,
  }
}

export type DigestClassInput = {
  id: string
  name: string
  subjectCode: string | null
  /** Every membership row of the class, any status. */
  members: readonly ClassroomMember[]
  /** Hydrated sets of the class: at least the week's live sets and its last completed set. */
  sets: readonly ClassSet[]
  /** student id → full name. */
  names: ReadonlyMap<string, string | null>
  /** Recent attempts of the class's active members (unscoped; scoped here). */
  recentAttempts: readonly ClassroomAttempt[]
  /** Hand-ins of the last completed set, with per-mark detail (unscoped; scoped here). */
  gapAttempts: readonly ClassroomAttempt[]
  unreviewed: number
  newHandIns: number
  week: IsoWeek
  now: Date
}

function byDueThenTitle(a: DigestSet, b: DigestSet): number {
  return (
    (toMs(a.due_at) ?? Infinity) - (toMs(b.due_at) ?? Infinity) ||
    a.title.localeCompare(b.title) ||
    a.id.localeCompare(b.id)
  )
}

export function buildDigestClass(input: DigestClassInput): DigestClass {
  const { week, now, members, names } = input
  const ref = weekReference(week, now)
  const refIso = new Date(ref).toISOString()

  const live = setsLiveInWindow(input.sets, week.start.getTime(), week.end.getTime())
  const summaries = live.map((s) => summariseDigestSet(s, members, names))
  const lines = summaries.map((s) => s.line).sort(byDueThenTitle)
  const pcts = summaries.flatMap((s) => s.pcts)

  const recent = scopeClassroomAttempts(input.recentAttempts, members, {
    subjectCode: input.subjectCode,
    until: refIso,
  })
  const silent = silentStudents(members, recent, names, ref)

  // Only news: the last completed set's gap, if that set completed this week.
  const last = pickLastCompletedSet(input.sets, ref)
  const lastAt = last ? completedAt(last) : null
  const gapThisWeek = last !== null && lastAt !== null && lastAt >= week.start.getTime()
  const gapAttempts = gapThisWeek
    ? scopeClassroomAttempts(input.gapAttempts, members, { subjectCode: null })
    : []
  const headline = gapThisWeek ? headlineGapText(buildCohortGapReport([...gapAttempts])) : null

  const sum = (pick: (l: DigestSet) => number) => lines.reduce((n, l) => n + pick(l), 0)

  return {
    id: input.id,
    name: input.name,
    subject_label: subjectCodeLabel(input.subjectCode),
    members: members.filter((m) => m.status === 'active').length,
    sets: lines.slice(0, DIGEST_MAX_SETS_PER_CLASS),
    more_sets: Math.max(0, lines.length - DIGEST_MAX_SETS_PER_CLASS),
    handed_in: sum((l) => l.handed_in),
    expected: sum((l) => l.expected),
    late: sum((l) => l.late),
    mean_pct: pcts.length > 0 ? roundPct(pcts.reduce((a, b) => a + b, 0) / pcts.length) : null,
    headline_gap: headline,
    unreviewed: Math.max(0, Math.floor(input.unreviewed)),
    new_hand_ins: Math.max(0, Math.floor(input.newHandIns)),
    silent: silent.slice(0, DIGEST_MAX_SILENT_NAMES).map((s) => s.display_name),
    silent_count: silent.length,
  }
}

/** A class earns a place in the digest when it has students and something to say about them. */
export function classHasNews(c: DigestClass): boolean {
  if (c.members === 0) return false
  return (
    c.sets.length > 0 ||
    c.unreviewed > 0 ||
    c.silent_count > 0 ||
    c.new_hand_ins > 0 ||
    c.headline_gap !== null
  )
}

/**
 * The teacher's digest, or null when no class has anything to report — an
 * empty digest is the kind of email that teaches people to ignore the next.
 * Classes needing the teacher most come first.
 */
export function buildTeacherDigest(classes: readonly DigestClass[], week: IsoWeek): TeacherDigest | null {
  const kept = classes.filter(classHasNews)
  if (kept.length === 0) return null
  const urgency = (c: DigestClass) => c.unreviewed + c.late + c.silent_count
  const sorted = [...kept].sort(
    (a, b) => urgency(b) - urgency(a) || a.name.localeCompare(b.name) || a.id.localeCompare(b.id)
  )
  const total = (pick: (c: DigestClass) => number) => sorted.reduce((n, c) => n + pick(c), 0)
  return {
    week_key: week.key,
    week_label: digestWeekLabel(week),
    classes: sorted,
    totals: {
      unreviewed: total((c) => c.unreviewed),
      late: total((c) => c.late),
      silent: total((c) => c.silent_count),
      handed_in: total((c) => c.handed_in),
      expected: total((c) => c.expected),
    },
  }
}

// ---------------------------------------------------------------------------
// Loading (service role: the cron acts for teachers who are not signed in)
// ---------------------------------------------------------------------------

type DigestClassroomRow = {
  id: string
  name: string
  subject_code: string | null
  settings: ClassroomSettings | null
}

/**
 * Hand-ins on `setIds` by `studentIds`, counted with the service client but
 * restricted to the given (current) students — the number the teacher's own
 * RLS reads would give.
 */
async function countMemberSubmissions(
  admin: SupabaseClient,
  setIds: readonly string[],
  studentIds: readonly string[],
  filter: { unreviewed?: boolean; firstFrom?: string; firstTo?: string }
): Promise<number> {
  if (setIds.length === 0 || studentIds.length === 0) return 0
  let total = 0
  for (const sets of chunk(setIds)) {
    for (const students of chunk(studentIds)) {
      let q = admin
        .from('assignment_submissions')
        .select('id', { count: 'exact', head: true })
        .in('assignment_id', sets)
        .in('student_id', students)
      if (filter.unreviewed) q = q.neq('status', 'reviewed').not('attempt_id', 'is', null)
      if (filter.firstFrom) q = q.gte('first_submitted_at', filter.firstFrom)
      if (filter.firstTo) q = q.lt('first_submitted_at', filter.firstTo)
      const { count, error } = await q
      if (error) throw new Error(`assignment_submissions: ${error.message}`)
      total += count ?? 0
    }
  }
  return total
}

/**
 * Match plain /mark attempts to the week's sets before counting them (spec §5:
 * "runs reconciliation first"). Best effort per set: a set that fails to
 * reconcile is reported with what is already linked. Imported lazily so this
 * module (and its tests) do not load the assignment pipeline until needed.
 */
async function reconcileSets(admin: SupabaseClient, setIds: readonly string[]): Promise<void> {
  if (setIds.length === 0) return
  const { reconcileAssignment } = await import('@/lib/teacher/assignments')
  for (const id of setIds) {
    try {
      await reconcileAssignment(admin, id)
    } catch (err) {
      console.error('[teacher-digest] reconcile failed', {
        assignmentId: id,
        error: err instanceof Error ? err.message : String(err),
      })
    }
  }
}

/** One teacher's digest, or null when there is nothing to send. */
export async function loadTeacherDigest(
  admin: SupabaseClient,
  teacherId: string,
  now: Date = new Date()
): Promise<TeacherDigest | null> {
  const week = currentIsoWeek(now)
  const ref = weekReference(week, now)

  const { rows: classroomRows } = await fetchAllFiltered<DigestClassroomRow>('classrooms', (from, to) =>
    admin
      .from('classrooms')
      .select('id, name, subject_code, settings')
      .eq('teacher_id', teacherId)
      .is('archived_at', null)
      .order('id')
      .range(from, to)
  )
  // Example classes (settings.demo) hold simulated students: nothing in them
  // is news, and their "students" are not people to chase.
  const classrooms = classroomRows.filter((c) => c.settings?.demo !== true)
  if (classrooms.length === 0) return null
  const classIds = classrooms.map((c) => c.id)

  const [membersByClass, published] = await Promise.all([
    getMembersForClassrooms(admin, classIds),
    loadPublishedSets(admin, classIds),
  ])

  const live = setsLiveInWindow(published, week.start.getTime(), week.end.getTime())
  await reconcileSets(
    admin,
    live.map((s) => s.id)
  )

  const lastByClass = new Map<string, string>()
  for (const c of classrooms) {
    const last = pickLastCompletedSet(
      published.filter((s) => s.classroom_id === c.id),
      ref
    )
    const at = last ? completedAt(last) : null
    if (last && at !== null && at >= week.start.getTime()) lastByClass.set(c.id, last.id)
  }
  const wanted = new Map(live.map((s) => [s.id, s]))
  for (const id of lastByClass.values()) {
    const s = published.find((p) => p.id === id)
    if (s) wanted.set(s.id, s)
  }
  const hydrated = await hydrateSets(admin, [...wanted.values()])

  const allMembers = classIds.flatMap((id) => membersByClass.get(id) ?? [])
  const activeByClass = new Map(
    classIds.map((id) => [
      id,
      (membersByClass.get(id) ?? []).filter((m) => m.status === 'active').map((m) => m.student_id),
    ])
  )
  const allActive = [...new Set([...activeByClass.values()].flat())]

  const gapIds = new Map<string, string[]>()
  for (const [classId, setId] of lastByClass) {
    const set = hydrated.find((s) => s.id === setId)
    const active = new Set(activeByClass.get(classId) ?? [])
    gapIds.set(
      classId,
      (set?.submissions ?? [])
        .filter((s) => s.attempt_id && active.has(s.student_id))
        .map((s) => s.attempt_id as string)
    )
  }

  const [names, recent, gapAttempts] = await Promise.all([
    loadProfileNames(
      admin,
      allMembers.map((m) => m.student_id)
    ),
    // Only the silence window is needed: "no marked work in SILENT_AFTER_DAYS".
    loadAttemptRows(admin, allActive, {
      lowerBound: new Date(ref - SILENT_AFTER_DAYS * DAY_MS).toISOString(),
      upperBound: new Date(ref).toISOString(),
      withMarking: false,
    }),
    loadAttemptsByIds(admin, [...gapIds.values()].flat()),
  ])

  const classes: DigestClass[] = []
  for (const c of classrooms) {
    const members = membersByClass.get(c.id) ?? []
    const active = activeByClass.get(c.id) ?? []
    const classSetIds = published.filter((s) => s.classroom_id === c.id).map((s) => s.id)
    const activeSet = new Set(active)
    const gapSet = new Set(gapIds.get(c.id) ?? [])
    const [unreviewed, newHandIns] = await Promise.all([
      countMemberSubmissions(admin, classSetIds, active, { unreviewed: true }),
      countMemberSubmissions(admin, classSetIds, active, {
        firstFrom: week.start.toISOString(),
        firstTo: week.end.toISOString(),
      }),
    ])
    classes.push(
      buildDigestClass({
        id: c.id,
        name: c.name,
        subjectCode: c.subject_code,
        members,
        sets: hydrated.filter((s) => s.classroom_id === c.id),
        names,
        recentAttempts: recent.attempts.filter((a) => activeSet.has(a.user_id)),
        gapAttempts: gapAttempts.filter((a) => gapSet.has(a.id)),
        unreviewed,
        newHandIns,
        week,
        now,
      })
    )
  }

  return buildTeacherDigest(classes, week)
}

// ---------------------------------------------------------------------------
// The cron run
// ---------------------------------------------------------------------------

export type TeacherDigestRunResult = {
  dryRun: boolean
  /** Teachers with at least one live class. */
  candidates: number
  /** Due, opted in, and looked at. */
  considered: number
  sent: number
  /** Dry run only: digests that would have been sent. */
  wouldSend: number
  /** Opted out, not yet due, nothing to report, or no mailable address. */
  skipped: number
  failed: number
  /**
   * Not reached inside the time budget. They stay due, so they are the first
   * teachers the next run looks at; a non-zero count is the signal to add a
   * catch-up schedule.
   */
  deferred: number
}

/** Real emails only when TEACHER_DIGEST_SEND=true; anything else is a dry run. */
export function teacherDigestSendEnabled(): boolean {
  return process.env.TEACHER_DIGEST_SEND?.trim() === 'true'
}

type DigestProfile = {
  id: string
  full_name: string | null
  email_teacher_digest: boolean | null
  teacher_digest_last_sent_at: string | null
}

/** Never sent first, then the longest-waiting — so a run that runs out of time is fair. */
export function orderDigestCandidates<T extends { teacher_digest_last_sent_at: string | null }>(
  profiles: readonly T[]
): T[] {
  return [...profiles].sort(
    (a, b) =>
      (toMs(a.teacher_digest_last_sent_at) ?? -Infinity) - (toMs(b.teacher_digest_last_sent_at) ?? -Infinity)
  )
}

async function claimDigestSlot(admin: SupabaseClient, teacherId: string, now: Date): Promise<boolean> {
  const cutoff = digestClaimCutoff(now)
  const { data, error } = await admin
    .from('user_profiles')
    .update({ teacher_digest_last_sent_at: now.toISOString() })
    .eq('id', teacherId)
    .or(`teacher_digest_last_sent_at.is.null,teacher_digest_last_sent_at.lt."${cutoff}"`)
    .select('id')
  if (error) {
    console.error('[teacher-digest] claim failed', { teacherId, error: error.message })
    return false
  }
  return (data?.length ?? 0) === 1
}

async function releaseDigestSlot(
  admin: SupabaseClient,
  teacherId: string,
  claimedAt: Date,
  previous: string | null
): Promise<void> {
  const { error } = await admin
    .from('user_profiles')
    .update({ teacher_digest_last_sent_at: previous })
    .eq('id', teacherId)
    .eq('teacher_digest_last_sent_at', claimedAt.toISOString())
  if (error) console.error('[teacher-digest] release failed', { teacherId, error: error.message })
}

/** Teachers whose digests are built at once; each is several sequential queries. */
const DIGEST_CONCURRENCY = 4

type TeacherOutcome = 'sent' | 'would_send' | 'skipped' | 'failed'

async function digestOneTeacher(
  admin: SupabaseClient,
  profile: DigestProfile,
  now: Date,
  send: boolean
): Promise<TeacherOutcome> {
  try {
    const digest = await loadTeacherDigest(admin, profile.id, now)
    if (!digest) return 'skipped'

    const [recipient] = await loadEmailRecipients(admin, [profile.id], 'email_teacher_digest')
    if (!recipient) return 'skipped'

    if (!send) {
      console.log('[teacher-digest] dry-run — would send', {
        teacherId: profile.id,
        week: digest.week_key,
        classes: digest.classes.length,
        ...digest.totals,
      })
      return 'would_send'
    }

    if (!(await claimDigestSlot(admin, profile.id, now))) {
      // Another run got there first (or the stamp moved since it was read).
      return 'skipped'
    }

    const unsubscribeHref = unsubscribeUrl(profile.id, 'teacher_digest')
    const email = buildTeacherDigestEmail({
      recipientName: recipient.fullName,
      digest,
      unsubscribeHref,
    })
    const ok = await sendEmail({
      to: recipient.email,
      subject: email.subject,
      preheader: email.preheader,
      text: email.text,
      html: email.html,
      unsubscribeHref,
    })
    if (ok) return 'sent'
    await releaseDigestSlot(admin, profile.id, now, profile.teacher_digest_last_sent_at)
    return 'failed'
  } catch (err) {
    console.error('[teacher-digest] teacher failed', {
      teacherId: profile.id,
      error: err instanceof Error ? err.message : String(err),
    })
    return 'failed'
  }
}

export async function runTeacherDigest(
  opts: { now?: Date; send?: boolean; budgetMs?: number } = {}
): Promise<TeacherDigestRunResult> {
  const admin = createServiceClient()
  const now = opts.now ?? new Date()
  const send = opts.send ?? teacherDigestSendEnabled()
  const budget = opts.budgetMs ?? DIGEST_TIME_BUDGET_MS
  const started = Date.now()
  const result: TeacherDigestRunResult = {
    dryRun: !send,
    candidates: 0,
    considered: 0,
    sent: 0,
    wouldSend: 0,
    skipped: 0,
    failed: 0,
    deferred: 0,
  }

  const { rows: owners } = await fetchAllFiltered<{ teacher_id: string }>('classrooms', (from, to) =>
    admin.from('classrooms').select('teacher_id').is('archived_at', null).order('id').range(from, to)
  )
  const teacherIds = [...new Set(owners.map((o) => o.teacher_id).filter(Boolean))]
  result.candidates = teacherIds.length

  const profiles: DigestProfile[] = []
  for (const part of chunk(teacherIds)) {
    const { rows } = await fetchAllFiltered<DigestProfile>('user_profiles', (from, to) =>
      admin
        .from('user_profiles')
        .select('id, full_name, email_teacher_digest, teacher_digest_last_sent_at')
        .in('id', part)
        .order('id')
        .range(from, to)
    )
    profiles.push(...rows)
  }
  result.skipped += teacherIds.length - profiles.length

  const due: DigestProfile[] = []
  for (const profile of orderDigestCandidates(profiles)) {
    if (profile.email_teacher_digest === false || !digestDue(profile.teacher_digest_last_sent_at, now)) {
      result.skipped += 1
    } else {
      due.push(profile)
    }
  }

  // A small pool, and no new teacher is started once the budget is spent:
  // everything already started finishes inside the function's 300 s.
  let next = 0
  const lane = async () => {
    while (next < due.length) {
      const profile = due[next++]
      if (Date.now() - started > budget) {
        result.deferred += 1
        continue
      }
      result.considered += 1
      const outcome = await digestOneTeacher(admin, profile, now, send)
      if (outcome === 'sent') result.sent += 1
      else if (outcome === 'would_send') result.wouldSend += 1
      else if (outcome === 'failed') result.failed += 1
      else result.skipped += 1
    }
  }
  await Promise.all(Array.from({ length: Math.min(DIGEST_CONCURRENCY, Math.max(1, due.length)) }, lane))

  if (result.deferred > 0) {
    console.warn(`[teacher-digest] time budget reached; ${result.deferred} teacher(s) deferred`)
  }
  return result
}
