import Link from 'next/link'
import type { Board } from '@/lib/community/posts'

const TABS: { id: Board | 'all'; label: string; sub?: string }[] = [
  { id: 'all', label: 'All boards' },
  { id: 'cambridge', label: 'Cambridge A-Level', sub: 'CAIE' },
  { id: 'ib', label: 'IB Diploma', sub: 'HL & SL' },
]

export function BoardTabs({
  active,
  basePath,
  sort,
}: {
  active: Board | 'all'
  basePath: string
  sort?: string
}) {
  function href(board: Board | 'all') {
    const params = new URLSearchParams()
    if (board !== 'all') params.set('board', board)
    if (sort && sort !== 'hot') params.set('sort', sort)
    const qs = params.toString()
    return qs ? `${basePath}?${qs}` : basePath
  }

  return (
    <div className="rc-boardtabs" role="tablist" aria-label="Exam board">
      {TABS.map((t) => (
        <Link
          key={t.id}
          href={href(t.id)}
          className={`rc-boardtab${active === t.id ? ' on' : ''}`}
          role="tab"
          aria-selected={active === t.id}
        >
          <span className="rc-boardtab-label">{t.label}</span>
          {t.sub ? <span className="rc-boardtab-sub">{t.sub}</span> : null}
        </Link>
      ))}
    </div>
  )
}
