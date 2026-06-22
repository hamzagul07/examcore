'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { WordmarkLink } from '@/components/layout/Wordmark'
import { CreditChip } from '@/components/billing/CreditChip'
import { GuestSignInChip } from '@/components/billing/GuestSignInChip'
import { CommandKTrigger, MobileSearchMenuButton, ThemeFlip } from '@/components/margin-notes'
import { NotificationBell } from '@/components/community/NotificationBell'
import { NavDropdown } from '@/components/layout/NavDropdown'
import { useAuthenticatedAppChrome } from '@/lib/hooks/useAuthenticatedAppChrome'
import { avatarInitial, useAuthCheck } from '@/lib/hooks/useAuthCheck'
import { APP_NAV_ITEMS } from '@/lib/app-nav'
import {
  buildSignInHref,
  buildSignUpHref,
  isSafeNextPath,
} from '@/lib/auth-redirect'
import { cn } from '@/lib/utils'

/** App chrome for /mark, /dashboard, and other authenticated routes. */
export function AppHeader() {
  const pathname = usePathname()
  const showTabBar = useAuthenticatedAppChrome()
  const { user, loading } = useAuthCheck()
  const [mobileOpen, setMobileOpen] = useState(false)
  const initial = avatarInitial(user)
  const isGuest = !loading && !user

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
            if (item.children) {
              return (
                <NavDropdown
                  key={item.label}
                  label={item.label}
                  items={item.children}
                  isActive={(href) => pathname === href || pathname.startsWith(href + '/')}
                  triggerClass="ec-nav-link"
                  activeClass="ec-nav-link--active"
                  lowercase
                />
              )
            }
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
          <NotificationBell />
          <ThemeFlip />
          {loading ? (
            <span
              className="ec-avatar-btn ec-avatar-btn--loading hidden min-[901px]:grid"
              aria-hidden
            />
          ) : user ? (
            <Link
              href="/account"
              title="Account"
              className={cn(
                'ec-avatar-btn',
                showTabBar ? 'hidden min-[901px]:grid' : 'grid'
              )}
            >
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
          {APP_NAV_ITEMS.map((item) =>
            item.children ? (
              item.children.map((c) => (
                <Link key={c.href} href={c.href}>
                  {item.label}: {c.label}
                </Link>
              ))
            ) : (
              <Link key={item.href} href={item.href}>
                {item.label}
              </Link>
            )
          )}
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
