import 'server-only'

import type { SupabaseClient } from '@supabase/supabase-js'
import { requireTeacher } from '@/lib/teacher-auth'
import type { ClassroomSettings, MembershipStatus, RosterStudent } from '@/lib/teacher/types'
import { assignmentStatus } from '@/lib/teacher/assignment-status'
import { countDueByStudent } from '@/lib/teacher/cohort-due'
import { loadDueRowsForStudents } from '@/lib/teacher/load-due-rows'
import { overdueStudentIds } from '@/lib/teacher/overview'
import { stripRawHtml } from '@/lib/community/sanitize'
import { getSyllabusSubjectCodes, getSyllabusSubjectName } from '@/lib/syllabi'
import type { ClassroomAttempt, ClassroomMember } from '@/lib/teacher-analytics'
import {
  chunk,
  fetchAllFiltered,
  getClassroomAttempts,
  getClassroomMembers,
  getRosterProfiles,
  hydrateSets,
  loadPublishedSets,
  type ClassSet,
} from '@/lib/teacher-classroom-data'
import { BOARDS, IB_BOARD_ID, LEVELS } from '@/lib/profile-options'
import { resolveClassroomSubjectCode } from '@/lib/teacher/subject'

/**
 * Classroom reads and writes shared by the desk, the class list, the class
 * settings page and the classroom routes (docs/TEACHER_SYSTEM_SPEC.md §3, §4).
 *
 * The I/O functions take the caller's RLS client: a teacher only ever reads
 * their own classrooms through `classroom_teacher_access`, so there is no
 * ownership check to forget here. Everything else in this file is pure and
 * covered by list-classrooms.test.ts — PATCH validation, the delete guard,
 * cursors, the free-text sanitiser, subject labels and the roster helpers.
 */

// ---------------------------------------------------------------------------
// Rows
// ---------------------------------------------------------------------------

export type TeacherClassroomRow = {
  id: string
  name: string
  description: string | null
  invite_code: string | null
  board: string | null
  level: string | null
  subject: string | null
  subject_code: string | null
  year_group: string | null
  archived_at: string | null
  settings: ClassroomSettings
  created_at: string
  /** Active members only — removed and departed students are history, not a class size. */
  studentCount: number
}

export const CLASSROOM_COLUMNS =
  'id, name, description, invite_code, board, level, subject, subject_code, year_group, archived_at, settings, created_at'

export type ClassroomScope = 'active' | 'archived' | 'all'

export type ListClassroomsResult =
  | { ok: true; classrooms: TeacherClassroomRow[]; next_cursor: string | null }
  | { ok: false; status: 401 | 403 | 500; error: string }

/** The default page. A teacher with more classes than this pages with the cursor. */
export const CLASSROOM_PAGE_SIZE = 50
export const MAX_CLASSROOM_PAGE_SIZE = 100

// ---------------------------------------------------------------------------
// Keyset cursor — (created_at desc, id desc)
// ---------------------------------------------------------------------------

export type ClassroomCursor = { created_at: string; id: string }

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function isUuid(value: unknown): value is string {
  return typeof value === 'string' && UUID_RE.test(value)
}

/**
 * Opaque to clients: base64url JSON of the last row's sort key. The values are
 * re-validated on the way back in, because they are interpolated into a
 * PostgREST filter string.
 */
export function encodeClassroomCursor(cursor: ClassroomCursor): string {
  return Buffer.from(JSON.stringify([cursor.created_at, cursor.id]), 'utf8').toString('base64url')
}

export function decodeClassroomCursor(raw: string | null | undefined): ClassroomCursor | null {
  if (!raw || raw.length > 200) return null
  try {
    const parsed: unknown = JSON.parse(Buffer.from(raw, 'base64url').toString('utf8'))
    if (!Array.isArray(parsed) || parsed.length !== 2) return null
    const [createdAt, id] = parsed
    if (typeof createdAt !== 'string' || !isUuid(id)) return null
    // Only a real timestamp survives: this string is placed (quoted) inside an
    // `or=(…)` filter, so anything that is not an ISO instant is refused.
    if (!/^\d{4}-\d{2}-\d{2}T[\d:.]+(Z|[+-]\d{2}:?\d{2})?$/.test(createdAt)) return null
    if (!Number.isFinite(Date.parse(createdAt))) return null
    return { created_at: createdAt, id: id.toLowerCase() }
  } catch {
    return null
  }
}

/** The PostgREST `or` filter for "strictly after this cursor" in (created_at desc, id desc). */
export function classroomCursorFilter(cursor: ClassroomCursor): string {
  return `created_at.lt."${cursor.created_at}",and(created_at.eq."${cursor.created_at}",id.lt.${cursor.id})`
}

export function clampPageSize(raw: unknown, fallback = CLASSROOM_PAGE_SIZE): number {
  const n = typeof raw === 'string' ? Number.parseInt(raw, 10) : typeof raw === 'number' ? raw : NaN
  if (!Number.isFinite(n) || n < 1) return fallback
  return Math.min(Math.floor(n), MAX_CLASSROOM_PAGE_SIZE)
}

// ---------------------------------------------------------------------------
// Listing
// ---------------------------------------------------------------------------

function normaliseSettings(raw: unknown): ClassroomSettings {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {}
  const s = raw as Record<string, unknown>
  const out: ClassroomSettings = {}
  if (s.notify_submissions === 'daily' || s.notify_submissions === 'off') {
    out.notify_submissions = s.notify_submissions
  }
  if (typeof s.demo === 'boolean') out.demo = s.demo
  if (typeof s.student_can_see_class_avg === 'boolean') {
    out.student_can_see_class_avg = s.student_can_see_class_avg
  }
  return out
}

type ClassroomDbRow = Omit<TeacherClassroomRow, 'studentCount' | 'settings'> & { settings: unknown }

export function toClassroomRow(row: ClassroomDbRow, studentCount: number): TeacherClassroomRow {
  return { ...row, settings: normaliseSettings(row.settings), studentCount }
}

/**
 * Active-member counts per classroom. Reads membership rows (the teacher may
 * SELECT every status on their own classes) filtered to 'active', paged so a
 * teacher with many large classes is not cut off at 1,000 rows.
 */
export async function countActiveMembers(
  supabase: SupabaseClient,
  classroomIds: string[]
): Promise<Map<string, number>> {
  const counts = new Map<string, number>()
  for (const part of chunk([...new Set(classroomIds)])) {
    const { rows } = await fetchAllFiltered<{ classroom_id: string }>('classroom_memberships', (from, to) =>
      supabase
        .from('classroom_memberships')
        .select('classroom_id')
        .in('classroom_id', part)
        .eq('status', 'active')
        .order('classroom_id')
        .order('student_id')
        .range(from, to)
    )
    for (const m of rows) counts.set(m.classroom_id, (counts.get(m.classroom_id) ?? 0) + 1)
  }
  return counts
}

/**
 * The teacher's classrooms, newest first, keyset-paginated. Shared by the
 * desk, /teacher/classrooms and GET /api/teacher/classrooms.
 *
 * `scope` 'active' (default) hides archived classes, 'archived' lists only
 * them, 'all' both. The role check lives here so every caller gets the same
 * 403 for a signed-in student.
 */
export async function listTeacherClassrooms(
  supabase: SupabaseClient,
  userId: string,
  opts: { scope?: ClassroomScope; cursor?: string | null; limit?: number } = {}
): Promise<ListClassroomsResult> {
  const teacherCheck = await requireTeacher(supabase, userId)
  if (!teacherCheck.ok) {
    return { ok: false, status: 403, error: 'Not a teacher' }
  }

  const limit = clampPageSize(opts.limit)
  const cursor = decodeClassroomCursor(opts.cursor)

  let query = supabase
    .from('classrooms')
    .select(CLASSROOM_COLUMNS)
    .eq('teacher_id', userId)
    .order('created_at', { ascending: false })
    .order('id', { ascending: false })
    .limit(limit + 1)

  const scope = opts.scope ?? 'active'
  if (scope === 'active') query = query.is('archived_at', null)
  if (scope === 'archived') query = query.not('archived_at', 'is', null)
  if (cursor) query = query.or(classroomCursorFilter(cursor))

  const { data, error } = await query
  if (error) {
    console.error('[teacher/classrooms] list failed:', error.message)
    return { ok: false, status: 500, error: 'Failed to load classrooms' }
  }

  const page = ((data ?? []) as unknown as ClassroomDbRow[]).slice(0, limit)
  const hasMore = (data ?? []).length > limit

  let counts = new Map<string, number>()
  try {
    counts = await countActiveMembers(
      supabase,
      page.map((c) => c.id)
    )
  } catch (err) {
    // A class list with unknown sizes is still a usable class list.
    console.error('[teacher/classrooms] member count failed:', err instanceof Error ? err.message : err)
  }

  const last = page[page.length - 1]
  return {
    ok: true,
    classrooms: page.map((c) => toClassroomRow(c, counts.get(c.id) ?? 0)),
    next_cursor: hasMore && last ? encodeClassroomCursor({ created_at: last.created_at, id: last.id }) : null,
  }
}

/** One classroom the caller owns, or null (RLS hides everyone else's). */
export async function loadTeacherClassroom(
  supabase: SupabaseClient,
  userId: string,
  classroomId: string
): Promise<TeacherClassroomRow | null> {
  if (!isUuid(classroomId)) return null
  const { data, error } = await supabase
    .from('classrooms')
    .select(CLASSROOM_COLUMNS)
    .eq('id', classroomId)
    .eq('teacher_id', userId)
    .maybeSingle()
  if (error) {
    console.error('[teacher/classroom] load failed:', error.message)
    return null
  }
  if (!data) return null
  const counts = await countActiveMembers(supabase, [classroomId]).catch(() => new Map<string, number>())
  return toClassroomRow(data as unknown as ClassroomDbRow, counts.get(classroomId) ?? 0)
}

// ---------------------------------------------------------------------------
// Free text
// ---------------------------------------------------------------------------

// Control characters (other than tab, CR and LF, which the whitespace rules
// below handle), zero-width characters and bidi overrides. A name pasted from
// a spreadsheet can carry the first two, which break CSV exports and emails;
// the last can make a class name display as something it is not.
const CONTROL_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F\u200B-\u200F\u202A-\u202E\u2066-\u2069]/g

/**
 * Plain text from untrusted input: no HTML at all (tags removed after the
 * shared stripRawHtml pass, so a half-open `<script` cannot survive), no
 * control or bidi-override characters, NFC-normalised, trimmed. Single-line
 * values also collapse runs of whitespace. Returns null for non-strings.
 *
 * Every free-text field a teacher writes (class name, description, year
 * group) goes through this before it is stored (spec §8).
 */
export function plainText(value: unknown, opts: { multiline?: boolean } = {}): string | null {
  if (typeof value !== 'string') return null
  let out = stripRawHtml(value.normalize('NFC'))
    .replace(/<[^>]*>/g, ' ')
    .replace(/[<>]/g, '')
    .replace(CONTROL_CHARS, '')
  out = opts.multiline
    ? out
        .replace(/\r\n?/g, '\n')
        .split('\n')
        .map((line) => line.replace(/[ \t]+/g, ' ').trim())
        .join('\n')
        .replace(/\n{3,}/g, '\n\n')
    : out.replace(/\s+/g, ' ')
  return out.trim()
}

// ---------------------------------------------------------------------------
// PATCH /api/teacher/classroom/[id] — validation
// ---------------------------------------------------------------------------

export const CLASS_NAME_MAX = 120
export const CLASS_DESCRIPTION_MAX = 500
export const YEAR_GROUP_MAX = 40

/** The settings keys a teacher may change. `demo` is set only by seed-demo. */
export type ClassroomSettingsPatch = Pick<ClassroomSettings, 'notify_submissions' | 'student_can_see_class_avg'>

export type ClassroomPatch = {
  name?: string
  description?: string | null
  board?: string
  level?: string
  subject_code?: string | null
  year_group?: string | null
  settings?: ClassroomSettingsPatch
  /** `false` restores an archived class. Archiving itself is DELETE ?mode=archive. */
  archived?: false
}

export type PatchResult =
  | { ok: true; patch: ClassroomPatch }
  | { ok: false; error: string; field?: string }

const PATCH_KEYS = new Set([
  'name',
  'description',
  'board',
  'level',
  'subject_code',
  'year_group',
  'settings',
  'archived',
])

let subjectCodes: ReadonlySet<string> | null = null
export function isRegistrySubjectCode(code: string): boolean {
  subjectCodes ??= new Set(getSyllabusSubjectCodes())
  return subjectCodes.has(code)
}

/**
 * Validates a PATCH body into a patch, field by field, so the form can put
 * the message next to the right input. Unknown keys are refused rather than
 * ignored: a client sending `teacher_id` or `invite_code` is a bug or an
 * attack, and silently dropping it would hide both.
 */
export function parseClassroomPatch(body: unknown): PatchResult {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { ok: false, error: 'Send a JSON object.' }
  }
  const input = body as Record<string, unknown>
  for (const key of Object.keys(input)) {
    if (!PATCH_KEYS.has(key)) return { ok: false, error: `“${key}” cannot be changed here.`, field: key }
  }

  const patch: ClassroomPatch = {}

  if ('name' in input) {
    const name = plainText(input.name)
    if (!name) return { ok: false, error: 'Give the class a name.', field: 'name' }
    if (name.length > CLASS_NAME_MAX) {
      return { ok: false, error: `Keep the name under ${CLASS_NAME_MAX} characters.`, field: 'name' }
    }
    patch.name = name
  }

  if ('description' in input) {
    if (input.description === null) patch.description = null
    else {
      const description = plainText(input.description, { multiline: true })
      if (description === null) return { ok: false, error: 'Description must be text.', field: 'description' }
      if (description.length > CLASS_DESCRIPTION_MAX) {
        return {
          ok: false,
          error: `Keep the description under ${CLASS_DESCRIPTION_MAX} characters.`,
          field: 'description',
        }
      }
      patch.description = description || null
    }
  }

  if ('board' in input) {
    const board = typeof input.board === 'string' ? input.board.trim() : ''
    if (!BOARDS.some((b) => b.enabled && b.id === board)) {
      return { ok: false, error: 'Pick an exam board from the list.', field: 'board' }
    }
    patch.board = board
  }

  if ('level' in input) {
    const level = typeof input.level === 'string' ? input.level.trim() : ''
    if (!LEVELS.some((l) => l.enabled && l.id === level)) {
      return { ok: false, error: 'Pick a level from the list.', field: 'level' }
    }
    patch.level = level
  }

  if ('subject_code' in input) {
    if (input.subject_code === null || input.subject_code === '') patch.subject_code = null
    else if (typeof input.subject_code === 'string' && isRegistrySubjectCode(input.subject_code.trim())) {
      patch.subject_code = input.subject_code.trim()
    } else {
      return { ok: false, error: 'Pick a syllabus from the list.', field: 'subject_code' }
    }
  }

  if ('year_group' in input) {
    if (input.year_group === null) patch.year_group = null
    else {
      const year = plainText(input.year_group)
      if (year === null) return { ok: false, error: 'Year group must be text.', field: 'year_group' }
      if (year.length > YEAR_GROUP_MAX) {
        return { ok: false, error: `Keep the year group under ${YEAR_GROUP_MAX} characters.`, field: 'year_group' }
      }
      patch.year_group = year || null
    }
  }

  if ('settings' in input) {
    const raw = input.settings
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
      return { ok: false, error: 'Settings must be an object.', field: 'settings' }
    }
    const settings: ClassroomSettingsPatch = {}
    for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
      if (key === 'notify_submissions') {
        if (value !== 'daily' && value !== 'off') {
          return { ok: false, error: 'Submission alerts are either daily or off.', field: 'settings.notify_submissions' }
        }
        settings.notify_submissions = value
      } else if (key === 'student_can_see_class_avg') {
        if (typeof value !== 'boolean') {
          return { ok: false, error: 'Class average visibility is on or off.', field: 'settings.student_can_see_class_avg' }
        }
        settings.student_can_see_class_avg = value
      } else {
        return { ok: false, error: `“${key}” cannot be changed here.`, field: `settings.${key}` }
      }
    }
    patch.settings = settings
  }

  if ('archived' in input) {
    if (input.archived !== false) {
      return { ok: false, error: 'Archive a class from the danger zone.', field: 'archived' }
    }
    patch.archived = false
  }

  if (Object.keys(patch).length === 0) return { ok: false, error: 'Nothing to change.' }
  return { ok: true, patch }
}

/**
 * The stored settings after a patch. Server-side merge, so a client that only
 * knows about one toggle cannot wipe the others — or the `demo` flag, which
 * no client may set or clear.
 */
export function mergeClassroomSettings(
  current: ClassroomSettings,
  patch: ClassroomSettingsPatch | undefined
): ClassroomSettings {
  const base = normaliseSettings(current)
  if (!patch) return base
  return { ...base, ...patch }
}

/**
 * The DB update for a validated patch. `archived: false` clears archived_at;
 * everything else maps to its column. An archived class accepts only the
 * restore — its page is read-only, and editing a class nobody can join is
 * almost always a mistake.
 */
export function classroomUpdateFor(
  patch: ClassroomPatch,
  current: Pick<TeacherClassroomRow, 'settings' | 'archived_at'>
):
  | { ok: true; update: Record<string, unknown> }
  | { ok: false; status: 409; error: string } {
  const editing = Object.keys(patch).some((k) => k !== 'archived')
  if (current.archived_at && editing) {
    return { ok: false, status: 409, error: 'This class is archived. Restore it before changing its settings.' }
  }
  const update: Record<string, unknown> = {}
  if (patch.name !== undefined) update.name = patch.name
  if (patch.description !== undefined) update.description = patch.description
  if (patch.board !== undefined) update.board = patch.board
  if (patch.level !== undefined) update.level = patch.level
  if (patch.subject_code !== undefined) update.subject_code = patch.subject_code
  if (patch.year_group !== undefined) update.year_group = patch.year_group
  if (patch.settings !== undefined) update.settings = mergeClassroomSettings(current.settings, patch.settings)
  if (patch.archived === false) update.archived_at = null
  update.updated_at = new Date().toISOString()
  return { ok: true, update }
}

// ---------------------------------------------------------------------------
// DELETE guard
// ---------------------------------------------------------------------------

export type DeleteMode = 'archive' | 'delete'

export function parseDeleteMode(raw: string | null): DeleteMode | null {
  if (raw === null || raw === '' || raw === 'archive') return 'archive'
  if (raw === 'delete') return 'delete'
  return null
}

/**
 * Deleting a class destroys every set, hand-in and retained mark in it (the
 * FKs cascade), so it is allowed only once the class is archived and nobody
 * is still an active member. Archiving is the reversible step; this is the
 * irreversible one, and the two guard rails make it take two decisions.
 */
export function classroomDeleteGuard(input: {
  archived_at: string | null
  activeMembers: number
}): { ok: true } | { ok: false; error: string } {
  if (!input.archived_at) {
    return { ok: false, error: 'Archive the class before deleting it.' }
  }
  if (input.activeMembers > 0) {
    const n = input.activeMembers
    return {
      ok: false,
      error: `Remove the ${n === 1 ? 'last student' : `${n} students still in it`} before deleting this class.`,
    }
  }
  return { ok: true }
}

// ---------------------------------------------------------------------------
// Subjects
// ---------------------------------------------------------------------------

/** "Chemistry · 9701", "Chemistry HL", "Theory of Knowledge" — for pickers and chips. */
export function subjectCodeLabel(code: string | null | undefined): string {
  if (!code) return 'No syllabus set'
  const name = getSyllabusSubjectName(code) ?? code
  if (code.startsWith('ib-')) {
    const level = /-(hl|sl)$/.exec(code)?.[1]
    return level ? `${name} ${level.toUpperCase()}` : name
  }
  return `${name} · ${code}`
}

/** The short stamp on a class slip: the Cambridge code, or HL/SL + initials for IB. */
export function subjectStamp(code: string | null | undefined): string {
  if (!code) return 'CL'
  if (!code.startsWith('ib-')) return code.slice(0, 4).toUpperCase()
  const level = /-(hl|sl)$/.exec(code)?.[1]
  const name = getSyllabusSubjectName(code) ?? code.replace(/^ib-/, '')
  const initials = name
    .split(/[\s:,-]+/)
    .filter((w) => /^[A-Za-z]/.test(w) && !/^(and|of|a)$/i.test(w))
    .map((w) => w[0].toUpperCase())
    .join('')
    .slice(0, 3)
  return level ? `${initials}${level.toUpperCase()[0]}` : initials || 'IB'
}

/**
 * Registry codes grouped for the settings picker: the board's own group first
 * (Cambridge syllabus codes, or IB courses), then the rest.
 */
export function subjectCodeGroups(board: string | null): Array<{ label: string; codes: string[] }> {
  const all = getSyllabusSubjectCodes()
  const cambridge = all.filter((c) => !c.startsWith('ib-'))
  const ib = all.filter((c) => c.startsWith('ib-'))
  const groups = [
    { label: 'Cambridge International', codes: cambridge },
    { label: 'IB Diploma', codes: ib },
  ]
  return board === IB_BOARD_ID ? groups.reverse() : groups
}

/**
 * Up to four likely syllabus codes for a class, best first: the one its
 * board / level / subject resolves to, the current one, then every registry
 * code whose subject name matches (so an IB "Chemistry" class is offered both
 * HL and SL rather than a guess). Used for the quick-pick control in class
 * settings; the full list is always available beside it.
 */
export function suggestSubjectCodes(input: {
  board: string | null
  level: string | null
  subject: string | null
  current: string | null
}): string[] {
  const out: string[] = []
  const push = (code: string | null) => {
    if (code && isRegistrySubjectCode(code) && !out.includes(code)) out.push(code)
  }
  push(resolveClassroomSubjectCode(input.board ?? '', input.level ?? '', input.subject ?? ''))
  push(input.current)

  const subject = (input.subject ?? '').trim().toLowerCase().replace(/\s+(hl|sl)$/, '')
  if (subject) {
    const ib = input.board === IB_BOARD_ID || (input.subject ?? '').toLowerCase().startsWith('ib-')
    for (const code of getSyllabusSubjectCodes()) {
      if (ib !== code.startsWith('ib-')) continue
      const name = (getSyllabusSubjectName(code) ?? '').toLowerCase()
      const slug = code.replace(/^ib-/, '').replace(/-(hl|sl)$/, '')
      if (name === subject || slug === subject.replace(/^ib-/, '').replace(/-(hl|sl)$/, '')) push(code)
    }
  }
  return out.slice(0, 4)
}

// ---------------------------------------------------------------------------
// Roster helpers (pure)
// ---------------------------------------------------------------------------

/**
 * Newest attempt per student from attempts already scoped to the class
 * (getClassroomAttempts: active members, since joining, class subject) and
 * sorted newest first, as that loader returns them.
 */
export function latestActivityByStudent(
  scopedNewestFirst: readonly Pick<ClassroomAttempt, 'user_id' | 'created_at'>[]
): Map<string, string> {
  const latest = new Map<string, string>()
  for (const a of scopedNewestFirst) {
    if (!latest.has(a.user_id)) latest.set(a.user_id, a.created_at)
  }
  return latest
}

/**
 * For each student, how many of the class's open sets they are overdue on —
 * the same definition as the desk's "late students" (overdueStudentIds in
 * lib/teacher/overview.ts: past their own deadline, not excused, joined
 * before it, with an item still not handed in), so the roster badge and the
 * desk never disagree about who is late.
 */
export function countOverdueSets(
  sets: readonly ClassSet[],
  members: readonly ClassroomMember[],
  now: Date = new Date()
): Map<string, number> {
  const out = new Map<string, number>()
  for (const set of sets) {
    if (assignmentStatus(set, now) !== 'open') continue
    for (const id of overdueStudentIds(set, members, now)) out.set(id, (out.get(id) ?? 0) + 1)
  }
  return out
}

/** Roster order: active members A–Z, then those who left or were removed. */
export function sortRoster<T extends { full_name: string | null; status: MembershipStatus }>(rows: readonly T[]): T[] {
  const rank = (s: MembershipStatus) => (s === 'active' ? 0 : 1)
  return [...rows].sort(
    (a, b) =>
      rank(a.status) - rank(b.status) ||
      (a.full_name ?? '').localeCompare(b.full_name ?? '', 'en', { sensitivity: 'base' })
  )
}

// ---------------------------------------------------------------------------
// Demo seeding
// ---------------------------------------------------------------------------

/**
 * Whether the example-class seeder may run. Never in production: it creates
 * real auth users, and Vercel preview builds also run with
 * NODE_ENV=production, which is deliberate — a preview may point at the
 * production database.
 */
export function demoSeedingEnabled(env: { NODE_ENV?: string } = process.env): boolean {
  return env.NODE_ENV !== 'production'
}

/** Status of a roster member as the roster and CSV present it. */
export function membershipLabel(status: MembershipStatus): string {
  if (status === 'removed') return 'Removed'
  if (status === 'left') return 'Left'
  return 'Active'
}

// ---------------------------------------------------------------------------
// Roster (GET /api/teacher/classroom/[id]/roster and the settings page)
// ---------------------------------------------------------------------------

/** Enough of the newest scoped attempts to place every active student's last activity. */
const LAST_ACTIVE_ATTEMPT_LIMIT = 5000

export type LoadRosterResult = { ok: true; students: RosterStudent[] } | { ok: false; error: string }

/**
 * Every member the class has had, active first. Names and profile fields come
 * only from the teacher_roster_profiles RPC (via getRosterProfiles) — the one
 * cross-user profile read a roster may make. Last activity, due topics and
 * overdue sets are computed for active members only (the others' work is no
 * longer the teacher's to see), and not at all for an archived class, which
 * RLS has already closed.
 *
 * `service` is the service client. It is used for two reads RLS would hide
 * from the teacher although they are entitled to the answer — the schedule
 * tables behind due counts (no client policies) and paper codes of banked
 * questions (to place attempts in the class subject). The caller must have
 * proven ownership of the classroom before passing it.
 */
export async function loadClassRoster(
  supabase: SupabaseClient,
  service: SupabaseClient,
  classroom: Pick<TeacherClassroomRow, 'id' | 'subject_code' | 'archived_at'>,
  now: Date = new Date()
): Promise<LoadRosterResult> {
  let profiles: Awaited<ReturnType<typeof getRosterProfiles>>
  try {
    profiles = await getRosterProfiles(supabase, classroom.id)
  } catch (err) {
    console.error('[teacher/roster] roster RPC failed:', err instanceof Error ? err.message : err)
    return { ok: false, error: 'Could not load the class list.' }
  }

  const activeIds = profiles.filter((p) => p.status === 'active').map((p) => p.id)
  const live = !classroom.archived_at && activeIds.length > 0

  // Each enrichment is best-effort: the list itself is the point, and a
  // failed badge must not blank it.
  const [lastActive, due, overdue] = await Promise.all([
    live
      ? getClassroomAttempts(supabase, classroom.id, {
          subjectCode: classroom.subject_code,
          withMarking: false,
          limit: LAST_ACTIVE_ATTEMPT_LIMIT,
          admin: service,
        })
          .then(({ attempts }) => latestActivityByStudent(attempts))
          .catch((err) => {
            console.error('[teacher/roster] last active:', err instanceof Error ? err.message : err)
            return new Map<string, string>()
          })
      : new Map<string, string>(),
    live
      ? loadDueRowsForStudents(service, activeIds)
          .then(({ rows, error: dueError }) => {
            if (dueError) throw new Error(dueError)
            const inSubject = classroom.subject_code
              ? rows.filter((r) => r.subjectCode === classroom.subject_code)
              : rows
            return countDueByStudent(inSubject)
          })
          .catch((err) => {
            console.error('[teacher/roster] due counts:', err instanceof Error ? err.message : err)
            return {} as Record<string, number>
          })
      : ({} as Record<string, number>),
    live
      ? Promise.all([loadPublishedSets(supabase, [classroom.id]), getClassroomMembers(supabase, classroom.id)])
          .then(async ([sets, members]) => {
            const open = sets.filter((s) => assignmentStatus(s, now) === 'open')
            return countOverdueSets(await hydrateSets(supabase, open), members, now)
          })
          .catch((err) => {
            console.error('[teacher/roster] overdue:', err instanceof Error ? err.message : err)
            return new Map<string, number>()
          })
      : new Map<string, number>(),
  ])

  return {
    ok: true,
    students: sortRoster(profiles).map((p) => {
      const isActive = p.status === 'active'
      return {
        id: p.id,
        full_name: p.full_name,
        board: p.board,
        level: p.level,
        joined_at: p.joined_at,
        status: p.status,
        last_attempt_at: isActive ? (lastActive.get(p.id) ?? null) : null,
        due_count: isActive ? (due[p.id] ?? 0) : 0,
        open_late: isActive ? (overdue.get(p.id) ?? 0) : 0,
      }
    }),
  }
}
