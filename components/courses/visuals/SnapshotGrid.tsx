import { LayoutGrid } from 'lucide-react'
import type { SnapshotCard } from '@/lib/courses/visual-types'
import { VisualSectionFrame } from '@/components/courses/visuals/VisualSectionFrame'

export function SnapshotGrid({ title, cards }: { title: string; cards: SnapshotCard[] }) {
  return (
    <VisualSectionFrame
      title={title}
      hint="Small chunks are easier to remember — read one card at a time."
      icon={LayoutGrid}
      accent="cool"
      className="course-snapshot-section"
    >
      <div className="course-snapshot-grid grid gap-4 sm:grid-cols-1 md:grid-cols-2">
        {cards.map((card, i) => (
          <article key={`${card.title}-${i}`} className="course-snapshot-card p-4">
            <div className="mb-2 flex items-center gap-2">
              <span className="course-snapshot-index">{i + 1}</span>
              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--ec-brand)]">
                {card.title}
              </p>
            </div>
            <p className="text-sm leading-relaxed text-[var(--ec-text-secondary)]">{card.body}</p>
          </article>
        ))}
      </div>
    </VisualSectionFrame>
  )
}
