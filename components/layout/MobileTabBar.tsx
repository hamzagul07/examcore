'use client'

import { usePathname } from 'next/navigation'
import {
  BookOpen,
  Home,
  LibraryBig,
  MessagesSquare,
  PenLine,
  User,
  type LucideIcon,
} from 'lucide-react'
import { LoadingLink } from '@/components/ui/LoadingLink'

type TabItem = {
  href: string
  label: string
  Icon: LucideIcon
  match: (p: string) => boolean
}

const TABS: TabItem[] = [
  {
    href: '/mark',
    label: 'Mark',
    Icon: PenLine,
    match: (p) => p === '/mark' || p.startsWith('/mark/'),
  },
  {
    href: '/courses',
    label: 'Learn',
    Icon: BookOpen,
    match: (p) =>
      p === '/courses' ||
      p.startsWith('/courses/') ||
      p === '/ib/courses' ||
      p.startsWith('/ib/courses/'),
  },
  {
    href: '/subjects',
    label: 'Subjects',
    Icon: LibraryBig,
    match: (p) =>
      p === '/subjects' ||
      p.startsWith('/subjects/') ||
      p === '/ib/subjects' ||
      p.startsWith('/ib/subjects/') ||
      p === '/ib',
  },
  {
    href: '/community',
    label: 'Discuss',
    Icon: MessagesSquare,
    match: (p) => p === '/community' || p.startsWith('/community/') || p.startsWith('/u/'),
  },
  {
    href: '/dashboard',
    label: 'Home',
    Icon: Home,
    match: (p) =>
      p === '/dashboard' ||
      p.startsWith('/dashboard/progress') ||
      p.startsWith('/dashboard/attempt/'),
  },
  {
    href: '/account',
    label: 'You',
    Icon: User,
    match: (p) => p.startsWith('/account'),
  },
]

export function MobileTabBar() {
  const pathname = usePathname()

  return (
    <nav aria-label="Main navigation" className="ec-tabbar lg:hidden">
      {TABS.map(({ href, label, Icon, match }) => {
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
              <Icon strokeWidth={active ? 2.4 : 2} />
            </span>
            <span className="ec-tabbar__label">{label}</span>
          </LoadingLink>
        )
      })}
    </nav>
  )
}
