import type { ComponentType } from 'react'
import { PsychResearchDiagram } from '@/components/diagrams/PsychResearchDiagram'
import { PsychHealthDiagram } from '@/components/diagrams/PsychHealthDiagram'
import { PsychStressDiagram } from '@/components/diagrams/PsychStressDiagram'
import { PsychPainDiagram } from '@/components/diagrams/PsychPainDiagram'
import { PsychRetailDiagram } from '@/components/diagrams/PsychRetailDiagram'
import { PsychWorkEnvDiagram } from '@/components/diagrams/PsychWorkEnvDiagram'
import { PsychSatisfactionDiagram } from '@/components/diagrams/PsychSatisfactionDiagram'
import type { LessonDiagramComponentProps } from '@/components/diagrams/diagram-props'
import { getLessonDiagramSpec, stepStateFor } from '@/lib/courses/diagram-specs'

export const metadata = {
  title: 'Step-animation (psychology) — dev',
  robots: { index: false, follow: false },
}

const ITEMS: { name: string; slug: string; Component: ComponentType<LessonDiagramComponentProps> }[] = [
  { name: 'Research methods (IV/DV)', slug: '1-2-research-methods', Component: PsychResearchDiagram },
  { name: 'Health belief model', slug: '3-1-the-health-belief-model', Component: PsychHealthDiagram },
  { name: 'GAS (sources of stress)', slug: '3-4-1-sources-of-stress', Component: PsychStressDiagram },
  { name: 'Gate control (pain)', slug: '3-3-1-types-and-theories-of-pain', Component: PsychPainDiagram },
  { name: 'Retail environment', slug: '2-2-the-physical-environment', Component: PsychRetailDiagram },
  { name: 'Work conditions', slug: '4-4-1-physical-work-conditions', Component: PsychWorkEnvDiagram },
  { name: 'Job satisfaction (Herzberg)', slug: '4-5-1-theories-of-job-satisfaction', Component: PsychSatisfactionDiagram },
]

export default function StepAnimPsychDevPage() {
  return (
    <main style={{ maxWidth: 1160, margin: '0 auto', padding: '32px 20px 80px' }}>
      <p className="ec-label-tech" style={{ marginBottom: 6 }}>
        DEV PREVIEW · STEP ANIMATION · PSYCHOLOGY
      </p>
      <h1 className="ms-h2" style={{ marginBottom: 20 }}>
        Psychology cluster — newly animated
      </h1>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        {ITEMS.map(({ name, slug, Component }) => {
          const spec = getLessonDiagramSpec(slug)
          const steps = spec?.steps ?? []
          return (
            <section key={slug}>
              <p className="ec-label-tech" style={{ marginBottom: 8 }}>
                {name} — {steps.length} steps
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: `repeat(${steps.length}, minmax(0, 1fr))`, gap: 14 }}>
                {steps.map((_, i) => (
                  <figure key={i} className="ec-card" style={{ padding: 10, margin: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <span className="ec-label-tech">STEP {i + 1}</span>
                    <div style={{ background: 'var(--ec-surface)', borderRadius: 8, padding: 4 }}>
                      <Component lessonSlug={slug} stepIndex={i} />
                    </div>
                    <figcaption style={{ fontSize: 11, color: 'var(--ec-text-secondary)', lineHeight: 1.35 }}>
                      {stepStateFor(spec, i)?.caption}
                    </figcaption>
                  </figure>
                ))}
              </div>
            </section>
          )
        })}
      </div>
    </main>
  )
}
