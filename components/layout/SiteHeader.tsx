'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Sparkles } from 'lucide-react'
import { ThemeSwitcher } from '@/components/design-system/ThemeSwitcher'
import { useOmniAI } from '@/lib/omni-ai/context'

interface SiteHeaderProps {
  /** Hide nav links on auth pages */
  minimal?: boolean
}

export function SiteHeader({ minimal = false }: SiteHeaderProps) {
  const pathname = usePathname()
  const { setIsOpen } = useOmniAI()

  return (
    <header
      className="sticky top-0 z-50 border-b backdrop-blur-xl"
      style={{
        borderColor: 'var(--ec-border)',
        background: 'color-mix(in srgb, var(--ec-canvas) 85%, transparent)',
      }}
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <Link
          href="/"
          className="flex shrink-0 items-center gap-2 text-lg font-bold tracking-tight ec-text-gradient"
        >
          Examcore
        </Link>

        {!minimal && (
          <nav className="hidden items-center gap-6 md:flex">
            <Link
              href="/dashboard"
              className="text-sm font-medium transition-colors duration-300"
              style={{ color: 'var(--ec-text-secondary)' }}
            >
              Dashboard
            </Link>
            <Link
              href="/mark"
              className="text-sm font-medium transition-colors duration-300"
              style={{ color: 'var(--ec-text-secondary)' }}
            >
              Mark
            </Link>
          </nav>
        )}

        <div className="flex items-center gap-2 sm:gap-3">
          <ThemeSwitcher />
          <button
            type="button"
            onClick={() => setIsOpen(true)}
            className="ec-btn-primary text-sm"
            style={{ padding: '8px 16px' }}
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
