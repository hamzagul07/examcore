'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { WordmarkLink } from '@/components/layout/Wordmark'
import { CreditChip } from '@/components/billing/CreditChip'
import { GuestSignInChip } from '@/components/billing/GuestSignInChip'
import { CommandKTrigger, MobileSearchMenuButton, ThemeFlip } from '@/components/margin-notes'
import { useAuthenticatedAppChrome } from '@/lib/hooks/useAuthenticatedAppChrome'
import { APP_NAV_ITEMS } from '@/lib/app-nav'
import {
  buildSignInHref,
  buildSignUpHref,
  isSafeNextPath,
} from '@/lib/auth-redirect'

/** App chrome for /mark, /dashboard, and other authenticated routes. */
export function AppHeader() {
  const pathname = usePathname()
  const showTabBar = useAuthenticatedAppChrome()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [isGuest, setIsGuest] = useState(false)
  const [initial, setInitial] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    void fetch('/api/auth/check', { cache: 'no-store' })
      .then((res) => (res.ok ? res.json() : { user: null }))
      .then((data: { user?: { email?: string; name?: string } | null }) => {
        if (cancelled) return
        const user = data.user
        setIsGuest(!user)
        const name = user?.name?.trim() || user?.email?.trim()
        setInitial(name ? name.charAt(0).toUpperCase() : null)
      })
      .catch(() => {
        if (!cancelled) setIsGuest(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    setMobileOpen(false)
  }, [pathname])

  const showMobileMenu = !showTabBar
  const signInNext = isSafeNextPath(pathname) ? pathname : '/dashboard'

  return (
    <div className="ec-nav-wrap">
      <header className="ec-nav">
        <WordmarkLink href="/" size="sm" />

        <nav className="ec-nav-links" aria-label="Main">
          {APP_NAV_ITEMS.map((item) => {
            const active = item.isActive(pathname)
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`ec-nav-link ${active ? 'ec-nav-link--active' : ''}`}
                aria-current={active ? 'page' : undefined}
              >
                {item.label.toLowerCase()}
              </Link>
            )
          })}
        </nav>

        <div className="ec-nav-right">
          <GuestSignInChip />
          <CreditChip />
          <CommandKTrigger />
          <ThemeFlip />
          {!isGuest && initial ? (
            <Link href="/account" className="ec-avatar-btn min-[901px]:grid" title="Account">
              {initial}
            </Link>
          ) : (
            <Link href={buildSignInHref(signInNext)} className="ec-nav-link ec-nav-signin">
              sign in
            </Link>
          )}
          <Link
            href="/mark"
            className="ec-btn-primary ec-btn-primary--sm ec-nav-mark-mobile hidden min-[901px]:inline-flex"
          >
            Mark a question
          </Link>
          {pathname !== '/mark' && !pathname.startsWith('/mark/') ? (
            <Link
              href="/mark"
              className="ec-nav-mark-compact inline-flex min-[901px]:hidden"
              aria-label="Mark a question"
            >
              ✎
            </Link>
          ) : null}
          {showMobileMenu ? (
            <button
              type="button"
              className="ec-nav-burger"
              aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={mobileOpen}
              onClick={() => setMobileOpen((v) => !v)}
            >
              {mobileOpen ? '✕' : '☰'}
            </button>
          ) : null}
        </div>
      </header>

      {showMobileMenu && mobileOpen ? (
        <nav className="ec-nav-mobile-menu ec-nav-mobile-menu--open" aria-label="Mobile">
          <Link href="/mark" className="ec-nav-mobile-mark">
            Mark a question
          </Link>
          <MobileSearchMenuButton />
          {APP_NAV_ITEMS.map((item) => (
            <Link key={item.href} href={item.href}>
              {item.label}
            </Link>
          ))}
          <Link href="/courses">Courses</Link>
          <Link href="/subjects">Subjects</Link>
          <Link href="/pricing">Pricing</Link>
          {isGuest ? (
            <>
              <Link href={buildSignInHref(signInNext)}>Sign in</Link>
              <Link href={buildSignUpHref('/dashboard')}>Create free account</Link>
            </>
          ) : (
            <Link href="/account">Account</Link>
          )}
        </nav>
      ) : null}
    </div>
  )
}
