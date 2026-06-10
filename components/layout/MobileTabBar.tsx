'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

type TabItem = {
  href: string
  label: string
  glyph: string
  match: (p: string) => boolean
}

const TABS: TabItem[] = [
  {
    href: '/mark',
    label: 'Mark',
    glyph: '✎',
    match: (p) => p === '/mark' || p.startsWith('/mark/'),
  },
  {
    href: '/courses',
    label: 'Learn',
    glyph: '∫',
    match: (p) => p === '/courses' || p.startsWith('/courses/'),
  },
  {
    href: '/subjects',
    label: 'Subjects',
    glyph: '§',
    match: (p) => p === '/subjects' || p.startsWith('/subjects/'),
  },
  {
    href: '/dashboard/progress',
    label: 'Progress',
    glyph: 'A',
    match: (p) =>
      p.startsWith('/dashboard/progress') ||
      p.startsWith('/dashboard/attempt/') ||
      p === '/dashboard',
  },
  {
    href: '/account',
    label: 'You',
    glyph: 'H',
    match: (p) => p.startsWith('/account'),
  },
]

export function MobileTabBar() {
  const pathname = usePathname()

  return (
    <nav aria-label="Main navigation" className="ec-tabbar lg:hidden">
      {TABS.map(({ href, label, glyph, match }) => {
        const active = match(pathname)
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? 'page' : undefined}
          >
            <span className="ec-tabbar__glyph" aria-hidden>
              {glyph}
            </span>
            <span className="ec-tabbar__label">{label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
