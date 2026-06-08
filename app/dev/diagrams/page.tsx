import { LessonDiagram } from '@/components/diagrams/LessonDiagram'
import { PILOT_DIAGRAM_SLUGS, getLessonDiagram } from '@/lib/courses/lesson-diagrams'

export const metadata = {
  title: 'Diagram preview — dev',
  robots: { index: false, follow: false },
}

export default function DiagramPreviewPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <h1 className="mb-2 text-2xl font-semibold">Lesson diagram preview</h1>
      <p className="mb-10 text-sm text-[var(--ec-text-secondary)]">
        Pilot custom SVGs for 9702 lessons. All other lessons use the generic TopicDiagram placeholder.
      </p>
      <div className="space-y-12">
        {PILOT_DIAGRAM_SLUGS.map((slug) => {
          const entry = getLessonDiagram(slug)
          if (!entry) return null
          return (
            <section key={slug} className="rounded-2xl border border-[var(--ec-border-subtle)] p-6">
              <h2 className="mb-4 text-lg font-semibold">{slug}</h2>
              <LessonDiagram Component={entry.Component} meta={entry.meta} />
            </section>
          )
        })}
      </div>
    </main>
  )
}
