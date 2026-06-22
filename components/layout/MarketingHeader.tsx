'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { WordmarkLink } from '@/components/layout/Wordmark'
import { buildMarketingSignUpHref } from '@/lib/auth-redirect'
import { MARKETING_NAV_PRIMARY, MARKETING_NAV_SECONDARY, isGuidesBlogNavActive } from '@/lib/marketing-nav'
import { CommandKTrigger, MobileSearchMenuButton, ThemeFlip } from '@/components/margin-notes'
import { NavDropdown } from '@/components/layout/NavDropdown'

function isNavActive(pathname: string, href: string) {
  if (href === '/guides') {
    return isGuidesBlogNavActive(pathname)
  }
  if (href === '/dashboard') {
    return (
      pathname === '/dashboard' ||
      pathname.startsWith('/dashboard/') ||
      pathname.startsWith('/account')
    )
  }
  return pathname === href || (href !== '/' && pathname.startsWith(href + '/'))
}

export function MarketingHeader() {
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    setMobileOpen(false)
  }, [pathname])

  return (
    <div className="ec-nav-wrap">
      <header className="ec-nav">
        <WordmarkLink href="/" size="sm" />

        <nav className="ec-nav-links" aria-label="Main">
          {MARKETING_NAV_PRIMARY.map((item) => {
            if (item.children) {
              return (
                <NavDropdown
                  key={item.label}
                  label={item.label}
                  items={item.children}
                  isActive={(href) => isNavActive(pathname, href)}
                  triggerClass="ec-nav-link"
                  activeClass="ec-nav-link--active"
                  lowercase
                />
              )
            }
            const active = isNavActive(pathname, item.href)
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
          <CommandKTrigger />
          <ThemeFlip />
          <Link href="/auth/signin" className="ec-nav-link ec-nav-signin">
            sign in
          </Link>
          <Link href="/mark" className="ec-btn-primary ec-btn-primary--sm hidden min-[901px]:inline-flex">
            Mark a question
          </Link>
          <button
            type="button"
            className="ec-nav-burger"
            aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen((v) => !v)}
          >
            {mobileOpen ? '✕' : '☰'}
          </button>
        </div>
      </header>

      {mobileOpen ? (
        <nav
          className="ec-nav-mobile-menu ec-nav-mobile-menu--open"
          aria-label="Mobile"
        >
          <Link href="/mark" className="ec-nav-mobile-mark">
            Mark a question
          </Link>
          <MobileSearchMenuButton />
          {MARKETING_NAV_PRIMARY.map((item) =>
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
          {MARKETING_NAV_SECONDARY.map((item) => (
            <Link key={item.href} href={item.href}>
              {item.label}
            </Link>
          ))}
          <Link href="/auth/signin">Sign in</Link>
          <Link href={buildMarketingSignUpHref()}>Create free account</Link>
        </nav>
      ) : null}
    </div>
  )
}
