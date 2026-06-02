'use client'

import { useEffect, useState } from 'react'
import { WordmarkLink } from '@/components/layout/Wordmark'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Menu, X, Sparkles } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { ThemeSwitcher } from '@/components/design-system/ThemeSwitcher'
import { buildSignUpHref, MARKETING_SIGNUP_DEST } from '@/lib/auth-redirect'
import { MARKETING_NAV } from '@/lib/site-config'
import { useOmniAI } from '@/lib/omni-ai/context'

/** Center nav — CTA is separate so "Mark a paper" is not duplicated. */
const DESKTOP_NAV = MARKETING_NAV.filter((item) => item.href !== '/mark')

function isNavActive(pathname: string, href: string) {
  return pathname === href || (href !== '/' && pathname.startsWith(href + '/'))
}

export function MarketingHeader() {
  const pathname = usePathname()
  const { setIsOpen } = useOmniAI()
  const [scrolled, setScrolled] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    setMobileOpen(false)
  }, [pathname])

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [mobileOpen])

  return (
    <>
      <header
        className={`ec-marketing-header sticky top-0 z-50 border-b transition-[background,box-shadow,backdrop-filter] duration-300 ${
          scrolled ? 'ec-marketing-header--scrolled' : ''
        }`}
      >
        <div className="ec-marketing-header__inner mx-auto flex max-w-7xl items-center gap-3 px-4 py-2.5 sm:px-6 lg:gap-4">
          <WordmarkLink href="/" size="sm" />

          <nav
            className="ec-marketing-header__nav hidden min-w-0 flex-1 items-center justify-center lg:flex"
            aria-label="Main"
          >
            <ul className="flex list-none items-center gap-0.5 p-0 m-0">
              {DESKTOP_NAV.map((item) => {
                const active = isNavActive(pathname, item.href)
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={`ec-marketing-header__link ${active ? 'ec-marketing-header__link--active' : ''}`}
                      aria-current={active ? 'page' : undefined}
                    >
                      {item.label}
                    </Link>
                  </li>
                )
              })}
            </ul>
          </nav>

          <div className="ec-marketing-header__actions flex shrink-0 items-center gap-2">
            <div className="hidden lg:block">
              <ThemeSwitcher compact />
            </div>

            <button
              type="button"
              onClick={() => setIsOpen(true)}
              className="ec-marketing-header__ask hidden lg:inline-flex"
              title="Ask MarkScheme"
            >
              <Sparkles className="h-4 w-4 shrink-0 ec-text-brand" aria-hidden />
              <span className="hidden 2xl:inline">Ask MarkScheme</span>
              <span className="2xl:hidden">Ask</span>
            </button>

            <Link href="/auth/signin" className="ec-marketing-header__signin hidden lg:inline-flex">
              Sign in
            </Link>

            <Link href="/mark" className="ec-btn-primary ec-marketing-header__cta hidden lg:inline-flex">
              Mark a paper
            </Link>

            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="ec-marketing-header__menu inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl border border-[var(--ec-border)] lg:hidden"
              aria-label="Open menu"
            >
              <Menu className="h-5 w-5 ec-text-primary" />
            </button>
          </div>
        </div>
      </header>

      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[70] ec-modal-backdrop lg:hidden"
              onClick={() => setMobileOpen(false)}
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', stiffness: 320, damping: 32 }}
              className="fixed inset-y-0 right-0 z-[71] flex w-[min(100vw,320px)] flex-col border-l ec-border-color bg-[var(--ec-surface)] lg:hidden"
            >
              <div className="flex items-center justify-between border-b ec-border-color px-5 py-4">
                <span className="font-bold ec-text-gradient">MarkScheme</span>
                <button
                  type="button"
                  onClick={() => setMobileOpen(false)}
                  className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg"
                  aria-label="Close menu"
                >
                  <X className="h-5 w-5 ec-text-primary" />
                </button>
              </div>
              <nav className="flex-1 overflow-y-auto px-4 py-4" aria-label="Mobile">
                {MARKETING_NAV.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex min-h-[48px] items-center rounded-xl px-4 text-base font-medium transition-colors hover:bg-[var(--ec-surface-raised)] ${
                      isNavActive(pathname, item.href)
                        ? 'ec-text-brand'
                        : 'ec-text-primary'
                    }`}
                  >
                    {item.label}
                  </Link>
                ))}
                <button
                  type="button"
                  onClick={() => {
                    setMobileOpen(false)
                    setIsOpen(true)
                  }}
                  className="mt-2 flex min-h-[48px] w-full items-center gap-2 rounded-xl px-4 text-base font-medium ec-text-primary transition-colors hover:bg-[var(--ec-surface-raised)]"
                >
                  <Sparkles className="h-4 w-4 ec-text-brand" />
                  Ask MarkScheme
                </button>
              </nav>
              <div className="space-y-3 border-t ec-border-color p-4">
                <div className="flex justify-center pb-1">
                  <ThemeSwitcher />
                </div>
                <Link
                  href="/mark"
                  className="ec-btn-primary flex min-h-[48px] w-full justify-center text-base"
                >
                  Mark a paper
                </Link>
                <Link
                  href="/auth/signin"
                  className="flex min-h-[48px] items-center justify-center rounded-xl border border-[var(--ec-border)] text-base font-semibold ec-text-primary"
                >
                  Sign in
                </Link>
                <Link
                  href={buildSignUpHref(MARKETING_SIGNUP_DEST)}
                  className="flex min-h-[48px] items-center justify-center text-base font-medium ec-text-secondary"
                >
                  Create free account
                </Link>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
