import type { SnapshotCard } from '@/lib/courses/visual-types'

export function SnapshotGrid({ title, cards }: { title: string; cards: SnapshotCard[] }) {
  return (
    <section>
      <h2 className="mb-4 text-lg font-semibold text-[var(--ec-text-primary)]">{title}</h2>
      <div className="course-snapshot-grid grid gap-3 sm:grid-cols-2">
        {cards.map((card, i) => (
          <article
            key={`${card.title}-${i}`}
            className="course-snapshot-card rounded-2xl border border-[var(--ec-border-subtle)] bg-[var(--ec-surface-raised)] p-4"
          >
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--ec-brand)]">
              {card.title}
            </p>
            <p className="text-sm leading-relaxed text-[var(--ec-text-secondary)]">{card.body}</p>
          </article>
        ))}
      </div>
    </section>
  )
}
