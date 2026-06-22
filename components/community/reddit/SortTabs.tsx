import Link from 'next/link'
import type { PostSort } from '@/lib/community/posts'

const TABS: { id: PostSort; label: string; icon: string }[] = [
  { id: 'hot', label: 'Hot', icon: '🔥' },
  { id: 'new', label: 'New', icon: '✦' },
  { id: 'top', label: 'Top', icon: '↑' },
  { id: 'rising', label: 'Rising', icon: '📈' },
]

export function SortTabs({ active, basePath }: { active: PostSort; basePath: string }) {
  return (
    <div className="rc-sorttabs" role="tablist" aria-label="Sort posts">
      {TABS.map((t) => (
        <Link
          key={t.id}
          href={t.id === 'hot' ? basePath : `${basePath}?sort=${t.id}`}
          className={`rc-sorttab${active === t.id ? ' on' : ''}`}
          role="tab"
          aria-selected={active === t.id}
        >
          <span aria-hidden>{t.icon}</span> {t.label}
        </Link>
      ))}
    </div>
  )
}
