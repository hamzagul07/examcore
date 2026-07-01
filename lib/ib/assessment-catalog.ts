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
export async function resolveComponentForMarking(
  subjectCode: string,
  level: IbSelectableLevel,
  componentKey: string
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
    const first = schemes[0]
    return {
      ...base,
      pointsConventions: {
        accept: readGeneral(first?.accept_alternatives),
        ecf: readGeneral(first?.ecf_rules),
      },
      officialScheme: null,
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
