import fs from 'fs'
import path from 'path'
import { LessonDiagram } from '@/components/diagrams/LessonDiagram'
import { getFamilyIdForSlug } from '@/lib/courses/diagram-families'
import { PILOT_DIAGRAM_SLUGS, getLessonDiagram } from '@/lib/courses/lesson-diagrams'

export const metadata = {
  title: 'Diagram preview — dev',
  robots: { index: false, follow: false },
}

const SUBJECTS = ['9702', '9700'] as const

function lessonSlugs(subject: string): string[] {
  const dir = path.join(process.cwd(), `content/courses/${subject}`)
  if (!fs.existsSync(dir)) return []
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.json'))
    .map((f) => f.replace(/\.json$/, ''))
    .sort()
}

export default function DiagramPreviewPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <h1 className="mb-2 text-2xl font-semibold">Lesson diagram preview</h1>
      <p className="mb-10 text-sm text-[var(--ec-text-secondary)]">
        Dev-only gallery of live SVG lesson diagrams. Custom pilots take priority over family templates.
      </p>
      {SUBJECTS.map((subject) => {
        const slugs = lessonSlugs(subject)
        const withLive = slugs.filter((slug) => getLessonDiagram(slug))
        const customCount = withLive.filter((slug) => PILOT_DIAGRAM_SLUGS.includes(slug)).length
        const familyCount = withLive.length - customCount

        return (
          <section key={subject} className="mb-16">
            <h2 className="mb-1 text-xl font-semibold">{subject}</h2>
            <p className="mb-8 text-sm text-[var(--ec-text-secondary)]">
              {withLive.length}/{slugs.length} lessons with live diagrams ({customCount} custom + {familyCount}{' '}
              family)
            </p>
            <div className="space-y-12">
              {withLive.map((slug) => {
                const entry = getLessonDiagram(slug)
                if (!entry) return null
                const family = getFamilyIdForSlug(slug)
                const kind = PILOT_DIAGRAM_SLUGS.includes(slug) ? 'custom' : `family:${family}`
                return (
                  <section key={slug} className="rounded-2xl border border-[var(--ec-border-subtle)] p-6">
                    <h3 className="mb-1 text-lg font-semibold">{slug}</h3>
                    <p className="mb-4 text-xs text-[var(--ec-text-tertiary)]">{kind}</p>
                    <LessonDiagram Component={entry.Component} meta={entry.meta} />
                  </section>
                )
              })}
            </div>
          </section>
        )
      })}
    </main>
  )
}
