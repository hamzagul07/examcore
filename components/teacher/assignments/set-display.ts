/**
 * How a set reads on a slip (docs/TEACHER_SYSTEM_SPEC.md §4: the Sets list
 * and the class week's WeekStrip): its kind stamp, status chip, the
 * done / late / missing bar, "3 late: Amira K., Ben O., +1", and the tally.
 *
 * The counts are never re-derived here. A slip is drawn either from the
 * per-student states the P0 rules produce (deriveStudentState, via the week
 * loader) — exact — or, where only the AssignmentSummary is at hand (the
 * paged Sets list), from its counts, which is approximate for the one case
 * the counts cannot separate (see barFromSummary). The tally text always
 * comes from the summary, so it matches the desk and the digest.
 *
 * Pure; safe on client and server.
 */

import { HANDED_IN_STATES } from '@/lib/teacher/assignment-status'
import type {
  AssignmentKind,
  AssignmentSource,
  AssignmentSummary,
  StudentAssignmentState,
} from '@/lib/teacher/types'

export const KIND_STAMP: Record<AssignmentKind, string> = {
  question_set: 'Q',
  whole_paper: 'PPR',
  topic_drill: 'DRL',
  practice_prompt: 'PRM',
}

export const KIND_LABEL: Record<AssignmentKind, string> = {
  question_set: 'Question set',
  whole_paper: 'Whole paper',
  topic_drill: 'Topic drill',
  practice_prompt: 'Practice prompt',
}

export type SetStatus = AssignmentSummary['status']

export const STATUS_LABEL: Record<SetStatus, string> = {
  draft: 'Draft',
  open: 'Open',
  closed: 'Closed',
}

/** Where a set came from, as a short phrase ("From a reteach card"), or null for a manual set. */
export function sourceLabel(source: AssignmentSource | null | undefined): string | null {
  switch (source) {
    case 'reteach':
      return 'From a reteach card'
    case 'error_group':
      return 'For an error group'
    case 'blindspot':
      return 'From a blindspot'
    default:
      return null
  }
}

// ---------------------------------------------------------------------------
// The done / late / missing bar
// ---------------------------------------------------------------------------

/**
 * One slip's bar, in students. `done + late + owing + excused + left` is
 * `total`. `late` is every student with a late hand-in (the summary's `late`
 * overlay), so a late student is never also counted done. `exact` is false
 * when the bar was estimated from counts.
 */
export type SetBar = {
  total: number
  done: number
  late: number
  owing: number
  excused: number
  left: number
  exact: boolean
}

function complete(s: Pick<StudentAssignmentState, 'items'>): boolean {
  return s.items.length > 0 && s.items.every((i) => HANDED_IN_STATES.has(i.state))
}

/** The bar from each student's state (the week loader's per-set detail). */
export function barFromStates(states: readonly StudentAssignmentState[]): SetBar {
  const bar: SetBar = { total: states.length, done: 0, late: 0, owing: 0, excused: 0, left: 0, exact: true }
  for (const s of states) {
    if (s.is_late) bar.late += 1
    else if (complete(s)) bar.done += 1
    else if (s.membership !== 'active') bar.left += 1
    else if (s.excused) bar.excused += 1
    else bar.owing += 1
  }
  return bar
}

/**
 * The bar from an AssignmentSummary alone (the paged Sets list, which carries
 * counts, not students). `handed_in` counts complete students and `late`
 * students with any late hand-in; a late student who is only part-way through
 * is in `late` but not `handed_in`, so `done = handed_in − late` undercounts
 * by exactly those students. Excused and departed students cannot be told
 * apart from missing ones here, so they sit in `owing`. The tally text beside
 * the bar is exact either way.
 */
export function barFromSummary(s: Pick<AssignmentSummary, 'handed_in' | 'late' | 'total_students'>): SetBar {
  const total = Math.max(0, Math.floor(s.total_students))
  const late = Math.min(Math.max(0, Math.floor(s.late)), total)
  const done = Math.min(Math.max(0, Math.floor(s.handed_in) - late), total - late)
  return { total, done, late, owing: total - done - late, excused: 0, left: 0, exact: false }
}

/**
 * Segment widths in whole percent for the stacked bar, largest-remainder
 * rounded so they never overflow 100 and a single student is never invisible
 * (at least 1% when the count is non-zero).
 */
export function barWidths(bar: Pick<SetBar, 'total' | 'done' | 'late' | 'owing'>): {
  done: number
  late: number
  owing: number
} {
  if (bar.total <= 0) return { done: 0, late: 0, owing: 0 }
  const keys = ['done', 'late', 'owing'] as const
  const raw = keys.map((k) => (Math.max(0, bar[k]) / bar.total) * 100)
  const floors = raw.map((r, i) => (bar[keys[i]] > 0 ? Math.max(1, Math.floor(r)) : 0))
  let spare = Math.max(0, Math.round(raw.reduce((a, b) => a + b, 0)) - floors.reduce((a, b) => a + b, 0))
  const order = raw
    .map((r, i) => ({ i, rem: r - Math.floor(r) }))
    .filter(({ i }) => bar[keys[i]] > 0)
    .sort((a, b) => b.rem - a.rem || a.i - b.i)
  for (const { i } of order) {
    if (spare <= 0) break
    floors[i] += 1
    spare -= 1
  }
  // A 1% floor can push the sum over 100 when there are many tiny segments.
  let over = floors.reduce((a, b) => a + b, 0) - 100
  for (let i = floors.length - 1; over > 0 && i >= 0; i--) {
    const take = Math.min(over, Math.max(0, floors[i] - 1))
    floors[i] -= take
    over -= take
  }
  return { done: floors[0], late: floors[1], owing: floors[2] }
}

/** The bar as a sentence, for the slip's accessible name. */
export function barSummary(bar: SetBar): string {
  if (bar.total === 0) return 'Nobody is on this set yet.'
  const parts = [`${bar.done} on time`, `${bar.late} late`, `${bar.owing} still to hand in`]
  if (bar.exact && bar.excused > 0) parts.push(`${bar.excused} excused`)
  if (bar.exact && bar.left > 0) parts.push(`${bar.left} left the class`)
  return `${parts.join(', ')} (of ${bar.total}).`
}

// ---------------------------------------------------------------------------
// Late names and the tally
// ---------------------------------------------------------------------------

/** Names of students with a late hand-in, A–Z (states carry displayName() names). */
export function lateNames(states: readonly StudentAssignmentState[]): string[] {
  return states
    .filter((s) => s.is_late)
    .map((s) => s.display_name)
    .sort((a, b) => a.localeCompare(b))
}

/**
 * "3 late: Amira K., Ben O., +1", "1 late: Amira K.", "3 late" (no names
 * known), or null when nobody is late. `count` is the summary's late count;
 * names beyond `shown` collapse into "+n".
 */
export function lateLine(names: readonly string[], count: number, shown = 2): string | null {
  const n = Math.max(0, Math.floor(count), names.length)
  if (n === 0) return null
  if (names.length === 0) return `${n} late`
  const visible = names.slice(0, Math.max(1, shown))
  const rest = n - visible.length
  return `${n} late: ${visible.join(', ')}${rest > 0 ? `, +${rest}` : ''}`
}

/** "18/24" handed in (every item) of the students the set is for. */
export function tallyText(s: Pick<AssignmentSummary, 'handed_in' | 'total_students'>): string {
  return `${Math.max(0, s.handed_in)}/${Math.max(0, s.total_students)}`
}

/** "4 questions", "1 paper", "2 prompts" — what a slip holds. */
export function itemCountLabel(kind: AssignmentKind, count: number): string {
  const n = Math.max(0, Math.floor(count))
  const noun = kind === 'whole_paper' ? 'paper' : kind === 'practice_prompt' ? 'prompt' : 'question'
  return `${n} ${noun}${n === 1 ? '' : 's'}`
}

/** "3 sets due this week", "1 set due this week", "nothing due this week" — the class head's note. */
export function dueThisWeekNote(
  sets: readonly Pick<AssignmentSummary, 'due_at'>[],
  weekStartIso: string,
  weekEndIso: string
): string {
  const start = Date.parse(weekStartIso)
  const end = Date.parse(weekEndIso)
  const n = sets.filter((s) => {
    const due = s.due_at ? Date.parse(s.due_at) : Number.NaN
    return Number.isFinite(due) && due >= start && due < end
  }).length
  if (n === 0) return 'nothing due this week'
  return `${n} ${n === 1 ? 'set' : 'sets'} due this week`
}

/**
 * The syllabus topics a set covered, for "Set a drill" on the reteach card:
 * each item's own topic (a drill's provenance) first, then its question's
 * tags, in item order, de-duplicated, at most `max`. Codes are whatever the
 * bank tagged; the composer keeps only those in the class's syllabus.
 */
export function setTopicCodes(
  items: ReadonlyArray<{ position: number; topic_code: string | null; syllabus_tags: readonly string[] | null }>,
  max = 6
): string[] {
  const out: string[] = []
  const push = (code: string | null | undefined) => {
    const c = typeof code === 'string' ? code.trim() : ''
    if (c && !out.includes(c) && out.length < max) out.push(c)
  }
  const ordered = [...items].sort((a, b) => a.position - b.position)
  for (const item of ordered) push(item.topic_code)
  for (const item of ordered) for (const tag of item.syllabus_tags ?? []) push(tag)
  return out
}

// ---------------------------------------------------------------------------
// Error groups
// ---------------------------------------------------------------------------

/** The stamp on an error group's slip, by lib/error-classifications kind. */
export const ERROR_GROUP_STAMP: Record<string, string> = {
  conceptual: 'CON',
  algebraic_sign: 'SGN',
  arithmetic: 'ARI',
  incomplete: 'INC',
  time_pressure: 'TIM',
}

export function errorGroupStamp(classification: string): string {
  return ERROR_GROUP_STAMP[classification] ?? 'ERR'
}

/** "4 students · 11 marks lost". */
export function errorGroupMeta(students: number, evidence: number): string {
  const s = `${students} ${students === 1 ? 'student' : 'students'}`
  const e = `${evidence} ${evidence === 1 ? 'mark' : 'marks'} lost`
  return `${s} · ${e}`
}

/**
 * The group's students by name, A–Z: "Amira K., Ben O., Cara L., +2". An id
 * without a known name (a student who left since the attempts were read) is
 * counted in "+n" rather than shown as "Student".
 */
export function groupStudentsLine(ids: readonly string[], names: Readonly<Record<string, string>>, shown = 4): string {
  const known = ids
    .map((id) => names[id])
    .filter((n): n is string => typeof n === 'string' && n.length > 0)
    .sort((a, b) => a.localeCompare(b))
  const visible = known.slice(0, Math.max(0, shown))
  const rest = ids.length - visible.length
  if (visible.length === 0) return `${ids.length} ${ids.length === 1 ? 'student' : 'students'}`
  return `${visible.join(', ')}${rest > 0 ? `, +${rest}` : ''}`
}
