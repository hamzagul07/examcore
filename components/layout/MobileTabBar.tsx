'use client'

import { usePathname } from 'next/navigation'
import { LoadingLink } from '@/components/ui/LoadingLink'

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
    match: (p) =>
      p === '/courses' ||
      p.startsWith('/courses/') ||
      p === '/ib/courses' ||
      p.startsWith('/ib/courses/'),
  },
  {
    href: '/subjects',
    label: 'Subjects',
    glyph: '§',
    match: (p) =>
      p === '/subjects' ||
      p.startsWith('/subjects/') ||
      p === '/ib/subjects' ||
      p.startsWith('/ib/subjects/') ||
      p === '/ib',
  },
  {
    href: '/dashboard',
    label: 'Home',
    glyph: '⌂',
    match: (p) =>
      p === '/dashboard' ||
      p.startsWith('/dashboard/progress') ||
      p.startsWith('/dashboard/attempt/'),
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
          <LoadingLink
            key={href}
            href={href}
            variant="inline"
            loadingText="Opening…"
            aria-current={active ? 'page' : undefined}
            className="ec-tabbar-link"
          >
            <span className="ec-tabbar__glyph" aria-hidden>
              {glyph}
            </span>
            <span className="ec-tabbar__label">{label}</span>
          </LoadingLink>
        )
      })}
    </nav>
  )
}
