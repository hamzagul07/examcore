'use client'

import type { ReactNode } from 'react'
import { usePathname } from 'next/navigation'
import { LoadingLink } from '@/components/ui/LoadingLink'
import { InkGlyphCards, InkGlyphHome, InkGlyphTick } from '@/components/margin-notes'
import { TEACHER_ACCOUNT_NAV, TEACHER_DESK_NAV, type TeacherNavItem } from '@/lib/site-nav'

/** Account slip — a name card, in the InkGlyph hand (stroke, 32-unit box). */
function InkGlyphAccount({ className }: { className?: string }) {
  return (
    <svg className={`ms-ink-glyph ${className ?? ''}`.trim()} viewBox="0 0 32 32" fill="none" aria-hidden>
      <rect x="5" y="7" width="22" height="18" rx="2" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="12.5" cy="14.5" r="3" stroke="currentColor" strokeWidth="1.6" />
      <path d="M8.5 21.5 C9.5 19 11 18 12.5 18 C14 18 15.5 19 16.5 21.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M19 13 H24 M19 17 H23" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.7" />
    </svg>
  )
}

const GLYPHS: Record<TeacherNavItem['id'], ReactNode> = {
  desk: <InkGlyphHome className="ec-tabbar__svg" title="" />,
  classes: <InkGlyphCards className="ec-tabbar__svg" title="" />,
  reviews: <InkGlyphTick className="ec-tabbar__svg" title="" />,
  account: <InkGlyphAccount className="ec-tabbar__svg" />,
}

const TABS: readonly TeacherNavItem[] = [...TEACHER_DESK_NAV, TEACHER_ACCOUNT_NAV]

/**
 * Teacher phone tab bar (≤900px) — Desk · Classes · Reviews · Account.
 *
 * Built on the shared `.ec-tabbar` markup so it inherits the student bar's
 * geometry, active stamp and home-indicator padding; `.ms-teacher-tabbar`
 * adds the side safe-area insets and the teacher z-index. The layout pairs it
 * with `app-shell-tabbed` so the last row of every page clears it.
 *
 * Rendered only when TEACHER_V2 is on — the legacy nav had no phone bar.
 */
export function TeacherTabBar() {
  const pathname = usePathname() ?? ''

  return (
    <nav aria-label="Teacher navigation" className="ec-tabbar ms-teacher-tabbar lg:hidden">
      {TABS.map((tab) => {
        const active = tab.isActive(pathname)
        return (
          <LoadingLink
            key={tab.id}
            href={tab.href}
            variant="inline"
            loadingText="Opening…"
            aria-current={active ? 'page' : undefined}
            className="ec-tabbar-link"
          >
            <span className={`ec-tabbar__glyph${active ? ' is-active' : ''}`} aria-hidden>
              {GLYPHS[tab.id]}
            </span>
            <span className="ec-tabbar__label">{tab.label}</span>
          </LoadingLink>
        )
      })}
    </nav>
  )
}
