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
      <div className="mx-auto flex w-full min-w-0 max-w-7xl items-center gap-2 px-3 py-2.5 sm:gap-3 sm:px-6 sm:py-3">
        <WordmarkLink href="/" size="sm" />

        <nav className="hidden min-w-0 items-center gap-6 md:flex">
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
          <Link
            href="/dashboard/progress"
            className="text-sm font-medium transition-colors duration-300"
            style={{
              color:
                pathname.startsWith('/dashboard/progress') ||
                pathname.startsWith('/dashboard/attempt/')
                  ? 'var(--ec-text-primary)'
                  : 'var(--ec-text-secondary)',
            }}
          >
            Progress
          </Link>
          <Link
            href="/account"
            className="text-sm font-medium transition-colors duration-300"
            style={{
              color:
                pathname.startsWith('/account')
                  ? 'var(--ec-text-primary)'
                  : 'var(--ec-text-secondary)',
            }}
          >
            Account
          </Link>
        </nav>

        <div className="ml-auto flex min-w-0 shrink items-center justify-end gap-1 sm:gap-2">
          <CreditChip />
          <div className="hidden shrink-0 sm:block">
            <ThemeSwitcher />
          </div>
          <button
            type="button"
            onClick={() => setIsOpen(true)}
            className="ec-btn-primary inline-flex min-h-[44px] shrink-0 justify-center px-3 text-sm sm:min-w-[44px] sm:px-4 lg:px-5"
            aria-label="Ask Examcore"
          >
            <Sparkles className="h-4 w-4 shrink-0" />
            <span className="hidden lg:inline">Ask Examcore</span>
            <span className="hidden sm:inline lg:hidden">Ask</span>
          </button>
        </div>
      </div>
    </header>
  )
}
