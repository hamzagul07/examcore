'use client'

import { useEffect, useState } from 'react'
import { WordmarkLink } from '@/components/layout/Wordmark'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Menu, X, Sparkles } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { ThemeSwitcher } from '@/components/design-system/ThemeSwitcher'
import { MARKETING_NAV } from '@/lib/site-config'
import { useOmniAI } from '@/lib/omni-ai/context'

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
        className="sticky top-0 z-50 border-b transition-[background,backdrop-filter] duration-300"
        style={{
          borderColor: 'var(--ec-border)',
          background: scrolled
            ? 'color-mix(in srgb, var(--ec-canvas) 92%, transparent)'
            : 'color-mix(in srgb, var(--ec-canvas) 70%, transparent)',
          backdropFilter: scrolled ? 'blur(16px)' : 'blur(8px)',
        }}
      >
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <WordmarkLink href="/" size="sm" />

          <nav className="hidden items-center gap-1 lg:flex" aria-label="Main">
            {MARKETING_NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-[var(--ec-surface-raised)]"
                style={{
                  color:
                    pathname === item.href || pathname.startsWith(item.href + '/')
                      ? 'var(--ec-text-primary)'
                      : 'var(--ec-text-secondary)',
                }}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-2 sm:gap-3">
            <ThemeSwitcher />
            <button
              type="button"
              onClick={() => setIsOpen(true)}
              className="hidden items-center gap-2 rounded-xl border border-[var(--ec-border)] px-3 py-2 text-sm font-medium transition-colors hover:bg-[var(--ec-surface-raised)] sm:inline-flex"
              style={{ color: 'var(--ec-text-secondary)' }}
            >
              <Sparkles className="h-4 w-4 text-emerald-400" />
              Ask Omni
            </button>
            <Link
              href="/auth/signin"
              className="hidden text-sm font-medium transition-colors sm:inline-block"
              style={{ color: 'var(--ec-text-secondary)' }}
            >
              Sign in
            </Link>
            <Link
              href="/auth/signup"
              className="ec-btn-primary hidden text-sm sm:inline-flex"
              style={{ padding: '8px 18px' }}
            >
              Get started free
            </Link>
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl border border-[var(--ec-border)] lg:hidden"
              aria-label="Open menu"
            >
              <Menu className="h-5 w-5" style={{ color: 'var(--ec-text-primary)' }} />
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
              className="fixed inset-0 z-[70] bg-black/60 backdrop-blur-sm lg:hidden"
              onClick={() => setMobileOpen(false)}
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', stiffness: 320, damping: 32 }}
              className="fixed inset-y-0 right-0 z-[71] flex w-[min(100vw,320px)] flex-col border-l lg:hidden"
              style={{
                borderColor: 'var(--ec-border)',
                background: 'var(--ec-surface)',
              }}
            >
              <div className="flex items-center justify-between border-b px-5 py-4" style={{ borderColor: 'var(--ec-border)' }}>
                <span className="font-bold ec-text-gradient">Examcore</span>
                <button
                  type="button"
                  onClick={() => setMobileOpen(false)}
                  className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg"
                  aria-label="Close menu"
                >
                  <X className="h-5 w-5" style={{ color: 'var(--ec-text-primary)' }} />
                </button>
              </div>
              <nav className="flex-1 overflow-y-auto px-4 py-4" aria-label="Mobile">
                {MARKETING_NAV.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="flex min-h-[48px] items-center rounded-xl px-4 text-base font-medium transition-colors hover:bg-[var(--ec-surface-raised)]"
                    style={{ color: 'var(--ec-text-primary)' }}
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
                  className="mt-2 flex min-h-[48px] w-full items-center gap-2 rounded-xl px-4 text-base font-medium transition-colors hover:bg-[var(--ec-surface-raised)]"
                  style={{ color: 'var(--ec-text-primary)' }}
                >
                  <Sparkles className="h-4 w-4 text-emerald-400" />
                  Ask Omni
                </button>
              </nav>
              <div className="space-y-3 border-t p-4" style={{ borderColor: 'var(--ec-border)' }}>
                <Link
                  href="/auth/signin"
                  className="flex min-h-[48px] items-center justify-center rounded-xl border border-[var(--ec-border)] text-base font-semibold"
                  style={{ color: 'var(--ec-text-primary)' }}
                >
                  Sign in
                </Link>
                <Link
                  href="/auth/signup"
                  className="ec-btn-primary flex min-h-[48px] w-full justify-center text-base"
                >
                  Get started free
                </Link>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
