import Link from 'next/link'
import { getSyllabusEdges } from '@/lib/seo/syllabus-edges'

export function SyllabusGraphLinks({
  code,
  topicCode,
}: {
  code: string
  topicCode: string
}) {
  const edges = getSyllabusEdges(code, topicCode)
  const blocks: Array<{ title: string; items: typeof edges.prerequisites }> = [
    { title: 'Prerequisites', items: edges.prerequisites },
    { title: 'Related topics', items: edges.related },
    { title: 'Practice next', items: edges.next_topics },
    { title: 'Often confused with', items: edges.confused_with },
  ].filter((b) => b.items.length > 0)

  if (!blocks.length) return null

  return (
    <aside className="mt-10 space-y-6" aria-label="Syllabus graph">
      {blocks.map((block) => (
        <div key={block.title}>
          <p className="ms-overline mb-2">{block.title}</p>
          <ul className="flex flex-wrap gap-2">
            {block.items.map((item) => (
              <li key={item.topicCode}>
                <Link
                  href={item.href}
                  className="inline-flex rounded-full border border-[var(--ec-border)] px-3 py-1.5 text-xs font-semibold hover:border-[var(--ec-brand)]/40 hover:text-[var(--ec-brand)]"
                >
                  {item.topicCode} · {item.title}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ))}
      <Link
        href={`/mark?subject=${encodeURIComponent(code)}&topic=${encodeURIComponent(topicCode)}`}
        className="ec-btn-primary inline-flex min-h-[44px]"
      >
        Mark this topic
      </Link>
    </aside>
  )
}
