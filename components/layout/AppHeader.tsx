'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Menu, Sparkles, X } from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'
import { ThemeSwitcher } from '@/components/design-system/ThemeSwitcher'
import { WordmarkLink } from '@/components/layout/Wordmark'
import { CreditChip } from '@/components/billing/CreditChip'
import { GuestSignInChip } from '@/components/billing/GuestSignInChip'
import { useOmniAI } from '@/lib/omni-ai/context'
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
  const { setIsOpen } = useOmniAI()
  const showTabBar = useAuthenticatedAppChrome()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [isGuest, setIsGuest] = useState(false)

  useEffect(() => {
    let cancelled = false
    void fetch('/api/auth/check', { cache: 'no-store' })
      .then((res) => (res.ok ? res.json() : { user: null }))
      .then((data: { user?: unknown }) => {
        if (!cancelled) setIsGuest(!data.user)
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

  useEffect(() => {
    if (!mobileOpen) return
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = ''
    }
  }, [mobileOpen])

  const showMobileMenu = !showTabBar
  const signInNext = isSafeNextPath(pathname) ? pathname : '/dashboard'

  return (
    <>
      <header
        className="ec-app-header sticky top-0 z-50 border-b lg:backdrop-blur-xl"
        style={{
          borderColor: 'var(--ec-border)',
        }}
      >
        <div className="mx-auto flex w-full min-w-0 max-w-7xl items-center gap-2 overflow-x-clip px-3 py-2.5 sm:gap-3 sm:px-6 sm:py-3">
          <WordmarkLink href="/" size="sm" />

          <nav className="hidden min-w-0 items-center gap-6 md:flex" aria-label="Main">
            {APP_NAV_ITEMS.map((item) => {
              const active = item.isActive(pathname)
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="text-sm font-medium transition-colors duration-300"
                  style={{
                    color: active
                      ? 'var(--ec-text-primary)'
                      : 'var(--ec-text-secondary)',
                  }}
                  aria-current={active ? 'page' : undefined}
                >
                  {item.label}
                </Link>
              )
            })}
          </nav>

          <div className="ml-auto flex min-w-0 shrink items-center justify-end gap-1 sm:gap-2">
            <GuestSignInChip />
            <CreditChip />

            {showMobileMenu && (
              <button
                type="button"
                onClick={() => setIsOpen(true)}
                className="ec-header-icon-btn inline-flex md:hidden"
                aria-label="Ask MarkScheme"
              >
                <Sparkles className="h-5 w-5 text-[var(--ec-brand)]" />
              </button>
            )}

            <div className="hidden shrink-0 sm:block">
              <ThemeSwitcher />
            </div>

            <button
              type="button"
              onClick={() => setIsOpen(true)}
              className="ec-btn-primary hidden min-h-[44px] shrink-0 justify-center px-5 text-sm lg:inline-flex"
              aria-label="Ask MarkScheme"
            >
              <Sparkles className="h-4 w-4 shrink-0" />
              <span>Ask MarkScheme</span>
            </button>

            {showMobileMenu && (
              <button
                type="button"
                onClick={() => setMobileOpen(true)}
                className="ec-header-menu-btn inline-flex md:hidden"
                aria-label="Open menu"
                aria-expanded={mobileOpen}
              >
                <Menu className="h-5 w-5 text-[var(--ec-text-primary)]" />
              </button>
            )}
          </div>
        </div>
      </header>

      <AnimatePresence>
        {showMobileMenu && mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[70] ec-modal-backdrop md:hidden"
              onClick={() => setMobileOpen(false)}
              aria-hidden
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', stiffness: 320, damping: 32 }}
              className="fixed inset-y-0 right-0 z-[71] flex w-[min(100vw,320px)] flex-col border-l border-[var(--ec-border)] bg-[var(--ec-surface)] md:hidden"
              role="dialog"
              aria-modal="true"
              aria-label="App menu"
            >
              <div className="flex items-center justify-between border-b border-[var(--ec-border)] px-5 py-4">
                <span className="font-bold ec-text-gradient">Menu</span>
                <button
                  type="button"
                  onClick={() => setMobileOpen(false)}
                  className="ec-header-icon-btn"
                  aria-label="Close menu"
                >
                  <X className="h-5 w-5 text-[var(--ec-text-primary)]" />
                </button>
              </div>

              <nav className="flex-1 overflow-y-auto px-4 py-4" aria-label="Mobile">
                {APP_NAV_ITEMS.map((item) => {
                  const active = item.isActive(pathname)
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`flex min-h-[48px] items-center rounded-xl px-4 text-base font-medium transition-colors hover:bg-[var(--ec-surface-raised)] ${
                        active ? 'text-[var(--ec-brand)]' : 'text-[var(--ec-text-primary)]'
                      }`}
                      aria-current={active ? 'page' : undefined}
                    >
                      {item.label}
                    </Link>
                  )
                })}
                <button
                  type="button"
                  onClick={() => {
                    setMobileOpen(false)
                    setIsOpen(true)
                  }}
                  className="mt-2 flex min-h-[48px] w-full items-center gap-2 rounded-xl px-4 text-base font-medium text-[var(--ec-text-primary)] transition-colors hover:bg-[var(--ec-surface-raised)]"
                >
                  <Sparkles className="h-4 w-4 text-[var(--ec-brand)]" />
                  Ask MarkScheme
                </button>
              </nav>

              <div className="space-y-3 border-t border-[var(--ec-border)] p-4">
                <div className="flex justify-center pb-1 sm:hidden">
                  <ThemeSwitcher />
                </div>
                <Link
                  href="/mark"
                  className="ec-btn-primary flex min-h-[48px] w-full justify-center text-base"
                >
                  Mark a paper
                </Link>
                {isGuest && (
                  <>
                    <Link
                      href={buildSignInHref(signInNext)}
                      className="flex min-h-[48px] items-center justify-center rounded-xl border border-[var(--ec-border)] text-base font-semibold text-[var(--ec-text-primary)]"
                    >
                      Sign in
                    </Link>
                    <Link
                      href={buildSignUpHref('/dashboard')}
                      className="flex min-h-[48px] items-center justify-center text-base font-medium text-[var(--ec-text-secondary)]"
                    >
                      Create free account
                    </Link>
                  </>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
