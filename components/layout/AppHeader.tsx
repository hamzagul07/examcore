'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Sparkles } from 'lucide-react'
import { ThemeSwitcher } from '@/components/design-system/ThemeSwitcher'
import { WordmarkLink } from '@/components/layout/Wordmark'
import { CreditChip } from '@/components/billing/CreditChip'
import { useOmniAI } from '@/lib/omni-ai/context'

/** App chrome for /mark, /dashboard, and other authenticated routes. */
export function AppHeader() {
  const pathname = usePathname()
  const { setIsOpen } = useOmniAI()

  return (
    <header
      className="ec-app-header sticky top-0 z-50 border-b lg:backdrop-blur-xl"
      style={{
        borderColor: 'var(--ec-border)',
      }}
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <WordmarkLink href="/" size="sm" />

        <nav className="hidden items-center gap-6 md:flex">
          <Link
            href="/dashboard"
            className="text-sm font-medium transition-colors duration-300"
            style={{
              color:
                pathname.startsWith('/dashboard')
                  ? 'var(--ec-text-primary)'
                  : 'var(--ec-text-secondary)',
            }}
          >
            Dashboard
          </Link>
          <Link
            href="/mark"
            className="text-sm font-medium transition-colors duration-300"
            style={{
              color:
                pathname.startsWith('/mark')
                  ? 'var(--ec-text-primary)'
                  : 'var(--ec-text-secondary)',
            }}
          >
            Mark
          </Link>
        </nav>

        <div className="flex items-center gap-2 sm:gap-3">
          <CreditChip />
          <ThemeSwitcher />
          <button
            type="button"
            onClick={() => setIsOpen(true)}
            className="ec-btn-primary hidden min-h-[44px] text-sm lg:inline-flex"
          >
            <Sparkles className="h-4 w-4" />
            <span className="hidden sm:inline">Ask Examcore</span>
            <span className="sm:hidden">Ask</span>
          </button>
        </div>
      </div>
    </header>
  )
}
