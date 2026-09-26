import 'server-only'

import type { SupabaseClient } from '@supabase/supabase-js'
import {
  computeStudentQuadrants,
  paceDivider,
  summarizeClassAnalytics,
  type ClassroomAttempt,
  type Quadrant,
} from '@/lib/teacher-analytics'
import { getStudentProfiles } from '@/lib/teacher-classroom-data'
import { requireTeacher } from '@/lib/teacher-auth'
import { actionable, rankBlindspots } from '@/lib/teacher/blindspots'
import { buildCohortGapReport, headlineGapText } from '@/lib/teacher/cohort-gaps'
import { displayName } from '@/lib/teacher/display-name'
import { buildErrorGroups } from '@/lib/teacher/groups'
import { classBlindspots, loadScopedClass } from '@/lib/teacher/insights/server'
import {
  resolveTeacherOmniAddress,
  teacherCtaHref,
  type TeacherOmniAddress,
  type TeacherOmniView,
} from '@/lib/teacher/insights/omni'
import { QUADRANT_META, RISK_ORDER } from '@/lib/teacher/insights/risk-matrix'
import { isUuid, loadTeacherClassroom, subjectCodeLabel, type TeacherClassroomRow } from '@/lib/teacher/list-classrooms'
import { loadTeacherOverview } from '@/lib/teacher/overview'
import type { ClassWeek, TeacherOverview } from '@/lib/teacher/types'
import { loadClassWeek } from '@/lib/teacher/week'
import { classHref, composerHref, reviewsHref, setsHref } from '@/components/teacher/assignments/links'

/**
 * What the Omni assistant knows about a teacher's class (spec §3
 * `/api/omni-ai`, §8 "Omni: server-built prompts, displayName, render_cta
 * same-origin /teacher/** allowlist").
 *
 * The rule this module exists for: **a teacher's prompt is built from the
 * database, never from the request.** A teacher page sends only its address,
 * `context.data = { classroom_id, view }` (lib/teacher/insights/omni.ts).
 * parseTeacherOmniRequest reads exactly those two keys off the raw body and
 * nothing else; authorizeTeacherOmni proves the caller is a teacher who owns
 * that classroom (RLS read, 404 otherwise); buildOmniClassContext then loads
 * the class itself, after ownership, with the same loaders the class pages
 * use. Whatever else a client puts in `context.data` — the old
 * `classMetrics` payload, a crafted roster — never reaches the model.
 *
 * Names reach the prompt only through displayName ("Amira K."): student
 * names are text their owners typed, so they are cut to a first name and an
 * initial, with every non-letter removed, before they are formatted. The
 * formatted block is still fenced as untrusted data by the system prompt
 * (class and set titles are teacher-typed; marker notes come from scripts).
 *
 * Links the assistant may offer are built here, from validated ids and
 * syllabus codes, and listed OUTSIDE the fence; each is checked with
 * teacherCtaHref, the same allowlist the route applies to the model's
 * render_cta and the teacher chat applies to links in its prose
 * (RichTextRenderer `linkFilter`). Student ids appear only inside those
 * hrefs, never beside a name.
 *
 * The pure parts (parsing, facts, formatting, links) are exported for
 * lib/omni-ai/teacher-context.test.ts; the loaders are injectable for it.
 */

// ---------------------------------------------------------------------------
// The request: an address, nothing more
// ---------------------------------------------------------------------------

export type ParsedTeacherOmniRequest = { ok: true; address: TeacherOmniAddress } | { ok: false; error: string }

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : null
}

/**
 * The address a teacher page sent, read from the RAW request body (the
 * shared schema strips unknown keys, so `classroom_id` is not in the parsed
 * context). Only `context.data.classroom_id` and `context.data.view` are
 * read. A classroom id that is present but not a uuid is a bad request —
 * not silently the desk, which would answer about the wrong thing. An
 * unknown view is cosmetic and falls back (resolveTeacherOmniAddress).
 */
export function parseTeacherOmniRequest(raw: unknown): ParsedTeacherOmniRequest {
  const data = record(record(record(raw)?.context)?.data)
  const rawId = data?.classroom_id
  let classroomId: string | null = null
  if (rawId !== undefined && rawId !== null && rawId !== '') {
    if (!isUuid(rawId)) return { ok: false, error: 'Invalid request — context.data.classroom_id is not a classroom id' }
    classroomId = rawId.toLowerCase()
  }
  return { ok: true, address: resolveTeacherOmniAddress({ classroomId, view: data?.view }) }
}

export type TeacherOmniAccess =
  | { ok: true; address: TeacherOmniAddress; classroom: TeacherClassroomRow | null }
  | { ok: false; status: 400 | 401 | 403 | 404; error: string }

/**
 * The teacher route shape (spec §3) for an Omni message sent from a teacher
 * page: a valid address (400), signed in (401), a teacher (403), and — when
 * the page is about a class — the owner of it (404, read through RLS, the
 * same answer for "no such class" and "not yours"). Runs before anything is
 * metered, so a refused message costs nothing.
 */
export async function authorizeTeacherOmni(
  raw: unknown,
  supabase: SupabaseClient,
  userId: string | null
): Promise<TeacherOmniAccess> {
  const parsed = parseTeacherOmniRequest(raw)
  if (!parsed.ok) return { ok: false, status: 400, error: parsed.error }
  if (!userId) return { ok: false, status: 401, error: 'Sign in to use the teacher assistant.' }
  const teacher = await requireTeacher(supabase, userId)
  if (!teacher.ok) return { ok: false, status: 403, error: 'Not a teacher' }
  const { address } = parsed
  if (!address.classroomId) return { ok: true, address, classroom: null }
  const classroom = await loadTeacherClassroom(supabase, userId, address.classroomId)
  if (!classroom) return { ok: false, status: 404, error: 'Classroom not found' }
  return { ok: true, address, classroom }
}

// ---------------------------------------------------------------------------
// Facts: what the prompt may say, already reduced to safe shapes
// ---------------------------------------------------------------------------

/** Caps that keep a large class from becoming the whole prompt. */
export const OMNI_LIMITS = {
  blindspots: 5,
  markTypes: 3,
  mostMissed: 3,
  noteChars: 160,
  groups: 3,
  namesPerList: 8,
  atRisk: 10,
  sets: 6,
  titleChars: 80,
  classes: 12,
  /** Scripts read for the class context: the newest, enough for every figure the prompt uses. */
  attempts: 1500,
} as const

export type OmniClassFacts = {
  kind: 'class'
  classroomId: string
  name: string
  subject: string
  yearGroup: string | null
  archived: boolean
  students: number
  studentsWithWork: number
  scripts: number
  avgPct: number | null
  truncated: boolean
  blindspots: Array<{ code: string; name: string; avgPct: number; students: number; of: number; thin: boolean }>
  /** Syllabus codes worth a drill: weak AND evidenced (actionable), weakest first. */
  drillCodes: string[]
  headlineGap: string | null
  weakMarkTypes: Array<{ label: string; earnedPct: number; thin: boolean }>
  mostMissed: Array<{ note: string; students: number }>
  groups: Array<{ label: string; names: string[]; count: number; leafCode: string | null; studentIds: string[] }>
  risk: {
    paceCompared: boolean
    counts: Record<Quadrant, number>
    atRisk: Array<{ name: string; zone: string; accuracyPct: number; grade: string | null; weakest: string | null }>
    atRiskIds: string[]
  }
  week: {
    key: string
    sets: Array<{ title: string; status: string; dueAt: string | null; handedIn: number; total: number; late: number }>
    submissionsThisWeek: number
    unreviewed: number
    silent: Array<{ name: string; days: number }>
    struggling: Array<{ name: string; pct: number }>
    improving: Array<{ name: string; delta: number }>
    headlineGap: string | null
  } | null
}

export type OmniDeskFacts = {
  kind: 'desk'
  classes: Array<{
    id: string
    name: string
    subject: string
    members: number
    openSets: number
    dueThisWeek: number
    unreviewed: number
    lateStudents: number
    headlineGap: string | null
    archived: boolean
  }>
  needsYou: TeacherOverview['needs_you']
}

export type OmniTeacherFacts = OmniClassFacts | OmniDeskFacts

function round1(n: number): number {
  return Math.round(n * 10) / 10
}

function clip(text: string | null | undefined, max: number): string {
  const flat = (text ?? '').replace(/\s+/g, ' ').trim()
  return flat.length > max ? `${flat.slice(0, max - 1)}…` : flat
}

/** Everything buildOmniClassFacts reads, as the loaders return it. */
export type OmniClassInputs = {
  classroom: Pick<TeacherClassroomRow, 'id' | 'name' | 'subject_code' | 'year_group' | 'archived_at' | 'board' | 'studentCount'>
  /** The class's scoped attempts (active members, since joining, in subject) with per-mark detail. */
  attempts: readonly ClassroomAttempt[]
  /** Active members the attempts were scoped to. */
  studentIds: readonly string[]
  truncated: boolean
  /** student id → full name, from the profile RPC. Reduced to displayName here, never passed on. */
  fullNames: ReadonlyMap<string, string | null>
  /** The current class week (its names are already displayName), or null. */
  week: ClassWeek | null
}

/**
 * The class facts, from the same P1 functions the class pages use. Pure.
 * Every student name is displayName(...) — the full name never leaves here.
 */
export function buildOmniClassFacts(input: OmniClassInputs): OmniClassFacts {
  const { classroom, attempts, studentIds } = input
  const subjectCode = classroom.subject_code
  const nameOf = (id: string) => displayName(input.fullNames.get(id) ?? null)

  // Quadrants with display names only: the metric's `name` is what gets printed.
  const shortNames = new Map(studentIds.map((id) => [id, { full_name: nameOf(id) }]))
  const quadrants = computeStudentQuadrants(attempts, studentIds, subjectCode, classroom.board ?? '', shortNames)
  const counts: Record<Quadrant, number> = { safe: 0, pacing_risk: 0, careless_risk: 0, under_prepared: 0 }
  for (const q of quadrants) counts[q.quadrant] += 1
  const atRiskMetrics = quadrants
    .filter((q) => q.quadrant !== 'safe')
    .sort(
      (a, b) =>
        RISK_ORDER.indexOf(a.quadrant) - RISK_ORDER.indexOf(b.quadrant) ||
        a.accuracy - b.accuracy ||
        a.studentId.localeCompare(b.studentId)
    )
    .slice(0, OMNI_LIMITS.atRisk)

  // The same headline figures the Gaps tab shows (ClassroomSummary).
  const summary = summarizeClassAnalytics(attempts, studentIds, subjectCode)

  const ranked = rankBlindspots(
    classBlindspots({ attempts: [...attempts], truncated: input.truncated, studentIds: [...studentIds] }, subjectCode),
    OMNI_LIMITS.blindspots
  )
  const report = buildCohortGapReport([...attempts])
  const groups = subjectCode ? buildErrorGroups([...attempts], subjectCode) : []

  const week = input.week
  return {
    kind: 'class',
    classroomId: classroom.id,
    name: clip(classroom.name, OMNI_LIMITS.titleChars),
    subject: subjectCodeLabel(subjectCode),
    yearGroup: classroom.year_group ? clip(classroom.year_group, 40) : null,
    archived: classroom.archived_at !== null,
    students: studentIds.length,
    studentsWithWork: summary.studentsWithWork,
    scripts: summary.totalAttempts,
    avgPct: summary.avgScore === null ? null : round1(summary.avgScore),
    truncated: input.truncated,
    blindspots: ranked.map((t) => ({
      code: t.code,
      name: clip(t.name, OMNI_LIMITS.titleChars),
      avgPct: Math.round(t.avgMastery),
      students: t.studentsAttempted,
      of: t.totalStudents,
      thin: t.thinEvidence,
    })),
    drillCodes: actionable(ranked)
      .slice(0, 3)
      .map((t) => t.code),
    headlineGap: headlineGapText(report),
    weakMarkTypes: report.insufficientEvidence
      ? []
      : report.markTypes.slice(0, OMNI_LIMITS.markTypes).map((t) => ({
          label: clip(t.label, 60),
          earnedPct: t.earnedPct,
          thin: t.thinEvidence,
        })),
    mostMissed: report.insufficientEvidence
      ? []
      : report.mostMissed
          .slice(0, OMNI_LIMITS.mostMissed)
          .map((m) => ({ note: clip(m.note, OMNI_LIMITS.noteChars), students: m.students })),
    groups: groups.slice(0, OMNI_LIMITS.groups).map((g) => ({
      label: clip(g.label, OMNI_LIMITS.titleChars),
      names: g.student_ids.slice(0, OMNI_LIMITS.namesPerList).map(nameOf),
      count: g.student_ids.length,
      leafCode: g.leaf_code,
      studentIds: [...g.student_ids],
    })),
    risk: {
      paceCompared: paceDivider(quadrants) !== null,
      counts,
      atRisk: atRiskMetrics.map((m) => ({
        name: m.name,
        zone: QUADRANT_META[m.quadrant].label,
        accuracyPct: Math.round(m.accuracy),
        grade: m.predictedGrade && m.predictedGrade !== '—' ? m.predictedGrade : null,
        weakest: m.biggestDeficit ? clip(m.biggestDeficit.name, OMNI_LIMITS.titleChars) : null,
      })),
      atRiskIds: atRiskMetrics.map((m) => m.studentId),
    },
    week: week
      ? {
          key: week.week,
          sets: week.assignments.slice(0, OMNI_LIMITS.sets).map((s) => ({
            title: clip(s.title, OMNI_LIMITS.titleChars),
            status: s.status,
            dueAt: s.due_at,
            handedIn: s.handed_in,
            total: s.total_students,
            late: s.late,
          })),
          submissionsThisWeek: week.submissions_delta,
          unreviewed: week.unreviewed,
          // ClassWeek names are displayName already; re-applying is idempotent and keeps the rule local.
          silent: week.silent_students
            .slice(0, OMNI_LIMITS.namesPerList)
            .map((s) => ({ name: displayName(s.display_name), days: s.days_silent })),
          struggling: week.struggling
            .slice(0, OMNI_LIMITS.namesPerList)
            .map((s) => ({ name: displayName(s.display_name), pct: Math.round(s.pct) })),
          improving: week.improving
            .slice(0, OMNI_LIMITS.namesPerList)
            .map((s) => ({ name: displayName(s.display_name), delta: Math.round(s.delta_pct) })),
          headlineGap: week.headline_gap,
        }
      : null,
  }
}

/** The desk facts, from the teacher's overview. Pure. */
export function buildOmniDeskFacts(overview: TeacherOverview): OmniDeskFacts {
  return {
    kind: 'desk',
    classes: overview.classes.slice(0, OMNI_LIMITS.classes).map((c) => ({
      id: c.id,
      name: clip(c.name, OMNI_LIMITS.titleChars),
      subject: subjectCodeLabel(c.subject_code),
      members: c.members,
      openSets: c.open_assignments,
      dueThisWeek: c.due_this_week,
      unreviewed: c.unreviewed,
      lateStudents: c.late_students,
      headlineGap: c.headline_gap,
      archived: c.archived,
    })),
    needsYou: overview.needs_you,
  }
}

// ---------------------------------------------------------------------------
// Formatting
// ---------------------------------------------------------------------------

function names(list: readonly string[], total: number): string {
  if (list.length === 0) return 'none'
  const more = total - list.length
  return more > 0 ? `${list.join(', ')} and ${more} more` : list.join(', ')
}

function day(iso: string | null): string {
  if (!iso) return 'no deadline'
  const ms = Date.parse(iso)
  return Number.isFinite(ms) ? new Date(ms).toISOString().slice(0, 10) : 'no deadline'
}

const VIEW_FOCUS: Record<TeacherOmniView, string> = {
  desk: 'their desk (every class)',
  week: "this class's week",
  sets: "this class's sets",
  students: "this class's roster",
  student: "one student's record in this class (the student is not identified to you — ask the teacher who, and use the class data)",
  gaps: "this class's gap report",
  reviews: 'their review inbox',
  settings: "this class's settings",
}

/** The data block (fenced by the system prompt). Plain lines; every name is a displayName. */
export function formatOmniFacts(facts: OmniTeacherFacts): string {
  if (facts.kind === 'desk') {
    const lines = [
      `Classes: ${facts.classes.length}`,
      `Needs attention: ${facts.needsYou.unreviewed} scripts to review, ${facts.needsYou.late_students} students late on a set, ${facts.needsYou.silent_classes} quiet classes`,
    ]
    facts.classes.forEach((c, i) => {
      lines.push(
        `${i + 1}. ${c.name} (${c.subject}${c.archived ? ', archived' : ''}) — ${c.members} students, ${c.openSets} open sets, ${c.dueThisWeek} due this week, ${c.unreviewed} to review, ${c.lateStudents} late${c.headlineGap ? `; weakest: ${c.headlineGap}` : ''}`
      )
    })
    return lines.join('\n')
  }

  const f = facts
  const lines: string[] = [
    `Class: ${f.name} — ${f.subject}${f.yearGroup ? `, ${f.yearGroup}` : ''}${f.archived ? ' (archived: no live work is read)' : ''}`,
    `Students: ${f.students} active; ${f.studentsWithWork} with marked work in this subject since joining`,
    `Marked scripts: ${f.scripts}${f.truncated ? ' (the most recent only)' : ''}; class average ${f.avgPct === null ? 'unknown (nothing marked yet)' : `${f.avgPct}%`}`,
  ]
  lines.push(
    f.blindspots.length > 0
      ? `Weakest syllabus topics: ${f.blindspots
          .map((b) => `${b.name} (${b.code}) ${b.avgPct}% across ${b.students} of ${b.of} students${b.thin ? ', too few to act on yet' : ''}`)
          .join('; ')}`
      : 'Weakest syllabus topics: none with enough marked work yet'
  )
  if (f.headlineGap) lines.push(`Weakest kind of mark: ${f.headlineGap}`)
  if (f.weakMarkTypes.length > 0) {
    lines.push(
      `Mark types, weakest first: ${f.weakMarkTypes.map((t) => `${t.label} ${t.earnedPct}%${t.thin ? ' (thin evidence)' : ''}`).join('; ')}`
    )
  }
  if (f.mostMissed.length > 0) {
    lines.push(`Points most students missed (marker's notes): ${f.mostMissed.map((m) => `"${m.note}" (${m.students} students)`).join('; ')}`)
  }
  lines.push(
    f.groups.length > 0
      ? `Shared mistakes: ${f.groups.map((g, i) => `group ${i + 1}: ${g.label} — ${names(g.names, g.count)}`).join('; ')}`
      : 'Shared mistakes: none yet'
  )
  const c = f.risk.counts
  lines.push(
    f.risk.paceCompared
      ? `Risk matrix: ${c.safe} safe, ${c.pacing_risk} pacing risk, ${c.careless_risk} careless risk, ${c.under_prepared} under-prepared`
      : `Risk matrix (by accuracy only — too few timed students to compare pace): ${c.safe} accurate, ${c.under_prepared} under-prepared`
  )
  if (f.risk.atRisk.length > 0) {
    lines.push(
      `Most at risk: ${f.risk.atRisk
        .map((s) => `${s.name} (${s.zone}, ${s.accuracyPct}%${s.grade ? `, predicted ${s.grade}` : ''}${s.weakest ? `, weakest on ${s.weakest}` : ''})`)
        .join('; ')}`
    )
  }
  if (f.week) {
    const w = f.week
    lines.push(
      w.sets.length > 0
        ? `Sets live this week (${w.key}): ${w.sets
            .map((s) => `"${s.title}" ${s.status}, due ${day(s.dueAt)}, ${s.handedIn}/${s.total} handed in${s.late > 0 ? `, ${s.late} late` : ''}`)
            .join('; ')}`
        : `Sets live this week (${w.key}): none`
    )
    lines.push(`Hand-ins this week: ${w.submissionsThisWeek}; scripts waiting for your review: ${w.unreviewed}`)
    if (w.headlineGap) lines.push(`Last closed set's weakest kind of mark: ${w.headlineGap}`)
    lines.push(`Quiet for 14+ days: ${names(w.silent.map((s) => `${s.name} (${s.days} days)`), w.silent.length)}`)
    lines.push(`Under 40% on the last set: ${names(w.struggling.map((s) => `${s.name} (${s.pct}%)`), w.struggling.length)}`)
    lines.push(`Improving: ${names(w.improving.map((s) => `${s.name} (+${s.delta} points)`), w.improving.length)}`)
  }
  return lines.join('\n')
}

// ---------------------------------------------------------------------------
// Links the assistant may offer
// ---------------------------------------------------------------------------

export type OmniTeacherLink = { label: string; href: string }

/** Codes that are safe to put in a link label outside the data fence: syllabus codes only. */
const CODE_RE = /^[A-Za-z0-9][A-Za-z0-9.\-]{0,23}$/

function link(label: string, href: string): OmniTeacherLink | null {
  const safe = teacherCtaHref(href)
  return safe ? { label, href: safe } : null
}

/**
 * The links for this view, labelled in our own words (never with a class,
 * set or student name — those are data). Each passes teacherCtaHref; one
 * that would not (too long, say) is left out rather than shortened.
 */
export function omniTeacherLinks(facts: OmniTeacherFacts): OmniTeacherLink[] {
  const out: Array<OmniTeacherLink | null> = []
  if (facts.kind === 'desk') {
    out.push(link('Your desk', '/teacher/dashboard'))
    out.push(link('Scripts waiting for review, every class', '/teacher/reviews'))
    facts.classes.forEach((c, i) => {
      if (isUuid(c.id)) out.push(link(`Class ${i + 1} in the list`, classHref(c.id)))
    })
    return out.filter((l): l is OmniTeacherLink => l !== null)
  }

  const id = facts.classroomId
  const enc = encodeURIComponent
  out.push(link("This class's week", classHref(id)))
  out.push(link("This class's gap report", `/teacher/classroom/${enc(id)}/gaps`))
  out.push(link("This class's roster", `/teacher/classroom/${enc(id)}/students`))
  out.push(link("This class's scripts waiting for review", reviewsHref(id)))
  if (!facts.archived) {
    out.push(link("This class's sets", setsHref(id)))
    out.push(link('Set new work for the class', composerHref(id)))
    const codes = facts.drillCodes.filter((code) => CODE_RE.test(code))
    if (codes.length > 0) {
      out.push(
        link(
          `Set a drill on the weakest topics (${codes.join(', ')})`,
          composerHref(id, { source: 'blindspot', codes })
        )
      )
    }
    if (facts.risk.atRiskIds.length > 0) {
      out.push(
        link('Set work for the most-at-risk students listed above', composerHref(id, { students: facts.risk.atRiskIds }))
      )
    }
    facts.groups.forEach((g, i) => {
      const leaf = g.leafCode && CODE_RE.test(g.leafCode) ? [g.leafCode] : []
      out.push(
        link(
          `Set a drill for shared-mistake group ${i + 1}`,
          composerHref(id, { source: 'error_group', students: g.studentIds, codes: leaf })
        )
      )
    })
  }
  return out.filter((l): l is OmniTeacherLink => l !== null)
}

// ---------------------------------------------------------------------------
// Loading, then the whole context
// ---------------------------------------------------------------------------

export type OmniTeacherContext = {
  view: TeacherOmniView
  /** What the teacher is looking at, in words, for the prompt. */
  focus: string
  /** False when the class (or desk) could not be read; the prompt then says so. */
  loaded: boolean
  /** The data block, for a fence. Empty when not loaded. */
  data: string
  links: OmniTeacherLink[]
}

export type OmniTeacherLoaders = {
  classInputs(
    supabase: SupabaseClient,
    admin: SupabaseClient,
    classroom: TeacherClassroomRow
  ): Promise<OmniClassInputs>
  overview(supabase: SupabaseClient, teacherId: string): Promise<TeacherOverview>
}

/** The real loaders: the class pages' own reads, through the teacher's RLS client. */
export const DEFAULT_OMNI_TEACHER_LOADERS: OmniTeacherLoaders = {
  async classInputs(supabase, admin, classroom) {
    const [scoped, week] = await Promise.all([
      loadScopedClass(supabase, admin, classroom, { withMarking: true, limit: OMNI_LIMITS.attempts }),
      // The week is context, not the point: without it the prompt still has the class.
      loadClassWeek(supabase, classroom.id, { admin }).catch((err: unknown) => {
        console.error('[omni-ai/teacher] class week failed:', err instanceof Error ? err.message : err)
        return null
      }),
    ])
    const profiles = scoped.studentIds.length > 0 ? await getStudentProfiles(supabase, scoped.studentIds) : new Map()
    const fullNames = new Map<string, string | null>()
    for (const [sid, p] of profiles) fullNames.set(sid, p.full_name)
    return {
      classroom,
      attempts: scoped.attempts,
      studentIds: scoped.studentIds,
      truncated: scoped.truncated,
      fullNames,
      week,
    }
  },
  overview: (supabase, teacherId) => loadTeacherOverview(supabase, teacherId),
}

/**
 * The teacher context for one Omni message: loads the class (or the desk)
 * for an address authorizeTeacherOmni has already approved, and formats it.
 * Never throws — a failed read yields `loaded: false`, so a message that has
 * already been metered still gets an honest answer rather than a 500.
 */
export async function buildOmniClassContext(
  input: {
    supabase: SupabaseClient
    /** Service client; the caller has proven ownership of `classroom`. */
    admin: SupabaseClient
    teacherId: string
    address: TeacherOmniAddress
    /** The owned classroom for a class view, or null for the desk / inbox. */
    classroom: TeacherClassroomRow | null
  },
  loaders: OmniTeacherLoaders = DEFAULT_OMNI_TEACHER_LOADERS
): Promise<OmniTeacherContext> {
  const { address, classroom } = input
  try {
    const facts: OmniTeacherFacts =
      classroom && address.classroomId === classroom.id
        ? buildOmniClassFacts(await loaders.classInputs(input.supabase, input.admin, classroom))
        : buildOmniDeskFacts(await loaders.overview(input.supabase, input.teacherId))
    return {
      view: address.view,
      focus: VIEW_FOCUS[address.view],
      loaded: true,
      data: formatOmniFacts(facts),
      links: omniTeacherLinks(facts),
    }
  } catch (err) {
    console.error('[omni-ai/teacher] context failed:', err instanceof Error ? err.message : err)
    const fallback = link('Your desk', '/teacher/dashboard')
    return { view: address.view, focus: VIEW_FOCUS[address.view], loaded: false, data: '', links: fallback ? [fallback] : [] }
  }
}
