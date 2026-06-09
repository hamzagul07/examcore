import fs from 'fs'
import path from 'path'
import { LessonDiagram } from '@/components/diagrams/LessonDiagram'
import { getFamilyIdForSlug } from '@/lib/courses/diagram-families'
import { PILOT_DIAGRAM_SLUGS, getLessonDiagram } from '@/lib/courses/lesson-diagrams'

export const metadata = {
  title: 'Diagram preview — dev',
  robots: { index: false, follow: false },
}

function all9702Slugs(): string[] {
  const dir = path.join(process.cwd(), 'content/courses/9702')
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.json'))
    .map((f) => f.replace(/\.json$/, ''))
    .sort()
}

export default function DiagramPreviewPage() {
  const slugs = all9702Slugs()
  const withLive = slugs.filter((slug) => getLessonDiagram(slug))

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <h1 className="mb-2 text-2xl font-semibold">Lesson diagram preview</h1>
      <p className="mb-10 text-sm text-[var(--ec-text-secondary)]">
        {withLive.length}/{slugs.length} 9702 lessons have live SVG diagrams ({PILOT_DIAGRAM_SLUGS.length}{' '}
        custom + {withLive.length - PILOT_DIAGRAM_SLUGS.length} family). Remaining lessons use animated
        TopicDiagram templates only when registry misses a slug.
      </p>
      <div className="space-y-12">
        {withLive.map((slug) => {
          const entry = getLessonDiagram(slug)
          if (!entry) return null
          const family = getFamilyIdForSlug(slug)
          const kind = PILOT_DIAGRAM_SLUGS.includes(slug) ? 'custom' : `family:${family}`
          return (
            <section key={slug} className="rounded-2xl border border-[var(--ec-border-subtle)] p-6">
              <h2 className="mb-1 text-lg font-semibold">{slug}</h2>
              <p className="mb-4 text-xs text-[var(--ec-text-tertiary)]">{kind}</p>
              <LessonDiagram Component={entry.Component} meta={entry.meta} />
            </section>
          )
        })}
      </div>
    </main>
  )
}
