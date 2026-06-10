'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const TABS = [
  { href: '/blog', label: 'All articles' },
  { href: '/guides', label: 'Topic hubs' },
] as const

function isTabActive(pathname: string, href: string) {
  if (href === '/blog') {
    return pathname === '/blog' || pathname.startsWith('/blog/')
  }
  return pathname === '/guides' || pathname.startsWith('/guides/')
}

/** Sub-nav shared by /blog and /guides — Margin Notes hub tabs. */
export function ContentHubNav() {
  const pathname = usePathname()

  return (
    <nav className="ms-hub-tabs" aria-label="Guides and blog">
      {TABS.map((tab) => {
        const active = isTabActive(pathname, tab.href)
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`ms-hub-tab${active ? ' on' : ''}`}
            aria-current={active ? 'page' : undefined}
          >
            {tab.label}
          </Link>
        )
      })}
    </nav>
  )
}
