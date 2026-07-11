/**
 * IB assessment catalog — READ-ONLY accessor over the ib_* tables
 * (see supabase/migrations/20260701_ib_assessment_catalog.sql).
 *
 * M0 scaffolding. NOTHING in the marking path imports this yet — wiring happens
 * in M1 (see IB_MARKING_BUILD_PLAN.md Part C). Service-role only; these tables
 * are RLS-locked to the service role.
 *
 * Two-field text model: `descriptor` is the VERBATIM authoritative, student-facing,
 * cited text. `marking_guidance` (nullable) is the optional operational rendering
 * assembled into the marking prompt. `rubricText()` prefers marking_guidance when
 * present and falls back to the verbatim descriptor.
 */
import { createAdminClient } from '@/lib/supabase-admin'
import type { ResolvedIbComponent } from '@/lib/marking/types'

export type IbAssessmentModel = 'points' | 'criteria'
export type IbComponentLevel = 'HL' | 'SL' | 'both'
export type IbSelectableLevel = 'HL' | 'SL'

export type IbSubjectRow = {
  code: string
  name: string
  subject_group: string
  level_scope: 'HL_SL' | 'HL_only' | 'SL_only' | 'Core'
  guide_version: string
  first_assessment_year: number | null
  source_document_id: string | null
}

export type IbComponentRow = {
  id: string
  subject_code: string
  component_key: string
  label: string
  level: IbComponentLevel
  assessment_model: IbAssessmentModel
  response_format: string | null
  max_marks: number | null
  source_document_id: string | null
}

export type IbCriterionBandRow = {
  id: string
  criterion_id: string
  marks_min: number
  marks_max: number
  descriptor: string
  marking_guidance: string | null
  source_document_id: string | null
  source_pages: number[] | null
}

export type IbCriterionRow = {
  id: string
  component_id: string
  letter: string
  name: string
  max_marks: number
  ordinal: number
  guidance_notes: string | null
  marking_guidance: string | null
  source_document_id: string | null
  source_pages: number[] | null
  bands: IbCriterionBandRow[]
}

export type IbPointsSchemeRow = {
  id: string
  component_id: string
  paper_ref: string | null
  marks: unknown
  accept_alternatives: unknown
  ecf_rules: unknown
  marking_guidance: unknown
  source_document_id: string | null
  source_pages: number[] | null
  /** Only true schemes mark a student (human-QA gate). Optional: the column may
   * not exist yet in some environments, in which case it reads as undefined. */
  verified?: boolean
}

/** A component's level as stored ('both') matches a student's HL or SL selection. */
function levelMatches(componentLevel: IbComponentLevel, want: IbSelectableLevel): boolean {
  return componentLevel === 'both' || componentLevel === want
}

/** All catalogued subjects (for the selection UI). */
export async function listSubjects(): Promise<IbSubjectRow[]> {
  const db = createAdminClient()
  const { data, error } = await db.from('ib_subject').select('*').order('name')
  if (error) throw error
  return (data as IbSubjectRow[]) ?? []
}

/** Every component for a subject, all levels (for the selection UI). */
export async function listAllComponents(subjectCode: string): Promise<IbComponentRow[]> {
  const db = createAdminClient()
  const { data, error } = await db
    .from('ib_component')
    .select('*')
    .eq('subject_code', subjectCode)
  if (error) throw error
  return (data as IbComponentRow[]) ?? []
}

export async function getSubject(code: string): Promise<IbSubjectRow | null> {
  const db = createAdminClient()
  const { data, error } = await db.from('ib_subject').select('*').eq('code', code).maybeSingle()
  if (error) throw error
  return (data as IbSubjectRow) ?? null
}

/** Components offered for a subject at the given level (includes level='both'). */
export async function listComponents(
  subjectCode: string,
  level: IbSelectableLevel
): Promise<IbComponentRow[]> {
  const db = createAdminClient()
  const { data, error } = await db
    .from('ib_component')
    .select('*')
    .eq('subject_code', subjectCode)
  if (error) throw error
  return ((data as IbComponentRow[]) ?? []).filter((c) => levelMatches(c.level, level))
}

export async function getComponent(
  subjectCode: string,
  level: IbSelectableLevel,
  componentKey: string
): Promise<IbComponentRow | null> {
  const components = await listComponents(subjectCode, level)
  return components.find((c) => c.component_key === componentKey) ?? null
}

/** Criteria (with bands) for a criteria-model component, ordered by ordinal / marks. */
export async function getCriteria(componentId: string): Promise<IbCriterionRow[]> {
  const db = createAdminClient()
  const { data: criteria, error } = await db
    .from('ib_criterion')
    .select('*')
    .eq('component_id', componentId)
    .order('ordinal', { ascending: true })
  if (error) throw error
  const rows = (criteria as Omit<IbCriterionRow, 'bands'>[]) ?? []
  if (rows.length === 0) return []

  const { data: bands, error: bandErr } = await db
    .from('ib_criterion_band')
    .select('*')
    .in('criterion_id', rows.map((r) => r.id))
    .order('marks_min', { ascending: true })
  if (bandErr) throw bandErr

  const byCriterion = new Map<string, IbCriterionBandRow[]>()
  for (const b of (bands as IbCriterionBandRow[]) ?? []) {
    const list = byCriterion.get(b.criterion_id) ?? []
    list.push(b)
    byCriterion.set(b.criterion_id, list)
  }
  return rows.map((r) => ({ ...r, bands: byCriterion.get(r.id) ?? [] }))
}

export async function getPointsScheme(componentId: string): Promise<IbPointsSchemeRow[]> {
  const db = createAdminClient()
  const { data, error } = await db
    .from('ib_points_scheme')
    .select('*')
    .eq('component_id', componentId)
  if (error) throw error
  return (data as IbPointsSchemeRow[]) ?? []
}

/** Distinct ingested + VERIFIED papers (sessions/timezones) for a points component,
 * for the /mark paper picker. Empty for components with no verified scheme. */
export async function listVerifiedPapers(
  componentId: string
): Promise<Array<{ ref: string; label: string }>> {
  const schemes = await getPointsScheme(componentId)
  return distinctPapers(schemes.filter((s) => s.verified === true)).map((p) => ({
    ref: p.ref,
    label: p.label,
  }))
}

/**
 * Text the marking prompt should mark against: prefer the optional operational
 * `marking_guidance`, fall back to the VERBATIM authoritative `descriptor`.
 * The verbatim descriptor remains the source of truth for student-facing citation.
 */
export function rubricText(band: Pick<IbCriterionBandRow, 'descriptor' | 'marking_guidance'>): string {
  return band.marking_guidance?.trim() || band.descriptor
}

/**
 * Legacy IB practice codes bake level into the code ('ib-maths-aa-hl'); catalog
 * subject codes are level-agnostic ('ib-maths-aa'). Split one into the other.
 */
export function splitLegacyIbCode(code: string): {
  subjectCode: string
  level: IbSelectableLevel | null
} {
  const m = code.match(/^(.*)-(hl|sl)$/i)
  if (m) return { subjectCode: m[1], level: m[2].toUpperCase() as IbSelectableLevel }
  return { subjectCode: code, level: null }
}

function readGeneral(v: unknown): string | undefined {
  if (v && typeof v === 'object' && 'general' in v) {
    const g = (v as { general?: unknown }).general
    return typeof g === 'string' ? g : undefined
  }
  return undefined
}

/**
 * Resolve a catalog component into the DB-free `ResolvedIbComponent` view the
 * marking prompt consumes. Returns null when the component is not catalogued
 * (caller then falls back to existing behavior). M1 populates the `points`
 * shape; `criteria` is carried for M3.
 */
/** Normalise a question label for matching: "Q1", "1 (a)", "1(a)(i)" → "1". */
export function normalizeIbQuestionNumber(q: string): string {
  const m = q.trim().toLowerCase().replace(/^q\s*/, '').match(/^\d+/)
  return m ? m[0] : q.trim().toLowerCase().replace(/[^0-9a-z]/g, '')
}

/** The question a points-scheme row belongs to (from its `marks.question`). */
function schemeQuestionNumber(marks: unknown): string | null {
  if (marks && typeof marks === 'object' && 'question' in marks) {
    const q = (marks as { question?: unknown }).question
    return q == null ? null : String(q).trim()
  }
  return null
}

/** The base paper reference of a stored row: strip the trailing " Q<n>" question suffix.
 * `"N21/5/MATHX/SP1/ENG/TZ0/XX/M Q5"` -> `"N21/5/MATHX/SP1/ENG/TZ0/XX/M"`. */
export function schemeBasePaperRef(paperRef: string | null | undefined): string | null {
  if (!paperRef) return null
  return paperRef.replace(/\s+Q\s*\d+\s*$/i, '').trim() || null
}

/** Parse an IB paper reference into human-facing parts for a picker. Best-effort:
 * unknown formats fall back to the raw ref as the label. Format example:
 * `N21/5/MATHX/SP1/ENG/TZ1/XX/M` -> Nov 2021, Paper 1, TZ1. */
export function parseIbPaperRef(
  ref: string
): { ref: string; label: string; session?: string; year?: number; timezone?: string } {
  const base = schemeBasePaperRef(ref) ?? ref
  const segs = base.split('/')
  const head = segs[0]?.trim().toUpperCase() ?? ''
  const sessionLetter = head[0]
  const yy = head.slice(1).match(/^\d{2}/)?.[0]
  const session = sessionLetter === 'N' ? 'November' : sessionLetter === 'M' ? 'May' : undefined
  const year = yy ? 2000 + parseInt(yy, 10) : undefined
  const paperSeg = segs.find((s) => /P\d/i.test(s))
  const paperNo = paperSeg?.match(/P(\d)/i)?.[1]
  const tz = segs.find((s) => /^TZ\d/i.test(s.trim()))?.trim().toUpperCase()
  const parts: string[] = []
  if (session && year) parts.push(`${session} ${year}`)
  if (paperNo) parts.push(`Paper ${paperNo}`)
  if (tz && tz !== 'TZ0') parts.push(tz)
  const label = parts.length ? parts.join(' · ') : base
  return { ref: base, label, session, year, timezone: tz }
}

/** Build a { normalisedQuestion -> official markpoints } map for a points component. */
function schemesByQuestion(
  schemes: IbPointsSchemeRow[]
): Record<string, unknown> {
  const map: Record<string, unknown> = {}
  for (const s of schemes) {
    const q = schemeQuestionNumber(s.marks)
    if (q) map[normalizeIbQuestionNumber(q)] = s.marks
  }
  return map
}

/** Distinct papers among verified schemes, most-recent-ish first (stable by ref). */
function distinctPapers(schemes: IbPointsSchemeRow[]) {
  const seen = new Map<string, ReturnType<typeof parseIbPaperRef>>()
  for (const s of schemes) {
    const base = schemeBasePaperRef(s.paper_ref)
    if (base && !seen.has(base)) seen.set(base, parseIbPaperRef(base))
  }
  return [...seen.values()].sort((a, b) => a.ref.localeCompare(b.ref))
}

export async function resolveComponentForMarking(
  subjectCode: string,
  level: IbSelectableLevel,
  componentKey: string,
  /** When given, the official scheme for THIS question (if ingested) is attached
   * as `officialScheme`; the full per-question map is always attached so callers
   * marking several questions can pick per question. */
  questionNumber?: string | null,
  /** The exact paper (session/timezone) the script is from, e.g.
   * `"M21/5/MATHX/SP1/ENG/TZ1/XX/M"`. Required to disambiguate once more than one
   * paper is ingested for a component — otherwise the official scheme is withheld. */
  paperRef?: string | null
): Promise<ResolvedIbComponent | null> {
  const component = await getComponent(subjectCode, level, componentKey)
  if (!component) return null
  const subject = await getSubject(subjectCode)

  const base: ResolvedIbComponent = {
    subjectName: subject?.name ?? subjectCode,
    componentLabel: component.label,
    level,
    assessmentModel: component.assessment_model,
    maxMarks: component.max_marks,
  }

  if (component.assessment_model === 'points') {
    const schemes = await getPointsScheme(component.id)
    // Only VERIFIED (human-QA'd) schemes may mark a student — an inaccurate
    // ingested scheme marks worse than the derive fallback. A missing `verified`
    // column (migration not yet applied) reads as unverified → derive fallback.
    const verified = schemes.filter((s) => s.verified === true)
    const availablePapers = distinctPapers(verified)

    // Which paper's schemes may we ground on? Only one, unambiguously:
    //   - an explicit paperRef → that paper (if we have it);
    //   - exactly one ingested paper → that one;
    //   - several papers and no paperRef → NONE (ambiguous: Q1 of paper A must
    //     never be marked with Q1 of paper B). Caller prompts with availablePapers.
    const wantRef = schemeBasePaperRef(paperRef)
    let selected: IbPointsSchemeRow[] = []
    if (wantRef) {
      selected = verified.filter((s) => schemeBasePaperRef(s.paper_ref) === wantRef)
    } else if (availablePapers.length === 1) {
      selected = verified
    } // else: ambiguous → selected stays empty → no official scheme, fall back to derive

    const byQuestion = schemesByQuestion(selected)
    const conventionSource = selected[0] ?? schemes[0]
    // Only attach an official scheme for a question we actually matched — never a
    // different question's markpoints (that would mark worse than the fallback).
    const matched =
      questionNumber != null
        ? byQuestion[normalizeIbQuestionNumber(questionNumber)] ?? null
        : null
    return {
      ...base,
      pointsConventions: {
        accept: readGeneral(conventionSource?.accept_alternatives),
        ecf: readGeneral(conventionSource?.ecf_rules),
      },
      officialScheme: matched,
      officialSchemesByQuestion: byQuestion,
      availablePapers,
    }
  }

  const criteria = await getCriteria(component.id)
  return {
    ...base,
    criteria: criteria.map((c) => ({
      letter: c.letter,
      name: c.name,
      maxMarks: c.max_marks,
      guidance: c.guidance_notes ?? undefined,
      markingGuidance: c.marking_guidance ?? undefined,
      bands: c.bands.map((b) => ({
        min: b.marks_min,
        max: b.marks_max,
        descriptor: b.descriptor,
        guidance: b.marking_guidance ?? undefined,
      })),
    })),
  }
}
