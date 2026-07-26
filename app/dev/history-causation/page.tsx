import { HistoryCausationDiagram } from '@/components/diagrams/HistoryCausationDiagram'
import { getLessonDiagramSpec, stepStateFor } from '@/lib/courses/diagram-specs'

export const metadata = {
  title: 'History causation diagram — dev',
  robots: { index: false, follow: false },
}

const SLUG = '2-11-causes-and-effects-of-20th-century-wars'

export default function HistoryCausationDevPage() {
  const spec = getLessonDiagramSpec(SLUG)
  const steps = spec?.steps ?? []
  return (
    <main style={{ maxWidth: 1400, margin: '0 auto', padding: '32px 20px 80px' }}>
      <p className="ec-label-tech" style={{ marginBottom: 6 }}>
        DEV PREVIEW · HISTORY CAUSATION
      </p>
      <h1 className="ms-h2" style={{ marginBottom: 20 }}>
        Historical causation — {steps.length} steps
      </h1>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${steps.length}, minmax(0, 1fr))`,
          gap: 16,
        }}
      >
        {steps.map((_, i) => (
          <figure
            key={i}
            className="ec-card"
            style={{ padding: 14, margin: 0, display: 'flex', flexDirection: 'column', gap: 10 }}
          >
            <span className="ec-label-tech">STEP {i + 1}</span>
            <div style={{ background: 'var(--ec-surface)', borderRadius: 10, padding: 8 }}>
              <HistoryCausationDiagram lessonSlug={SLUG} stepIndex={i} />
            </div>
            <figcaption style={{ fontSize: 12.5, color: 'var(--ec-text-secondary)' }}>
              {stepStateFor(spec, i)?.caption}
            </figcaption>
          </figure>
        ))}
      </div>
    </main>
  )
}
