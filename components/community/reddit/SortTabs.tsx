import Link from 'next/link'
import type { PostSort } from '@/lib/community/posts'

const TABS: { id: PostSort; label: string }[] = [
  { id: 'hot', label: 'Hot' },
  { id: 'new', label: 'New' },
  { id: 'top', label: 'Top' },
  { id: 'rising', label: 'Rising' },
]

function withSort(basePath: string, sort: PostSort) {
  const [path, qs] = basePath.split('?')
  const params = new URLSearchParams(qs || '')
  if (sort === 'hot') params.delete('sort')
  else params.set('sort', sort)
  const next = params.toString()
  return next ? `${path}?${next}` : path
}

export function SortTabs({ active, basePath }: { active: PostSort; basePath: string }) {
  return (
    <div className="rc-sorttabs-scroll">
      <nav className="rc-sorttabs" aria-label="Sort posts">
        {TABS.map((t) => {
          const isActive = active === t.id
          return (
            <Link
              key={t.id}
              href={withSort(basePath, t.id)}
              className={`rc-sorttab${isActive ? ' on' : ''}`}
              aria-current={isActive ? 'page' : undefined}
            >
              {t.label}
            </Link>
          )
        })}
      </nav>
    </div>
  )
}
