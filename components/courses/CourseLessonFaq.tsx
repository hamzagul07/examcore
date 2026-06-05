import type { CourseFaqItem } from '@/lib/courses/types'

export function CourseLessonFaq({ items }: { items: CourseFaqItem[] }) {
  if (!items.length) return null

  return (
    <section className="mt-12 border-t border-[var(--ec-border-subtle)] pt-10" aria-labelledby="lesson-faq">
      <h2 id="lesson-faq" className="mb-5 text-xl font-semibold text-[var(--ec-text-primary)]">
        Frequently asked questions
      </h2>
      <div className="space-y-3">
        {items.map((item) => (
          <details
            key={item.q}
            className="group rounded-2xl border border-[var(--ec-border-subtle)] bg-[var(--ec-surface-muted)] px-4 py-3 open:bg-[var(--ec-surface-raised)]"
          >
            <summary className="cursor-pointer list-none text-sm font-semibold text-[var(--ec-text-primary)] marker:content-none [&::-webkit-details-marker]:hidden">
              {item.q}
            </summary>
            <p className="mt-3 text-sm leading-relaxed text-[var(--ec-text-secondary)]">{item.a}</p>
          </details>
        ))}
      </div>
    </section>
  )
}
