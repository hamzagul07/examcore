import { CheckCircle2 } from 'lucide-react'

export function CourseLearningObjectives({ items }: { items: string[] }) {
  if (!items.length) return null

  return (
    <div className="course-objective-card">
      <p className="mb-3 text-sm font-semibold text-[var(--ec-text-primary)]">
        What you will learn
      </p>
      <ul className="space-y-2.5">
        {items.map((item) => (
          <li key={item} className="flex gap-2.5 text-sm leading-relaxed text-[var(--ec-text-secondary)]">
            <CheckCircle2
              className="mt-0.5 h-4 w-4 shrink-0 text-[var(--ec-brand)]"
              aria-hidden
            />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
