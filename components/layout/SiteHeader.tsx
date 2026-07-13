'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { WordmarkLink } from '@/components/layout/Wordmark'
import { SiteHeaderContext } from '@/components/layout/SiteHeaderContext'
import { CreditChip } from '@/components/billing/CreditChip'
import { GuestSignInChip } from '@/components/billing/GuestSignInChip'
import { LoadingLink } from '@/components/ui/LoadingLink'
import { ThemeFlip } from '@/components/margin-notes'
import { NotificationBell } from '@/components/community/NotificationBell'
import { DiscussSubmitLink } from '@/components/community/DiscussSubmitLink'
import { NavDropdown } from '@/components/layout/NavDropdown'
import { NavMobileMenu } from '@/components/layout/NavMobileMenu'
import { useAuthenticatedAppChrome } from '@/lib/hooks/useAuthenticatedAppChrome'
import { avatarInitial, useAuthCheck } from '@/lib/hooks/useAuthCheck'
import { useHeaderScroll } from '@/lib/hooks/useHeaderScroll'
import { useFocusTrap } from '@/lib/hooks/useFocusTrap'
import { useNavHeightVar } from '@/lib/hooks/useNavHeightVar'
import { scrollPageToTop } from '@/lib/navigation/scroll-page-to-top'
import {
  getNavItemsForConfig,
  getSiteHeaderConfig,
  type HeaderCta,
} from '@/lib/site-header-config'
import { MARKETING_NAV_SECONDARY, type SiteHeaderVariant } from '@/lib/site-nav'
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

const CTA_CLASS: Record<'primary' | 'warm' | 'ghost', string> = {
  primary: 'ec-btn-primary ec-btn-primary--sm',
  warm: 'ec-btn-warm ec-btn-primary--sm',
  ghost: 'ec-btn-ghost ec-btn-ghost--sm',
}

function CtaLabel({ cta }: { cta: HeaderCta }) {
  if (!cta.shortLabel) return <>{cta.label}</>
  return (
    <>
      <span className="ec-cta-label ec-cta-label--full">{cta.label}</span>
      <span className="ec-cta-label ec-cta-label--short" aria-hidden>
        {cta.shortLabel}
      </span>
    </>
  )
}

function mobileViewportMatches() {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(max-width: 900px)').matches
}

export function SiteHeader({ variant }: Props) {
  const pathname = usePathname()
  const config = getSiteHeaderConfig(pathname, variant)
  const navItems = getNavItemsForConfig(variant, config)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [restoreMenuFocus, setRestoreMenuFocus] = useState(true)
  const [mounted, setMounted] = useState(false)
  const [mobileViewport, setMobileViewport] = useState(mobileViewportMatches)
  const navWrapRef = useRef<HTMLDivElement>(null)
  const burgerRef = useRef<HTMLButtonElement>(null)
  const mobileSheetRef = useRef<HTMLDivElement>(null)
  const { scrolled, hidden: headerHidden } = useHeaderScroll(mobileOpen)
  const { user, loading } = useAuthCheck()
  const initial = avatarInitial(user)
  const isGuest = !loading && !user
  // Logged-in users already have the account avatar — never show them a
  // "Sign up"/"Sign in" header CTA.
  const isAuthCta = (cta?: HeaderCta | null): boolean =>
    !!cta &&
    (cta.href.startsWith('/auth/signup') || cta.href.startsWith('/auth/signin'))
  const hideAuthCta = !loading && !!user
  const showPrimaryCta = !(hideAuthCta && isAuthCta(config.primaryCta))
  const visibleSecondaryCta =
    hideAuthCta && isAuthCta(config.secondaryCta) ? undefined : config.secondaryCta
  const authenticatedChrome = useAuthenticatedAppChrome()
  const showTabBar = variant === 'app' && authenticatedChrome

  useEffect(() => {
    setRestoreMenuFocus(false)
    setMobileOpen(false)
  }, [pathname])

  useEffect(() => {
    if (!mobileOpen) return
    document.body.classList.add('ec-mobile-menu-open')
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMobileOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.classList.remove('ec-mobile-menu-open')
      document.body.style.overflow = prev
      window.removeEventListener('keydown', onKey)
    }
  }, [mobileOpen])

  const signInNext = isSafeNextPath(pathname)
    ? pathname
    : variant === 'reading'
      ? '/courses'
      : '/dashboard'
  const showMobileMenu = variant === 'app' ? !showTabBar : true
  const isDiscuss = config.tone === 'discuss'

  const mobileExtra =
    variant === 'marketing' || variant === 'reading'
      ? MARKETING_NAV_SECONDARY
      : variant === 'app'
        ? [
            { href: '/pricing', label: 'Pricing' },
            { href: '/how-it-works', label: 'How it works' },
            { href: '/faq', label: 'FAQ' },
          ]
        : isDiscuss
          ? [
              { href: '/community/submit', label: 'Create post' },
              { href: '/community/guidelines', label: 'Community guidelines' },
            ]
          : []

  const showNotifications =
    variant === 'marketing' || variant === 'reading' || variant === 'app'

  const showPageCtas = config.tone !== 'mark' || variant !== 'app'

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 900px)')
    const sync = () => setMobileViewport(mq.matches)
    sync()
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [])

  /** Auto-hide breaks tap targets on phones; keep header reachable on mobile. */
  const hideHeader = headerHidden && !mobileOpen && !mobileViewport

  const closeMobileMenu = (restoreFocus = true) => {
    setRestoreMenuFocus(restoreFocus)
    setMobileOpen(false)
  }

  const navigateFromMenu = () => {
    setRestoreMenuFocus(false)
    setMobileOpen(false)
    scrollPageToTop()
  }

  useNavHeightVar(navWrapRef)
  const menuFocusExtras = useMemo(() => [burgerRef], [])
  useFocusTrap(mobileOpen && mounted, mobileSheetRef, burgerRef, menuFocusExtras, {
    restoreFocus: restoreMenuFocus,
  })

  const renderPrimaryCta = (className: string, onNavigate?: () => void) =>
    isDiscuss ? (
      <DiscussSubmitLink cta={config.primaryCta} className={className} onNavigate={onNavigate} />
    ) : (
      <LoadingLink
        href={config.primaryCta.href}
        className={className}
        loadingText="Opening…"
        onNavigate={onNavigate}
      >
        <CtaLabel cta={config.primaryCta} />
      </LoadingLink>
    )

  const signInHref = buildSignInHref(signInNext)

  const renderDesktopAuth = () => {
    if (loading) {
      return (
        <span
          className="ec-avatar-btn ec-avatar-btn--loading hidden min-[901px]:grid"
          aria-hidden
        />
      )
    }
    if (user) {
      return (
        <Link
          href="/account"
          title="Account"
          className="ec-avatar-btn hidden min-[901px]:grid"
        >
          {initial}
        </Link>
      )
    }
    return (
      <LoadingLink
        href={signInHref}
        variant="inline"
        loadingText="Signing in…"
        className="ec-nav-link ec-nav-signin"
      >
        sign in
      </LoadingLink>
    )
  }

  const renderNavLinks = () =>
    navItems.map((item) => {
      if (item.children?.length) {
        return (
          <NavDropdown
            key={item.id}
            label={item.label}
            items={item.children}
            isActive={(href) => hrefActive(pathname, href)}
            triggerClass="ec-nav-link"
            activeClass="ec-nav-link--active"
            lowercase
          />
        )
      }
      const active = item.isActive(pathname)
      return (
        <LoadingLink
          key={item.id}
          href={item.href}
          variant="inline"
          loadingText="Opening…"
          className={cn('ec-nav-link', active && 'ec-nav-link--active')}
          aria-current={active ? 'page' : undefined}
        >
          {item.label.toLowerCase()}
        </LoadingLink>
      )
    })

  return (
    <div
      ref={navWrapRef}
      className={cn(
        'ec-nav-wrap ec-nav-wrap--auto-hide',
        config.transparentShell && 'ec-nav-wrap--transparent',
        scrolled && 'ec-nav-wrap--scrolled',
        hideHeader && 'ec-nav-wrap--hidden',
        mobileOpen && 'ec-nav-wrap--menu-open',
        `ec-nav-wrap--tone-${config.tone}`,
        `ec-nav-wrap--layout-${config.tone}`
      )}
    >
      <header className="ec-nav">
        <div className="ec-nav-brand">
          <WordmarkLink href={config.wordmarkHref} size="sm" />
          {config.context ? <SiteHeaderContext context={config.context} /> : null}
        </div>

        <nav className="ec-nav-links" aria-label="Main">
          {renderNavLinks()}
        </nav>

        <div
          className={cn(
            'ec-nav-right',
            config.transparentShell && 'ec-nav-right--frost'
          )}
        >
          {variant === 'app' ? (
            <>
              <GuestSignInChip />
              <CreditChip />
            </>
          ) : null}
          <div
            className={cn(
              'ec-nav-utils',
              config.transparentShell && 'ec-nav-utils--frost'
            )}
          >
            {showNotifications ? <NotificationBell dismiss={mobileOpen} /> : null}
            <ThemeFlip />
          </div>
          {showPageCtas ? (
            <>
              {visibleSecondaryCta ? (
                <LoadingLink
                  href={visibleSecondaryCta.href}
                  className={cn(
                    CTA_CLASS[visibleSecondaryCta.style],
                    'hidden min-[901px]:inline-flex'
                  )}
                  loadingText="Opening…"
                >
                  <CtaLabel cta={visibleSecondaryCta} />
                </LoadingLink>
              ) : null}
              {showPrimaryCta
                ? renderPrimaryCta(
                    cn(
                      CTA_CLASS[config.primaryCta.style],
                      'ec-nav-cta-compact inline-flex min-[901px]:hidden',
                      config.primaryCta.style === 'primary' && 'brand-pulse'
                    )
                  )
                : null}
              {showPrimaryCta
                ? renderPrimaryCta(
                    cn(
                      CTA_CLASS[config.primaryCta.style],
                      'ec-nav-mark-mobile hidden min-[901px]:inline-flex',
                      config.primaryCta.style === 'primary' && 'brand-pulse'
                    )
                  )
                : null}
            </>
          ) : null}
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
          {/* Account avatar lives last so it sits in the far top-right corner. */}
          {renderDesktopAuth()}
          {showMobileMenu ? (
            <button
              ref={burgerRef}
              type="button"
              className="ec-nav-burger"
              aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={mobileOpen}
              onClick={() => {
                setRestoreMenuFocus(true)
                setMobileOpen((v) => !v)
              }}
            >
              {mobileOpen ? '✕' : '☰'}
            </button>
          ) : null}
        </div>
      </header>

      {mounted && showMobileMenu && mobileOpen
        ? createPortal(
            <>
              <button
                type="button"
                className="ec-nav-mobile-backdrop"
                aria-label="Close menu"
                onClick={() => closeMobileMenu(true)}
              />
              <div
                ref={mobileSheetRef}
                className="ec-nav-mobile-sheet"
                role="dialog"
                aria-modal="true"
                aria-label="Navigation menu"
              >
                <div className="ec-nav-mobile-sheet-head">
                  <p className="ec-nav-mobile-sheet-title">Menu</p>
                  <button
                    type="button"
                    className="ec-nav-mobile-sheet-close"
                    aria-label="Close menu"
                    onClick={() => closeMobileMenu(true)}
                  >
                    ✕
                  </button>
                </div>
                {config.context ? (
                  <div className="ec-nav-mobile-context">
                    <SiteHeaderContext context={config.context} />
                  </div>
                ) : null}
                <div
                  className="ec-nav-mobile-menu ec-nav-mobile-menu--open"
                  role="navigation"
                  aria-label="Mobile"
                >
                  {showPrimaryCta
                    ? renderPrimaryCta(
                        cn('ec-nav-mobile-mark', CTA_CLASS[config.primaryCta.style]),
                        navigateFromMenu
                      )
                    : null}
                  {visibleSecondaryCta ? (
                    <LoadingLink
                      href={visibleSecondaryCta.href}
                      className={cn('ec-nav-mobile-secondary', CTA_CLASS[visibleSecondaryCta.style])}
                      loadingText="Opening…"
                      onNavigate={navigateFromMenu}
                    >
                      <CtaLabel cta={visibleSecondaryCta} />
                    </LoadingLink>
                  ) : null}
                  <NavMobileMenu
                    items={navItems}
                    pathname={pathname}
                    className="ec-nav-mobile-menu-items"
                    linkClassName="ec-nav-mobile-link"
                    activeClassName="ec-nav-mobile-link--active"
                    onNavigate={navigateFromMenu}
                    extraLinks={mobileExtra}
                    extraLinksLabel={
                      variant === 'marketing' || variant === 'reading' ? 'Explore' : 'More'
                    }
                  />
                  {variant === 'marketing' || variant === 'reading' ? (
                    isGuest ? (
                      <div className="ec-nav-mobile-auth">
                        <Link href={signInHref} onClick={navigateFromMenu}>
                          Sign in
                        </Link>
                        <Link href={buildMarketingSignUpHref()} onClick={navigateFromMenu}>
                          Create free account
                        </Link>
                      </div>
                    ) : (
                      <Link
                        href="/account"
                        className="ec-nav-mobile-link"
                        onClick={navigateFromMenu}
                      >
                        Account
                      </Link>
                    )
                  ) : isGuest ? (
                    <div className="ec-nav-mobile-auth">
                      <Link href={buildSignInHref(signInNext)} onClick={navigateFromMenu}>
                        Sign in
                      </Link>
                      <Link href={buildSignUpHref('/dashboard')} onClick={navigateFromMenu}>
                        Create free account
                      </Link>
                    </div>
                  ) : (
                    <Link
                      href="/account"
                      className="ec-nav-mobile-link"
                      onClick={navigateFromMenu}
                    >
                      Account
                    </Link>
                  )}
                  <div className="ec-nav-mobile-footer">
                    <div className="ec-nav-mobile-footer-row">
                      <span className="ec-nav-mobile-footer-label">Appearance</span>
                      <ThemeFlip className="ec-nav-mobile-theme" />
                    </div>
                  </div>
                </div>
              </div>
            </>,
            document.body
          )
        : null}
    </div>
  )
}
