/**
 * The class week (docs/TEACHER_SYSTEM_SPEC.md §4 "Class week"; `T/week`).
 *
 * One view answers "what happened in this class this week, and who needs me":
 * the sets that were live, how many hand-ins arrived, students gone quiet,
 * students who did badly on the last set, students on the way up, the one
 * thing the class keeps losing marks on, and the review backlog.
 *
 * Rules (each a named, tested helper below):
 *
 *   - Weeks are ISO weeks in UTC ("2026-W39", Monday 00:00 to Monday 00:00),
 *     the same clock the crons run on.
 *   - Everything is judged at the week's reference instant: now for the
 *     current week, the end of the week for a past one. A student is silent
 *     after SILENT_AFTER_DAYS without marked work (counted from the day they
 *     joined when they have none); improving compares the last
 *     IMPROVING_RECENT_DAYS with the IMPROVING_BASELINE_DAYS before, needing
 *     MIN_ATTEMPTS_FOR_CONFIDENT_MASTERY marked attempts on each side and a
 *     rise of IMPROVING_MIN_POINTS.
 *   - "Struggling" and the headline gap both read the LAST COMPLETED set: the
 *     most recent set whose deadline has passed or that has closed. That is
 *     the spec's "last closed set" moved forward to the deadline, so the
 *     reteach prompt arrives when the marks are in rather than a week later
 *     when the set auto-closes. Struggling is below levelFor's critical line.
 *   - A set's roster is its targeted students (all members for target
 *     'all'): active members, plus anyone who handed in or who left after the
 *     set was published — they show as LEFT rather than vanishing.
 *   - Names are displayName() ("Amira K."): this view feeds the digest email
 *     and the Omni context, where full names may not go.
 *   - An archived class shows retained hand-ins only: sets and "struggling"
 *     come from assignment_submissions; nothing is derived from live attempts.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import { MIN_ATTEMPTS_FOR_CONFIDENT_MASTERY } from '@/lib/mastery'
import {
  assignmentStatus,
  deriveStudentState,
  effectiveCloseAt,
  summariseProgress,
} from '@/lib/teacher/assignment-status'
import { levelFor } from '@/lib/teacher/blindspots'
import { usableMarks } from '@/lib/teacher/class-mastery'
import { buildCohortGapReport, headlineGapText, type GapAttempt } from '@/lib/teacher/cohort-gaps'
import { displayName } from '@/lib/teacher/display-name'
import type {
  AssignmentSummary,
  ClassWeek,
  StudentAssignmentState,
} from '@/lib/teacher/types'
import {
  scopeClassroomAttempts,
  type ClassroomAttempt,
  type ClassroomMember,
} from '@/lib/teacher-analytics'
import {
  countSubmissions,
  getClassroomMembers,
  getClassroomScope,
  getRosterProfiles,
  hydrateSets,
  loadAttemptRows,
  loadAttemptsByIds,
  loadPublishedSets,
  type ClassSet,
  type SetRow,
} from '@/lib/teacher-classroom-data'

export const DAY_MS = 86_400_000
const WEEK_MS = 7 * DAY_MS

export const SILENT_AFTER_DAYS = 14
export const IMPROVING_RECENT_DAYS = 14
export const IMPROVING_BASELINE_DAYS = 28
export const IMPROVING_MIN_POINTS = 10

// ---------------------------------------------------------------------------
// ISO weeks (UTC)
// ---------------------------------------------------------------------------

export type IsoWeek = { key: string; start: Date; end: Date }

const ISO_WEEK = /^(\d{4})-W(\d{2})$/

function mondayOfWeekOne(year: number): number {
  const jan4 = Date.UTC(year, 0, 4)
  const offset = (new Date(jan4).getUTCDay() + 6) % 7 // Monday = 0
  return jan4 - offset * DAY_MS
}

/** "2026-W39" for the ISO week containing `date` (UTC). */
export function isoWeekKey(date: Date): string {
  const day = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
  const weekday = (new Date(day).getUTCDay() + 6) % 7
  // The ISO year is the year of the week's Thursday.
  const thursday = day + (3 - weekday) * DAY_MS
  const year = new Date(thursday).getUTCFullYear()
  const week = 1 + Math.floor((thursday - mondayOfWeekOne(year)) / WEEK_MS)
  return `${year}-W${String(week).padStart(2, '0')}`
}

/** 52 or 53. */
export function isoWeeksInYear(year: number): number {
  // 28 December is always in the year's last ISO week.
  return Number(isoWeekKey(new Date(Date.UTC(year, 11, 28))).slice(6))
}

/** Parse "YYYY-Www"; null for anything else, including week 53 of a 52-week year. */
export function parseIsoWeek(value: string | null | undefined): IsoWeek | null {
  if (typeof value !== 'string') return null
  const m = ISO_WEEK.exec(value.trim())
  if (!m) return null
  const year = Number(m[1])
  const week = Number(m[2])
  if (year < 1970 || week < 1 || week > isoWeeksInYear(year)) return null
  const start = mondayOfWeekOne(year) + (week - 1) * WEEK_MS
  return { key: `${m[1]}-W${m[2]}`, start: new Date(start), end: new Date(start + WEEK_MS) }
}

export function currentIsoWeek(now: Date = new Date()): IsoWeek {
  return parseIsoWeek(isoWeekKey(now)) as IsoWeek
}

/** The week `delta` weeks away ("previous" / "next" links). */
export function shiftIsoWeek(value: string, delta: number): string | null {
  const week = parseIsoWeek(value)
  if (!week || !Number.isInteger(delta)) return null
  return isoWeekKey(new Date(week.start.getTime() + delta * WEEK_MS))
}

/** The instant a week is judged at: now, or the week's last millisecond if it is over. */
export function weekReference(week: IsoWeek, now: Date): number {
  return Math.min(now.getTime(), week.end.getTime() - 1)
}

// ---------------------------------------------------------------------------
// Sets
// ---------------------------------------------------------------------------

function toMs(iso: string | null | undefined): number | null {
  if (!iso) return null
  const ms = Date.parse(iso)
  return Number.isFinite(ms) ? ms : null
}

type SetTiming = Pick<SetRow, 'published_at' | 'closed_at' | 'due_at'>

/** Published sets that were live at some point in [start, end). */
export function setsLiveInWindow<T extends SetTiming>(sets: readonly T[], start: number, end: number): T[] {
  return sets.filter((s) => {
    const published = toMs(s.published_at)
    if (published === null || published >= end) return false
    const close = toMs(effectiveCloseAt(s))
    return close === null || close >= start
  })
}

/** When a set's work is "in": the earlier of its deadline and its close. */
export function completedAt(s: SetTiming): number | null {
  const due = toMs(s.due_at)
  const close = toMs(effectiveCloseAt(s))
  if (due === null && close === null) return null
  return Math.min(due ?? Infinity, close ?? Infinity)
}

/** The most recent set completed by `ref` (see the module rules), or null. */
export function pickLastCompletedSet<T extends SetTiming & { id: string }>(
  sets: readonly T[],
  ref: number
): T | null {
  let best: { set: T; at: number; published: number } | null = null
  for (const s of sets) {
    const published = toMs(s.published_at)
    if (published === null || published > ref) continue
    const at = completedAt(s)
    if (at === null || at > ref) continue
    // Latest completion wins; ties go to the later-published set, then the id,
    // so the choice never depends on row order.
    const newer =
      best === null ||
      at > best.at ||
      (at === best.at && (published > best.published || (published === best.published && s.id > best.set.id)))
    if (newer) best = { set: s, at, published }
  }
  return best?.set ?? null
}

/** Who a set is for (see the module rules). */
export function setRoster(
  set: Pick<ClassSet, 'target' | 'published_at' | 'flags' | 'submissions'>,
  members: readonly ClassroomMember[]
): ClassroomMember[] {
  const targeted = set.target === 'students' ? new Set(set.flags.map((f) => f.student_id)) : null
  const handedIn = new Set(set.submissions.map((s) => s.student_id))
  const published = toMs(set.published_at)
  return members.filter((m) => {
    if (targeted && !targeted.has(m.student_id)) return false
    if (m.status === 'active' || handedIn.has(m.student_id)) return true
    const gone = toMs(m.left_at ?? m.removed_at ?? null)
    return published !== null && gone !== null && gone > published
  })
}

/** Each roster student's state on one set, named with displayName(). */
export function setStudentStates(
  set: ClassSet,
  members: readonly ClassroomMember[],
  names: ReadonlyMap<string, string | null>
): StudentAssignmentState[] {
  return setRoster(set, members).map((m) => ({
    student_id: m.student_id,
    display_name: displayName(names.get(m.student_id) ?? null),
    ...deriveStudentState({
      membership: m.status,
      items: set.items,
      submissions: set.submissions.filter((s) => s.student_id === m.student_id),
      flags: set.flags.find((f) => f.student_id === m.student_id) ?? null,
      due_at: set.due_at,
    }),
  }))
}

/** A set as a slip: counts from the P0 progress rules, status at `now`. */
export function summariseSet(
  set: ClassSet,
  members: readonly ClassroomMember[],
  names: ReadonlyMap<string, string | null>,
  now: Date
): AssignmentSummary {
  const progress = summariseProgress(setStudentStates(set, members, names), set.items)
  return {
    id: set.id,
    title: set.title,
    kind: set.kind,
    due_at: set.due_at,
    published_at: set.published_at,
    closed_at: set.closed_at,
    is_mock: set.is_mock,
    item_count: set.items.length,
    handed_in: progress.handed_in,
    late: progress.late,
    total_students: progress.total_students,
    status: assignmentStatus(set, now),
  }
}

// ---------------------------------------------------------------------------
// Students to watch
// ---------------------------------------------------------------------------

function nameOf(names: ReadonlyMap<string, string | null>, id: string): string {
  return displayName(names.get(id) ?? null)
}

function byName<T extends { display_name: string; id: string }>(a: T, b: T): number {
  return a.display_name.localeCompare(b.display_name) || a.id.localeCompare(b.id)
}

/** Active members with no marked work for SILENT_AFTER_DAYS by `ref`, quietest first. */
export function silentStudents(
  members: readonly ClassroomMember[],
  attempts: readonly Pick<ClassroomAttempt, 'user_id' | 'created_at'>[],
  names: ReadonlyMap<string, string | null>,
  ref: number
): ClassWeek['silent_students'] {
  const last = new Map<string, number>()
  for (const a of attempts) {
    const at = toMs(a.created_at)
    if (at === null || at > ref) continue
    last.set(a.user_id, Math.max(last.get(a.user_id) ?? -Infinity, at))
  }
  const out: ClassWeek['silent_students'] = []
  for (const m of members) {
    if (m.status !== 'active') continue
    const joined = toMs(m.joined_at)
    if (joined === null || joined > ref) continue
    const since = Math.max(last.get(m.student_id) ?? -Infinity, joined)
    const days = Math.floor((ref - since) / DAY_MS)
    if (days >= SILENT_AFTER_DAYS) {
      out.push({ id: m.student_id, display_name: nameOf(names, m.student_id), days_silent: days })
    }
  }
  return out.sort((a, b) => b.days_silent - a.days_silent || byName(a, b))
}

/** Active students below the critical line on a set, lowest first. */
export function strugglingOnSet(states: readonly StudentAssignmentState[]): ClassWeek['struggling'] {
  return states
    .filter(
      (s): s is StudentAssignmentState & { overall_pct: number } =>
        s.membership === 'active' && s.overall_pct !== null && levelFor(s.overall_pct) === 'critical'
    )
    .map((s) => ({ id: s.student_id, display_name: s.display_name, pct: s.overall_pct }))
    .sort((a, b) => a.pct - b.pct || byName(a, b))
}

function windowPct(
  attempts: readonly ClassroomAttempt[],
  from: number,
  to: number
): { pct: number; n: number } | null {
  let earned = 0
  let total = 0
  let n = 0
  for (const a of attempts) {
    const at = toMs(a.created_at)
    if (at === null || at <= from || at > to) continue
    const marks = usableMarks(a)
    if (!marks) continue
    earned += marks.earned
    total += marks.total
    n += 1
  }
  return n > 0 ? { pct: (earned / total) * 100, n } : null
}

/** Active students whose recent marks rose clearly above their own baseline, biggest rise first. */
export function improvingStudents(
  members: readonly ClassroomMember[],
  attempts: readonly ClassroomAttempt[],
  names: ReadonlyMap<string, string | null>,
  ref: number
): ClassWeek['improving'] {
  const byStudent = new Map<string, ClassroomAttempt[]>()
  for (const a of attempts) {
    const list = byStudent.get(a.user_id)
    if (list) list.push(a)
    else byStudent.set(a.user_id, [a])
  }
  const recentFrom = ref - IMPROVING_RECENT_DAYS * DAY_MS
  const baseFrom = recentFrom - IMPROVING_BASELINE_DAYS * DAY_MS
  const out: ClassWeek['improving'] = []
  for (const m of members) {
    if (m.status !== 'active') continue
    const mine = byStudent.get(m.student_id) ?? []
    const recent = windowPct(mine, recentFrom, ref)
    const base = windowPct(mine, baseFrom, recentFrom)
    if (!recent || !base) continue
    if (recent.n < MIN_ATTEMPTS_FOR_CONFIDENT_MASTERY || base.n < MIN_ATTEMPTS_FOR_CONFIDENT_MASTERY) continue
    const delta = Math.round((recent.pct - base.pct) * 10) / 10
    if (delta >= IMPROVING_MIN_POINTS) {
      out.push({ id: m.student_id, display_name: nameOf(names, m.student_id), delta_pct: delta })
    }
  }
  return out.sort((a, b) => b.delta_pct - a.delta_pct || byName(a, b))
}

// ---------------------------------------------------------------------------
// The week
// ---------------------------------------------------------------------------

export type ClassWeekInput = {
  classroomId: string
  week: IsoWeek
  now: Date
  archived: boolean
  /** Every membership row of the class, any status. */
  members: readonly ClassroomMember[]
  /** student id → full name (teacher_roster_profiles). */
  names: ReadonlyMap<string, string | null>
  /** Hydrated sets: at least the week's live sets and the last completed set. */
  sets: readonly ClassSet[]
  /** The class's scoped attempts (ignored for an archived class). */
  attempts: readonly ClassroomAttempt[]
  /** Hand-ins of the last completed set, with per-mark detail. */
  gapAttempts: readonly GapAttempt[]
  /** Hand-ins first received during the week. */
  submissionsInWeek: number
  /** Hand-ins not yet confirmed or re-marked. */
  unreviewed: number
}

export function buildClassWeek(input: ClassWeekInput): ClassWeek {
  const { week, now, archived, members, names, sets } = input
  const ref = weekReference(week, now)
  const live = setsLiveInWindow(sets, week.start.getTime(), week.end.getTime())
    .map((s) => ({ set: s, summary: summariseSet(s, members, names, now) }))
    .sort(
      (a, b) =>
        (toMs(a.set.due_at) ?? Infinity) - (toMs(b.set.due_at) ?? Infinity) ||
        a.set.title.localeCompare(b.set.title) ||
        a.set.id.localeCompare(b.set.id)
    )

  const last = pickLastCompletedSet(sets, ref)
  const struggling = last ? strugglingOnSet(setStudentStates(last, members, names)) : []

  return {
    classroom_id: input.classroomId,
    week: week.key,
    assignments: live.map((l) => l.summary),
    submissions_delta: Math.max(0, input.submissionsInWeek),
    silent_students: archived ? [] : silentStudents(members, input.attempts, names, ref),
    struggling,
    improving: archived ? [] : improvingStudents(members, input.attempts, names, ref),
    headline_gap:
      archived || !last ? null : headlineGapText(buildCohortGapReport([...input.gapAttempts])),
    unreviewed: archived ? 0 : Math.max(0, input.unreviewed),
  }
}

// ---------------------------------------------------------------------------
// Loader
// ---------------------------------------------------------------------------

export type LoadClassWeekOptions = {
  /** "YYYY-Www"; defaults to the current week. Validate with parseIsoWeek first. */
  week?: string
  now?: Date
  /**
   * Service client, used only for an ARCHIVED class — to read the hand-ins
   * retained from when it was active, which the teacher's RLS client no
   * longer returns. Pass it only after proving ownership.
   */
  admin?: SupabaseClient
}

/**
 * The class week for a classroom the caller has proven they own, read with
 * the teacher's RLS client. Null when the classroom is not visible to it.
 * Throws RangeError on a malformed `week`.
 */
export async function loadClassWeek(
  supabase: SupabaseClient,
  classroomId: string,
  opts: LoadClassWeekOptions = {}
): Promise<ClassWeek | null> {
  const now = opts.now ?? new Date()
  const week = opts.week === undefined ? currentIsoWeek(now) : parseIsoWeek(opts.week)
  if (!week) throw new RangeError(`Invalid ISO week: ${String(opts.week)}`)

  const classroom = await getClassroomScope(supabase, classroomId)
  if (!classroom) return null
  const archived = classroom.archived_at !== null
  // Retained hand-ins of an archived class are only readable as the service role.
  const setsDb = archived && opts.admin ? opts.admin : supabase

  const [members, published, roster] = await Promise.all([
    getClassroomMembers(supabase, classroomId),
    loadPublishedSets(setsDb, [classroomId]),
    getRosterProfiles(supabase, classroomId),
  ])
  const names = new Map(roster.map((r) => [r.id, r.full_name]))
  const ref = weekReference(week, now)

  const live = setsLiveInWindow(published, week.start.getTime(), week.end.getTime())
  const last = pickLastCompletedSet(published, ref)
  const wanted = new Map(live.map((s) => [s.id, s]))
  if (last) wanted.set(last.id, last)
  const setIds = published.map((s) => s.id)

  const [sets, submissionsInWeek, unreviewed, attemptRows] = await Promise.all([
    hydrateSets(setsDb, [...wanted.values()]),
    countSubmissions(setsDb, setIds, {
      firstFrom: week.start.toISOString(),
      firstTo: week.end.toISOString(),
    }),
    archived ? Promise.resolve(0) : countSubmissions(supabase, setIds, { unreviewed: true }),
    archived
      ? Promise.resolve({ attempts: [] as ClassroomAttempt[], truncated: false })
      : loadAttemptRows(
          supabase,
          members.filter((m) => m.status === 'active').map((m) => m.student_id),
          {
            lowerBound: new Map(
              members.filter((m) => m.status === 'active').map((m) => [m.student_id, m.joined_at])
            ),
            upperBound: new Date(ref).toISOString(),
            withMarking: false,
          }
        ),
  ])

  const attempts = scopeClassroomAttempts(attemptRows.attempts, members, {
    subjectCode: classroom.subject_code,
    until: new Date(ref).toISOString(),
  })

  let gapAttempts: ClassroomAttempt[] = []
  const lastHydrated = last ? sets.find((s) => s.id === last.id) : undefined
  if (!archived && lastHydrated) {
    const active = new Set(members.filter((m) => m.status === 'active').map((m) => m.student_id))
    const ids = lastHydrated.submissions
      .filter((s) => s.attempt_id && active.has(s.student_id))
      .map((s) => s.attempt_id as string)
    // Hand-ins are the set's by construction; the scope still applies the
    // join-date rule, and no subject filter (the set defines the subject).
    gapAttempts = scopeClassroomAttempts(await loadAttemptsByIds(supabase, ids), members, {
      subjectCode: null,
    })
  }

  return buildClassWeek({
    classroomId,
    week,
    now,
    archived,
    members,
    names,
    sets,
    attempts,
    gapAttempts,
    submissionsInWeek,
    unreviewed,
  })
}
