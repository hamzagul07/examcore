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
import { NavMobileMenu } from '@/components/layout/NavMobileMenu'
import { useAuthenticatedAppChrome } from '@/lib/hooks/useAuthenticatedAppChrome'
import { avatarInitial, useAuthCheck } from '@/lib/hooks/useAuthCheck'
import { useEcTheme } from '@/lib/design-system/ThemeProvider'
import { useOmniAI } from '@/lib/omni-ai/context'
import {
  getNavItemsForVariant,
  MARKETING_NAV_SECONDARY,
  type SiteHeaderVariant,
} from '@/lib/site-nav'
import {
  buildMarketingSignUpHref,
  buildSignInHref,
  buildSignUpHref,
  isSafeNextPath,
} from '@/lib/auth-redirect'
import { cn } from '@/lib/utils'

type Props = { variant: SiteHeaderVariant }

function hrefActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(href + '/')
}

export function SiteHeader({ variant }: Props) {
  const pathname = usePathname()
  const navItems = getNavItemsForVariant(variant)
  const [mobileOpen, setMobileOpen] = useState(false)
  const { user, loading } = useAuthCheck()
  const initial = avatarInitial(user)
  const isGuest = !loading && !user
  const authenticatedChrome = useAuthenticatedAppChrome()
  const showTabBar = variant === 'app' && authenticatedChrome
  const { theme, toggleTheme } = useEcTheme()
  const { setIsOpen } = useOmniAI()

  useEffect(() => {
    setMobileOpen(false)
  }, [pathname])

  useEffect(() => {
    if (!mobileOpen || variant !== 'reading') return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [mobileOpen, variant])

  const signInNext = isSafeNextPath(pathname)
    ? pathname
    : variant === 'reading'
      ? '/courses'
      : '/dashboard'
  const showMobileMenu = variant === 'app' ? !showTabBar : true
  const lowercase = variant !== 'reading'
  const isEcNav = variant === 'marketing' || variant === 'app'

  const renderNavLinks = () =>
    navItems.map((item) => {
      if (item.children?.length) {
        return (
          <NavDropdown
            key={item.id}
            label={item.label}
            items={item.children}
            isActive={(href) => hrefActive(pathname, href)}
            triggerClass={isEcNav ? 'ec-nav-link' : 'nav-link'}
            activeClass={isEcNav ? 'ec-nav-link--active' : 'active'}
            lowercase={lowercase}
          />
        )
      }
      const active = item.isActive(pathname)
      if (isEcNav) {
        return (
          <Link
            key={item.id}
            href={item.href}
            className={`ec-nav-link ${active ? 'ec-nav-link--active' : ''}`}
            aria-current={active ? 'page' : undefined}
          >
            {lowercase ? item.label.toLowerCase() : item.label}
          </Link>
        )
      }
      return (
        <Link
          key={item.id}
          className={`nav-link${active ? ' active' : ''}`}
          href={item.href}
        >
          {item.label.toLowerCase()}
        </Link>
      )
    })

  const mobileExtra =
    variant === 'marketing'
      ? MARKETING_NAV_SECONDARY
      : variant === 'app'
        ? [{ href: '/pricing', label: 'Pricing' }]
        : []

  if (variant === 'reading') {
    return (
      <div className="nav-wrap">
        <nav className="nav">
          <Link className="wordmark" href="/courses">
            MarkScheme<i>.</i>
          </Link>
          <div className="nav-links">{renderNavLinks()}</div>
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
            <button className="burger" type="button" onClick={() => setMobileOpen((m) => !m)}>
              {mobileOpen ? '✕' : '☰'}
            </button>
          </div>
        </nav>
        {mobileOpen ? (
          <NavMobileMenu
            items={navItems}
            pathname={pathname}
            className="mobile-menu"
            linkClassName=""
            activeClassName="active"
            onNavigate={() => setMobileOpen(false)}
            extraLinks={
              loading
                ? []
                : user
                  ? [{ href: '/dashboard', label: 'Dashboard' }]
                  : [
                      { href: buildSignInHref(signInNext), label: 'sign in' },
                      { href: buildSignUpHref(signInNext), label: 'Start free' },
                    ]
            }
          />
        ) : null}
      </div>
    )
  }

  return (
    <div className="ec-nav-wrap">
      <header className="ec-nav">
        <WordmarkLink href="/" size="sm" />

        <nav className="ec-nav-links" aria-label="Main">
          {renderNavLinks()}
        </nav>

        <div className="ec-nav-right">
          {variant === 'app' ? (
            <>
              <GuestSignInChip />
              <CreditChip />
            </>
          ) : null}
          <CommandKTrigger />
          {variant === 'app' ? <NotificationBell /> : null}
          <ThemeFlip />
          {variant === 'app' ? (
            loading ? (
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
            )
          ) : (
            <Link href="/auth/signin" className="ec-nav-link ec-nav-signin">
              sign in
            </Link>
          )}
          <Link
            href="/mark"
            className="ec-btn-primary ec-btn-primary--sm ec-nav-mark-mobile hidden min-[901px]:inline-flex"
          >
            Mark a question
          </Link>
          {variant === 'app' &&
          pathname !== '/mark' &&
          !pathname.startsWith('/mark/') ? (
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
          <Link href="/mark" className="ec-nav-mobile-mark" onClick={() => setMobileOpen(false)}>
            Mark a question
          </Link>
          <MobileSearchMenuButton />
          <NavMobileMenu
            items={navItems}
            pathname={pathname}
            className="ec-nav-mobile-menu-items"
            linkClassName=""
            activeClassName=""
            onNavigate={() => setMobileOpen(false)}
            extraLinks={mobileExtra}
          />
          {variant === 'marketing' ? (
            <>
              <Link href="/auth/signin" onClick={() => setMobileOpen(false)}>
                Sign in
              </Link>
              <Link href={buildMarketingSignUpHref()} onClick={() => setMobileOpen(false)}>
                Create free account
              </Link>
            </>
          ) : isGuest ? (
            <>
              <Link href={buildSignInHref(signInNext)} onClick={() => setMobileOpen(false)}>
                Sign in
              </Link>
              <Link href={buildSignUpHref('/dashboard')} onClick={() => setMobileOpen(false)}>
                Create free account
              </Link>
            </>
          ) : (
            <Link href="/account" onClick={() => setMobileOpen(false)}>
              Account
            </Link>
          )}
        </nav>
      ) : null}
    </div>
  )
}
