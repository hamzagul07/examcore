import { Target } from 'lucide-react'
import { CourseRichText } from '@/components/courses/CourseRichText'

export function CourseLearningObjectives({ items }: { items: string[] }) {
  if (!items.length) return null

  return (
    <section className="course-objective-card" aria-labelledby="course-objectives-heading">
      <div className="course-objective-header">
        <Target className="h-5 w-5 text-[var(--course-subject-accent,var(--ec-brand))]" aria-hidden />
        <div>
          <h2 id="course-objectives-heading" className="text-sm font-bold text-[var(--ec-text-primary)]">
            Learning objectives
          </h2>
          <p className="text-xs text-[var(--ec-text-tertiary)]">
            By the end of this topic, you should be able to:
          </p>
        </div>
      </div>
      <ul className="grid gap-2.5 lg:grid-cols-2">
        {items.map((item, i) => (
          <li
            key={`${item.slice(0, 24)}-${i}`}
            className="flex gap-2.5 rounded-xl border-2 border-[var(--ec-border-subtle)] bg-[var(--ec-surface-raised)] px-3 py-2.5 text-sm leading-relaxed text-[var(--ec-text-secondary)]"
          >
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 border-[color-mix(in_srgb,var(--course-subject-accent,var(--ec-brand))_40%,transparent)] bg-[color-mix(in_srgb,var(--course-subject-accent,var(--ec-brand))_10%,transparent)] text-[10px] font-bold text-[var(--course-subject-accent,var(--ec-brand))]">
              {i + 1}
            </span>
            <CourseRichText content={item} variant="inline" />
          </li>
        ))}
      </ul>
    </section>
  )
}
