'use client'

import { usePathname } from 'next/navigation'
import { LoadingLink } from '@/components/ui/LoadingLink'
import {
  InkGlyphBook,
  InkGlyphHome,
  InkGlyphProgress,
  InkGlyphTick,
} from '@/components/margin-notes'
import { useAuthCheck } from '@/lib/hooks/useAuthCheck'
import type { ReactNode } from 'react'

type TabItem = {
  href: string
  label: string
  icon: ReactNode
  match: (p: string) => boolean
  /** Visually emphasise the core action (Mark). */
  primary?: boolean
}

/**
 * Phone tab bar — four destinations (NAV-01 / Codex UI review).
 * Max users get Vault in place of Learn so the exclusive surface is one tap away.
 */
const BASE_TABS: TabItem[] = [
  {
    href: '/dashboard',
    label: 'Home',
    icon: <InkGlyphHome className="ec-tabbar__svg" title="" />,
    match: (p) => p === '/dashboard',
  },
  {
    href: '/courses',
    label: 'Learn',
    icon: <InkGlyphBook className="ec-tabbar__svg" title="" />,
    match: (p) =>
      p === '/courses' ||
      p.startsWith('/courses/') ||
      p === '/ib/courses' ||
      p.startsWith('/ib/courses/'),
  },
  {
    href: '/mark',
    label: 'Mark',
    icon: <InkGlyphTick className="ec-tabbar__svg" title="" />,
    primary: true,
    match: (p) => p === '/mark' || p.startsWith('/mark/'),
  },
  {
    href: '/dashboard/progress',
    label: 'Progress',
    icon: <InkGlyphProgress className="ec-tabbar__svg" title="" />,
    match: (p) =>
      p.startsWith('/dashboard/progress') ||
      p.startsWith('/dashboard/attempt/') ||
      p.startsWith('/dashboard/review'),
  },
]

const VAULT_TAB: TabItem = {
  href: '/dashboard/vault',
  label: 'Vault',
  icon: <InkGlyphBook className="ec-tabbar__svg" title="" />,
  match: (p) => p.startsWith('/dashboard/vault'),
}

export function MobileTabBar() {
  const pathname = usePathname()
  const { isMax } = useAuthCheck()
  const tabs = isMax
    ? [BASE_TABS[0], VAULT_TAB, BASE_TABS[2], BASE_TABS[3]]
    : BASE_TABS

  return (
    <nav aria-label="Main navigation" className="ec-tabbar lg:hidden">
      {tabs.map(({ href, label, icon, match, primary }) => {
        const active = match(pathname)
        return (
          <LoadingLink
            key={href}
            href={href}
            variant="inline"
            loadingText="Opening…"
            aria-current={active ? 'page' : undefined}
            className={`ec-tabbar-link${primary ? ' ec-tabbar-link--mark' : ''}`}
          >
            <span
              className={`ec-tabbar__glyph ${active ? 'is-active' : ''}${
                primary ? ' ec-tabbar__glyph--mark' : ''
              }`}
              aria-hidden
            >
              {icon}
            </span>
            <span className="ec-tabbar__label">{label}</span>
          </LoadingLink>
        )
      })}
    </nav>
  )
}
