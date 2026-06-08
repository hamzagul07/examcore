import { GraduationCap, Sparkles } from 'lucide-react'
import { CourseRichText } from '@/components/courses/CourseRichText'
import { VisualSectionFrame } from '@/components/courses/visuals/VisualSectionFrame'

type Side = { title: string; points: string[] }

export function ConceptCompare({
  title,
  simple,
  exam,
}: {
  title: string
  simple: Side
  exam: Side
}) {
  return (
    <VisualSectionFrame
      title={title}
      hint="Start with the simple version, then level up to exam language."
      icon={Sparkles}
      accent="violet"
    >
      <div className="course-compare-grid grid gap-4 md:grid-cols-2">
        <div className="course-compare-card course-compare-simple rounded-2xl border border-[color-mix(in_srgb,var(--ec-brand)_35%,var(--ec-border-subtle))] bg-[color-mix(in_srgb,var(--ec-brand)_7%,var(--ec-surface-muted))] p-5">
          <p className="mb-3 flex items-center gap-2 text-sm font-semibold text-[var(--ec-text-primary)]">
            <Sparkles className="h-4 w-4 text-[var(--ec-brand)]" aria-hidden />
            {simple.title}
          </p>
          <ul className="space-y-2.5 text-sm leading-relaxed text-[var(--ec-text-secondary)]">
            {simple.points.map((p) => (
              <li
                key={p}
                className="flex gap-2 rounded-lg border border-[var(--ec-border-subtle)] bg-[var(--ec-surface-raised)] px-3 py-2"
              >
                <span className="text-[var(--ec-brand)]">•</span>
                <CourseRichText content={p} variant="inline" />
              </li>
            ))}
          </ul>
        </div>
        <div className="course-compare-card rounded-2xl border border-[var(--ec-border-subtle)] bg-[var(--ec-surface-muted)] p-5">
          <p className="mb-3 flex items-center gap-2 text-sm font-semibold text-[var(--ec-text-primary)]">
            <GraduationCap className="h-4 w-4 text-[var(--ec-accent)]" aria-hidden />
            {exam.title}
          </p>
          <ul className="space-y-2.5 text-sm leading-relaxed text-[var(--ec-text-secondary)]">
            {exam.points.map((p) => (
              <li
                key={p}
                className="flex gap-2 rounded-lg border border-[var(--ec-border-subtle)] bg-[var(--ec-surface-raised)] px-3 py-2"
              >
                <span className="text-[var(--ec-accent)]">✓</span>
                <CourseRichText content={p} variant="inline" />
              </li>
            ))}
          </ul>
        </div>
      </div>
    </VisualSectionFrame>
  )
}
