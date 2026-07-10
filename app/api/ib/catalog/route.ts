import { NextResponse } from 'next/server'
import {
  listSubjects,
  listAllComponents,
  listVerifiedPapers,
} from '@/lib/ib/assessment-catalog'

/**
 * Catalogued IB subjects + components for the /mark selection UI.
 * Returns only non-sensitive metadata (codes, labels, level, model, max_marks) —
 * NOT the verbatim licensed descriptors/prose. Service-role read behind the API.
 */
export async function GET() {
  try {
    const subjects = await listSubjects()
    const withComponents = await Promise.all(
      subjects.map(async (s) => {
        const components = await listAllComponents(s.code)
        const mapped = await Promise.all(
          components.map(async (c) => ({
            component_key: c.component_key,
            label: c.label,
            level: c.level,
            assessment_model: c.assessment_model,
            max_marks: c.max_marks,
            // Ingested official papers (session/timezone) — only points components
            // have any; drives the paper picker so we ground on the right paper.
            papers:
              c.assessment_model === 'points'
                ? await listVerifiedPapers(c.id)
                : [],
          }))
        )
        return {
          code: s.code,
          name: s.name,
          level_scope: s.level_scope,
          components: mapped.sort((a, b) => a.label.localeCompare(b.label)),
        }
      })
    )
    return NextResponse.json({ subjects: withComponents })
  } catch (err) {
    console.error('[api/ib/catalog] failed', err)
    return NextResponse.json({ subjects: [] }, { status: 200 })
  }
}
