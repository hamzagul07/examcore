import Link from 'next/link'
import type { Board } from '@/lib/community/posts'

const TABS: { id: Board | 'all'; label: string; short: string; sub?: string }[] = [
  { id: 'all', label: 'All boards', short: 'All' },
  { id: 'cambridge', label: 'Cambridge A-Level', short: 'Cambridge', sub: 'CAIE' },
  { id: 'ib', label: 'IB Diploma', short: 'IB', sub: 'HL & SL' },
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
    <nav className="rc-boardtabs" aria-label="Exam board">
      {TABS.map((t) => {
        const isActive = active === t.id
        return (
          <Link
            key={t.id}
            href={href(t.id)}
            className={`rc-boardtab${isActive ? ' on' : ''}`}
            aria-current={isActive ? 'page' : undefined}
          >
            <span className="rc-boardtab-label">
              <span className="rc-boardtab-label-full">{t.label}</span>
              <span className="rc-boardtab-label-short">{t.short}</span>
            </span>
            {t.sub ? <span className="rc-boardtab-sub">{t.sub}</span> : null}
          </Link>
        )
      })}
    </nav>
  )
}
