import type { ComponentType } from 'react'
import { SocTheoryDiagram } from '@/components/diagrams/SocTheoryDiagram'
import { SocResearchDiagram } from '@/components/diagrams/SocResearchDiagram'
import { SocFamilyDiagram } from '@/components/diagrams/SocFamilyDiagram'
import { SocEducationDiagram } from '@/components/diagrams/SocEducationDiagram'
import { SocGlobalisationDiagram } from '@/components/diagrams/SocGlobalisationDiagram'
import { SocReligionDiagram } from '@/components/diagrams/SocReligionDiagram'
import { SocCrimeDiagram } from '@/components/diagrams/SocCrimeDiagram'
import type { LessonDiagramComponentProps } from '@/components/diagrams/diagram-props'
import { getLessonDiagramSpec, stepStateFor } from '@/lib/courses/diagram-specs'

export const metadata = {
  title: 'Step-animation (sociology) — dev',
  robots: { index: false, follow: false },
}

const ITEMS: { name: string; slug: string; Component: ComponentType<LessonDiagramComponentProps> }[] = [
  { name: 'Perspectives', slug: '1-1-the-process-of-learning-and-socialisation', Component: SocTheoryDiagram },
  { name: 'Research methods', slug: '2-1-research-methods', Component: SocResearchDiagram },
  { name: 'The family', slug: '3-1-the-family', Component: SocFamilyDiagram },
  { name: 'Education', slug: '4-1-education', Component: SocEducationDiagram },
  { name: 'Globalisation', slug: '6-1-globalisation', Component: SocGlobalisationDiagram },
  { name: 'Religion', slug: '7-1-religion', Component: SocReligionDiagram },
  { name: 'Crime & deviance', slug: '8-1-crime-and-deviance', Component: SocCrimeDiagram },
]

export default function StepAnimSocDevPage() {
  return (
    <main style={{ maxWidth: 1160, margin: '0 auto', padding: '32px 20px 80px' }}>
      <p className="ec-label-tech" style={{ marginBottom: 6 }}>
        DEV PREVIEW · STEP ANIMATION · SOCIOLOGY
      </p>
      <h1 className="ms-h2" style={{ marginBottom: 20 }}>
        Sociology cluster — newly animated
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
