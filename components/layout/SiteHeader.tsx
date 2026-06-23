'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { WordmarkLink } from '@/components/layout/Wordmark'
import { SiteHeaderContext } from '@/components/layout/SiteHeaderContext'
import { CreditChip } from '@/components/billing/CreditChip'
import { GuestSignInChip } from '@/components/billing/GuestSignInChip'
import { LoadingLink } from '@/components/ui/LoadingLink'
import { CommandKTrigger, MobileSearchMenuButton, ThemeFlip } from '@/components/margin-notes'
import { NotificationBell } from '@/components/community/NotificationBell'
import { NavDropdown } from '@/components/layout/NavDropdown'
import { NavMobileMenu } from '@/components/layout/NavMobileMenu'
import { useAuthenticatedAppChrome } from '@/lib/hooks/useAuthenticatedAppChrome'
import { avatarInitial, useAuthCheck } from '@/lib/hooks/useAuthCheck'
import { useHeaderScroll } from '@/lib/hooks/useHeaderScroll'
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

export function SiteHeader({ variant }: Props) {
  const pathname = usePathname()
  const config = getSiteHeaderConfig(pathname, variant)
  const navItems = getNavItemsForConfig(variant, config)
  const [mobileOpen, setMobileOpen] = useState(false)
  const { scrolled, hidden: headerHidden } = useHeaderScroll(mobileOpen)
  const { user, loading } = useAuthCheck()
  const initial = avatarInitial(user)
  const isGuest = !loading && !user
  const authenticatedChrome = useAuthenticatedAppChrome()
  const showTabBar = variant === 'app' && authenticatedChrome

  useEffect(() => {
    setMobileOpen(false)
  }, [pathname])

  useEffect(() => {
    if (!mobileOpen) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [mobileOpen])

  const signInNext = isSafeNextPath(pathname)
    ? pathname
    : variant === 'reading'
      ? '/courses'
      : '/dashboard'
  const showMobileMenu = variant === 'app' ? !showTabBar : true

  const mobileExtra =
    variant === 'marketing' || variant === 'reading'
      ? MARKETING_NAV_SECONDARY
      : variant === 'app'
        ? [{ href: '/pricing', label: 'Pricing' }]
        : []

  const showNotifications =
    variant === 'marketing' || variant === 'reading' || variant === 'app'

  const showPageCtas = config.tone !== 'mark' || variant !== 'app'

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
      className={cn(
        'ec-nav-wrap ec-nav-wrap--auto-hide',
        config.transparentShell && 'ec-nav-wrap--transparent',
        scrolled && 'ec-nav-wrap--scrolled',
        headerHidden && !mobileOpen && 'ec-nav-wrap--hidden',
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
            <CommandKTrigger />
            {showNotifications ? <NotificationBell /> : null}
            <ThemeFlip />
          </div>
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
              <LoadingLink
                href={buildSignInHref(signInNext)}
                variant="inline"
                loadingText="Signing in…"
                className="ec-nav-link ec-nav-signin"
              >
                sign in
              </LoadingLink>
            )
          ) : (
            <LoadingLink
              href={variant === 'marketing' ? '/auth/signin' : buildSignInHref(signInNext)}
              variant="inline"
              loadingText="Signing in…"
              className="ec-nav-link ec-nav-signin"
            >
              sign in
            </LoadingLink>
          )}
          {showPageCtas ? (
            <>
              {config.secondaryCta ? (
                <LoadingLink
                  href={config.secondaryCta.href}
                  className={cn(
                    CTA_CLASS[config.secondaryCta.style],
                    'hidden min-[901px]:inline-flex'
                  )}
                  loadingText="Opening…"
                >
                  <CtaLabel cta={config.secondaryCta} />
                </LoadingLink>
              ) : null}
              <LoadingLink
                href={config.primaryCta.href}
                className={cn(
                  CTA_CLASS[config.primaryCta.style],
                  'ec-nav-mark-mobile hidden min-[901px]:inline-flex',
                  config.primaryCta.style === 'primary' && 'brand-pulse'
                )}
                loadingText="Opening…"
              >
                <CtaLabel cta={config.primaryCta} />
              </LoadingLink>
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
          <LoadingLink
            href={config.primaryCta.href}
            className={cn('ec-nav-mobile-mark', CTA_CLASS[config.primaryCta.style])}
            loadingText="Opening…"
          >
            <CtaLabel cta={config.primaryCta} />
          </LoadingLink>
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
          {variant === 'marketing' || variant === 'reading' ? (
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
