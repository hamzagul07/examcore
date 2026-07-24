import type { ComponentType } from 'react'
import { PsychDsmDiagram } from '@/components/diagrams/PsychDsmDiagram'
import { PsychDiathesisDiagram } from '@/components/diagrams/PsychDiathesisDiagram'
import { PsychTreatmentDiagram } from '@/components/diagrams/PsychTreatmentDiagram'
import { BioRespirationDiagram } from '@/components/diagrams/BioRespirationDiagram'
import type { LessonDiagramComponentProps } from '@/components/diagrams/diagram-props'
import { getLessonDiagramSpec, stepStateFor } from '@/lib/courses/diagram-specs'

export const metadata = {
  title: 'Step-animation — dev',
  robots: { index: false, follow: false },
}

const ITEMS: { name: string; slug: string; Component: ComponentType<LessonDiagramComponentProps> }[] = [
  { name: 'Diagnostic criteria (DSM)', slug: '1-1-1-diagnostic-criteria-for-schizophrenia', Component: PsychDsmDiagram },
  { name: 'Diathesis–stress', slug: '1-1-2-explanations-of-schizophrenia', Component: PsychDiathesisDiagram },
  { name: 'Treatment', slug: '1-1-3-treatment-and-management-of-schizophrenia', Component: PsychTreatmentDiagram },
  { name: 'Respiration', slug: '12-2-respiration', Component: BioRespirationDiagram },
]

export default function StepAnimDevPage() {
  return (
    <main style={{ maxWidth: 1160, margin: '0 auto', padding: '32px 20px 80px' }}>
      <p className="ec-label-tech" style={{ marginBottom: 6 }}>
        DEV PREVIEW · STEP ANIMATION
      </p>
      <h1 className="ms-h2" style={{ marginBottom: 4 }}>
        Newly-animated diagrams
      </h1>
      <p style={{ color: 'var(--ec-text-secondary)', marginBottom: 24, fontSize: 14 }}>
        Each row is one diagram across its walkthrough steps — layers reveal
        cumulatively where before they rendered all at once.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
        {ITEMS.map(({ name, slug, Component }) => {
          const spec = getLessonDiagramSpec(slug)
          const steps = spec?.steps ?? []
          return (
            <section key={slug}>
              <p className="ec-label-tech" style={{ marginBottom: 10 }}>
                {name} — {steps.length} steps
              </p>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: `repeat(${steps.length}, minmax(0, 1fr))`,
                  gap: 16,
                }}
              >
                {steps.map((_, i) => (
                  <figure key={i} className="ec-card" style={{ padding: 12, margin: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <span className="ec-label-tech">STEP {i + 1}</span>
                    <div style={{ background: 'var(--ec-surface)', borderRadius: 8, padding: 6 }}>
                      <Component lessonSlug={slug} stepIndex={i} />
                    </div>
                    <figcaption style={{ fontSize: 11.5, color: 'var(--ec-text-secondary)', lineHeight: 1.4 }}>
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
