import { TopicDiagram } from '@/components/courses/visuals/TopicDiagram'
import type { VisualTemplate } from '@/lib/courses/visual-types'

/**
 * The nine generic figures, all on one page.
 *
 * These are the fallback used when a lesson has a visual but no purpose-built
 * live diagram, which turns out to be a combination no current lesson hits — so
 * there was no way to look at them, and a change to their colours could not be
 * checked against anything. That is the whole reason this page exists.
 */

export const metadata = {
  title: 'Topic diagram templates — dev',
  robots: { index: false, follow: false },
}

const TEMPLATES: VisualTemplate[] = [
  'circuit',
  'waves',
  'forces',
  'thermal',
  'energy',
  'cell',
  'molecule',
  'genetics',
  'process',
]

/** The accents a real lesson would supply, to check the figures in context. */
const ACCENTS: { name: string; value: string }[] = [
  { name: 'biology', value: '#19774d' },
  { name: 'physics', value: '#6b5b8a' },
  { name: 'computer science', value: '#5c6470' },
]

export default function TopicDiagramsPage() {
  return (
    <main className="course-root lesson-page" style={{ padding: 32 }}>
      <h1 style={{ fontSize: 24, marginBottom: 6 }}>Topic diagram templates</h1>
      <p style={{ opacity: 0.7, marginBottom: 28, maxWidth: 640 }}>
        Colour is a role, not decoration: warm for energy and sources, hot for
        force and current, cool for fields and flow, violet for measurements and
        axes, green for matter. The same colour should mean the same thing from
        one figure to the next.
      </p>

      {ACCENTS.map((acc) => (
        <section key={acc.name} style={{ marginBottom: 40 }}>
          <h2 style={{ fontSize: 15, marginBottom: 12, opacity: 0.75 }}>
            lesson accent: {acc.name} ({acc.value})
          </h2>
          <div
            className="visual-stack"
            style={
              {
                '--acc-lesson': acc.value,
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                gap: 16,
              } as React.CSSProperties
            }
          >
            {TEMPLATES.map((t) => (
              <figure
                key={t}
                style={{
                  margin: 0,
                  padding: 10,
                  border: '1px solid var(--border, #e7e3d8)',
                  borderRadius: 12,
                }}
              >
                <figcaption
                  style={{ fontSize: 11, letterSpacing: '0.08em', opacity: 0.6, marginBottom: 4 }}
                >
                  {t.toUpperCase()}
                </figcaption>
                <TopicDiagram template={t} />
              </figure>
            ))}
          </div>
        </section>
      ))}
    </main>
  )
}
