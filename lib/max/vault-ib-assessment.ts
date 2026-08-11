import 'server-only'

import {
  getCriteria,
  listComponents,
  splitLegacyIbCode,
  type IbSelectableLevel,
} from '@/lib/ib/assessment-catalog'

/**
 * How an IB subject is actually assessed, for the Vault desk.
 *
 * IB work is criterion-marked and the Vault showed none of it, which made an IB
 * desk a Cambridge desk in disguise: raw marks and papers, no route to the
 * criteria the work is judged against. The internal assessment is usually the
 * largest single thing a student still controls once exams are over, and it is
 * marked on criteria they mostly have not read.
 *
 * Deliberately structure and weights only — criterion letters, names and mark
 * allocations — never the verbatim band descriptors. Those are IB's wording and
 * the same copyright posture applies as to verbatim mark schemes; the useful
 * part for planning is which criterion carries the marks, which is fact.
 */

export type VaultIbCriterion = {
  letter: string
  name: string
  maxMarks: number
  /** How many bands the criterion is split into — a proxy for how granular it is. */
  bandCount: number
  /** Share of the component's marks, 0–1. */
  share: number
}

export type VaultIbComponent = {
  key: string
  label: string
  model: 'points' | 'criteria'
  maxMarks: number | null
  criteria: VaultIbCriterion[]
}

export type VaultIbAssessment = {
  level: IbSelectableLevel
  components: VaultIbComponent[]
  /** The criterion-marked component carrying the most marks, if any. */
  headline: VaultIbComponent | null
}

/**
 * Returns null for anything that is not a catalogued IB subject, so callers can
 * treat "not IB" and "no data yet" identically and simply render nothing.
 */
export async function loadVaultIbAssessment(
  profileSubjectCode: string
): Promise<VaultIbAssessment | null> {
  if (!profileSubjectCode.startsWith('ib-')) return null

  const { subjectCode, level } = splitLegacyIbCode(profileSubjectCode)
  // Without a level suffix we cannot tell HL components from SL ones, and
  // showing both would misstate the paper count and the totals.
  if (!level) return null

  let rows
  try {
    rows = await listComponents(subjectCode, level)
  } catch {
    return null
  }
  if (!rows.length) return null

  const components: VaultIbComponent[] = []
  for (const row of rows) {
    let criteria: VaultIbCriterion[] = []
    if (row.assessment_model === 'criteria') {
      try {
        const raw = await getCriteria(row.id)
        const total = raw.reduce((s, c) => s + (c.max_marks || 0), 0)
        criteria = raw.map((c) => ({
          letter: c.letter,
          name: c.name,
          maxMarks: c.max_marks,
          bandCount: c.bands?.length ?? 0,
          share: total > 0 ? c.max_marks / total : 0,
        }))
      } catch {
        criteria = []
      }
    }
    components.push({
      key: row.component_key,
      label: row.label,
      model: row.assessment_model,
      maxMarks: row.max_marks,
      criteria,
    })
  }

  components.sort((a, b) => (b.maxMarks ?? 0) - (a.maxMarks ?? 0))

  const headline =
    components
      .filter((c) => c.model === 'criteria' && c.criteria.length > 0)
      .sort((a, b) => (b.maxMarks ?? 0) - (a.maxMarks ?? 0))[0] ?? null

  return { level, components, headline }
}
