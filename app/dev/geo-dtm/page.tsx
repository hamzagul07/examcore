import { DemographicTransitionDiagram } from '@/components/diagrams/DemographicTransitionDiagram'
import { getLessonDiagramSpec, stepStateFor } from '@/lib/courses/diagram-specs'

export const metadata = {
  title: 'Demographic transition diagram — dev',
  robots: { index: false, follow: false },
}

const SLUG = '1-2-changing-populations'

export default function GeoDtmDevPage() {
  const spec = getLessonDiagramSpec(SLUG)
  const steps = spec?.steps ?? []

  return (
    <main style={{ maxWidth: 1120, margin: '0 auto', padding: '32px 20px 80px' }}>
      <p className="ec-label-tech" style={{ marginBottom: 6 }}>
        DEV PREVIEW · GEOGRAPHY
      </p>
      <h1 className="ms-h2" style={{ marginBottom: 20 }}>
        Demographic transition model — {steps.length} steps
      </h1>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
          gap: 24,
        }}
      >
        {steps.map((_, i) => (
          <figure
            key={i}
            className="ec-card"
            style={{ padding: 16, margin: 0, display: 'flex', flexDirection: 'column', gap: 10 }}
          >
            <span className="ec-label-tech">
              STEP {i + 1} / {steps.length}
            </span>
            <div style={{ background: 'var(--ec-surface)', borderRadius: 10, padding: 8 }}>
              <DemographicTransitionDiagram lessonSlug={SLUG} stepIndex={i} />
            </div>
            <figcaption style={{ fontSize: 13, color: 'var(--ec-text-secondary)' }}>
              {stepStateFor(spec, i)?.caption}
            </figcaption>
          </figure>
        ))}
      </div>
    </main>
  )
}
