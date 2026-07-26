import 'server-only'
import { cache } from 'react'
import { createServiceClient } from '@/lib/supabase-server'
import {
  candidateComponentKeys,
  resolveComponent,
  sortBands,
  type Criterion,
} from '@/lib/courses/criterion-ladder'

export type CriterionLadderData = {
  componentLabel: string
  maxMarks: number | null
  criteria: Criterion[]
}

/**
 * The criteria a lesson's component is marked against, verbatim from the IB
 * guide (ib_criterion / ib_criterion_band).
 *
 * `cache()` dedupes within a render pass, so the ~60 statically-generated pages
 * that share a component each cost one query at most rather than one per page.
 *
 * Everything is best-effort: a missing table, a subject with no criteria loaded,
 * or a DB blip returns null and the lesson simply renders without the ladder.
 * Course pages are prerendered and must not fail to build over an optional
 * enrichment.
 */
export const getCriterionLadder = cache(
  async (
    courseSubjectSlug: string,
    paper: string | undefined | null
  ): Promise<CriterionLadderData | null> => {
    const ref = resolveComponent(courseSubjectSlug, paper)
    if (!ref) return null

    try {
      const admin = createServiceClient()
      const keys = candidateComponentKeys(ref)

      const { data: components } = await admin
        .from('ib_component')
        .select('id, component_key, label, level, max_marks')
        .eq('subject_code', ref.subjectCode)
        .in('component_key', keys)

      // Prefer the level-specific component; fall back to one marked 'both'.
      // Ordered by the candidate list so an HL student never gets the SL rubric.
      let chosen: { id: string; label: string; max_marks: number | null } | null = null
      for (const key of keys) {
        const match = (components ?? []).find(
          (c) => c.component_key === key && (c.level === ref.level || c.level === 'both')
        )
        if (match) {
          chosen = { id: match.id, label: match.label, max_marks: match.max_marks }
          break
        }
      }
      if (!chosen) return null

      const { data: criteria } = await admin
        .from('ib_criterion')
        .select('id, letter, name, max_marks, ordinal')
        .eq('component_id', chosen.id)
        .order('ordinal', { ascending: true })

      if (!criteria?.length) return null

      const { data: bands } = await admin
        .from('ib_criterion_band')
        .select('criterion_id, marks_min, marks_max, descriptor')
        .in(
          'criterion_id',
          criteria.map((c) => c.id)
        )

      const byCriterion = new Map<string, Criterion['bands']>()
      for (const b of bands ?? []) {
        const list = byCriterion.get(b.criterion_id) ?? []
        list.push({
          marksMin: b.marks_min,
          marksMax: b.marks_max,
          descriptor: b.descriptor,
        })
        byCriterion.set(b.criterion_id, list)
      }

      const shaped: Criterion[] = criteria
        .map((c) => ({
          letter: c.letter,
          name: c.name,
          maxMarks: c.max_marks,
          bands: sortBands(byCriterion.get(c.id) ?? []),
        }))
        .filter((c) => c.bands.length > 0)

      if (!shaped.length) return null

      return {
        componentLabel: chosen.label,
        maxMarks: chosen.max_marks,
        criteria: shaped,
      }
    } catch (err) {
      console.error('[criterion-ladder] lookup failed:', err)
      return null
    }
  }
)
