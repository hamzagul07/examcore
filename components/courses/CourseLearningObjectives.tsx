import { Target } from 'lucide-react'

export function CourseLearningObjectives({ items }: { items: string[] }) {
  if (!items.length) return null

  return (
    <div className="course-objective-card">
      <div className="course-objective-header">
        <Target className="h-5 w-5 text-[var(--ec-brand)]" aria-hidden />
        <div>
          <p className="text-sm font-bold text-[var(--ec-text-primary)]">By the end, you will be able to</p>
          <p className="text-xs text-[var(--ec-text-tertiary)]">Tick these off as you work through the lesson</p>
        </div>
      </div>
      <ul className="grid gap-2.5 sm:grid-cols-1 md:grid-cols-2">
        {items.map((item, i) => (
          <li
            key={item}
            className="flex gap-2.5 rounded-xl border-2 border-[var(--ec-border-subtle)] bg-[var(--ec-surface-raised)] px-3 py-2.5 text-sm leading-relaxed text-[var(--ec-text-secondary)]"
          >
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 border-[var(--ec-brand)]/40 bg-[color-mix(in_srgb,var(--ec-brand)_10%,transparent)] text-[10px] font-bold text-[var(--ec-brand)]">
              {i + 1}
            </span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
