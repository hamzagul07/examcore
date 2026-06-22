'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEcTheme } from '@/lib/design-system/ThemeProvider'
import { useOmniAI } from '@/lib/omni-ai/context'
import { avatarInitial, useAuthCheck } from '@/lib/hooks/useAuthCheck'
import { buildSignInHref, buildSignUpHref, isSafeNextPath } from '@/lib/auth-redirect'
import { NavDropdown } from '@/components/layout/NavDropdown'
import { SUBJECTS_DROPDOWN } from '@/lib/marketing-nav'

type NavLink = { id: string; label: string; href: string; children?: typeof SUBJECTS_DROPDOWN }

const LINKS: NavLink[] = [
  { id: 'mark', label: 'mark', href: '/mark' },
  { id: 'catalog', label: 'courses', href: '/courses' },
  { id: 'subjects', label: 'subjects', href: '/subjects', children: SUBJECTS_DROPDOWN },
  { id: 'community', label: 'community', href: '/community' },
  { id: 'pricing', label: 'pricing', href: '/pricing' },
]

function isActive(pathname: string, id: string): boolean {
  if (id === 'catalog') {
    return pathname === '/courses' || pathname.startsWith('/courses/')
  }
  if (id === 'subjects') return pathname.startsWith('/subjects') || pathname.startsWith('/ib')
  if (id === 'community') return pathname === '/community' || pathname.startsWith('/community/')
  if (id === 'progress') return pathname.startsWith('/dashboard')
  if (id === 'pricing') return pathname === '/pricing'
  if (id === 'mark') return pathname.startsWith('/mark')
  if (id === 'guides') return pathname.startsWith('/blog') || pathname.startsWith('/guides')
  return false
}

function hrefActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(href + '/')
}

export function MarginNotesNav() {
  const pathname = usePathname()
  const [menu, setMenu] = useState(false)
  const { theme, toggleTheme } = useEcTheme()
  const { setIsOpen } = useOmniAI()
  const { user, loading } = useAuthCheck()
  const initial = avatarInitial(user)
  const signInNext = isSafeNextPath(pathname) ? pathname : '/courses'

  useEffect(() => {
    setMenu(false)
  }, [pathname])

  useEffect(() => {
    if (!menu) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [menu])

  return (
    <div className="nav-wrap">
      <nav className="nav">
        <Link className="wordmark" href="/courses">
          MarkScheme<i>.</i>
        </Link>
        <div className="nav-links">
          {LINKS.map((l) =>
            l.children ? (
              <NavDropdown
                key={l.id}
                label={l.label}
                items={l.children}
                isActive={(href) => hrefActive(pathname, href)}
                triggerClass="nav-link"
                activeClass="active"
              />
            ) : (
              <Link
                key={l.id}
                className={`nav-link${isActive(pathname, l.id) ? ' active' : ''}`}
                href={l.href}
              >
                {l.label}
              </Link>
            )
          )}
        </div>
        <div className="nav-right">
          <button className="cmdk-btn" type="button" onClick={() => setIsOpen(true)} title="Search">
            ⌕ <span>search</span> <kbd>⌘K</kbd>
          </button>
          <button
            className="theme-flip"
            type="button"
            onClick={toggleTheme}
            title="Toggle theme"
            aria-label="Toggle theme"
          >
            {theme === 'zen' ? '☾' : '☀'}
          </button>
          {loading ? null : user ? (
            <Link className="nav-avatar" href="/dashboard" title="Dashboard">
              {initial}
            </Link>
          ) : (
            <Link className="nav-link signin" href={buildSignInHref(signInNext)}>
              sign in
            </Link>
          )}
          {loading ? null : user ? (
            <Link className="btn-primary sm" href="/mark">
              Mark a paper
            </Link>
          ) : (
            <Link className="btn-primary sm" href={buildSignUpHref(signInNext)}>
              Start free
            </Link>
          )}
          <button className="burger" type="button" onClick={() => setMenu((m) => !m)}>
            {menu ? '✕' : '☰'}
          </button>
        </div>
      </nav>
      {menu ? (
        <div className="mobile-menu">
          {LINKS.map((l) =>
            l.children ? (
              l.children.map((c) => (
                <Link
                  key={c.href}
                  className={hrefActive(pathname, c.href) ? 'active' : undefined}
                  href={c.href}
                  onClick={() => setMenu(false)}
                >
                  {l.label}: {c.label}
                </Link>
              ))
            ) : (
              <Link
                key={l.id}
                className={isActive(pathname, l.id) ? 'active' : undefined}
                href={l.href}
                onClick={() => setMenu(false)}
              >
                {l.label}
              </Link>
            )
          )}
          {loading ? null : user ? (
            <Link href="/dashboard" onClick={() => setMenu(false)}>
              Dashboard
            </Link>
          ) : (
            <>
              <Link href={buildSignInHref(signInNext)} onClick={() => setMenu(false)}>
                sign in
              </Link>
              <Link href={buildSignUpHref(signInNext)} onClick={() => setMenu(false)}>
                Start free
              </Link>
            </>
          )}
        </div>
      ) : null}
    </div>
  )
}
