'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ThemeSwitcher } from '@/components/design-system/ThemeSwitcher'
import { cn } from '@/lib/utils'

const NAV = [
  { href: '/teacher/dashboard', label: 'Classrooms', stamp: 'CL' },
  { href: '/teacher/reviews', label: 'Reviews', stamp: 'RV' },
]

/**
 * `showNav: false` renders the teacher header without its links.
 *
 * Used on teacher setup, where the visitor is not a teacher yet: Classrooms and
 * Reviews would both 403 them. They still get the teacher wordmark, so they can
 * see which part of the product they are in, and a way to sign out.
 */
export function TeacherNav({ showNav = true }: { showNav?: boolean } = {}) {
  const pathname = usePathname()

  return (
    <header
      className="ec-app-header sticky top-0 z-50 border-b border-[var(--ec-border)] bg-[var(--ec-paper,var(--ec-surface))]"
    >
      <div className="mx-auto flex w-full min-w-0 max-w-7xl items-center gap-2 overflow-x-clip px-3 py-2.5 sm:gap-3 sm:px-6 sm:py-3">
        <Link
          href={showNav ? '/teacher/dashboard' : '/for-teachers'}
          className="flex shrink-0 items-center gap-2 max-[420px]:gap-1.5"
        >
          <span
            className="inline-grid h-6 min-w-6 shrink-0 place-items-center rounded border border-[var(--ec-brand-border)] bg-[var(--ec-brand-muted)] px-1.5 font-mono text-[10px] font-bold tracking-wide text-[var(--ec-brand)]"
            aria-hidden
          >
            TCH
          </span>
          <span className="font-bold text-[var(--ec-text-primary)] max-[420px]:text-sm">
            MarkScheme{' '}
            <span className="font-normal text-[var(--ec-text-secondary)] max-[420px]:hidden">
              Teacher
            </span>
          </span>
        </Link>

        {!showNav && <div className="min-w-0 flex-1" />}

        {showNav && (
        <nav
          className="flex min-w-0 flex-1 items-center justify-center gap-1 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] sm:justify-start [&::-webkit-scrollbar]:hidden"
          aria-label="Teacher navigation"
        >
          {NAV.map(({ href, label, stamp }) => {
            const active = pathname === href || pathname.startsWith(`${href}/`)
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  'flex min-h-[44px] shrink-0 items-center gap-2 rounded px-3 py-2 text-sm transition-colors',
                  active
                    ? 'border border-[var(--ec-brand-border)] bg-[var(--ec-brand-muted)] text-[var(--ec-text-primary)] shadow-[var(--ec-shadow-hard,2px_2px_0_rgba(0,0,0,0.06))]'
                    : 'text-[var(--ec-text-secondary)] hover:bg-[var(--ec-surface-raised)] hover:text-[var(--ec-text-primary)]'
                )}
                aria-current={active ? 'page' : undefined}
              >
                <span className="font-mono text-[10px] font-bold tracking-wide" aria-hidden>
                  {stamp}
                </span>
                <span className="whitespace-nowrap">{label}</span>
              </Link>
            )
          })}
        </nav>
        )}

        <div className="flex shrink-0 items-center gap-1 sm:gap-2">
          <ThemeSwitcher />
          <Link
            href="/account"
            className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded text-[var(--ec-text-secondary)] transition-colors hover:bg-[var(--ec-surface-raised)] hover:text-[var(--ec-text-primary)]"
            aria-label="Account settings"
          >
            <span className="font-mono text-[11px] font-bold tracking-wide" aria-hidden>
              ACC
            </span>
          </Link>
          <form action="/auth/signout" method="POST" className="inline">
            <button
              type="submit"
              className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded text-[var(--ec-text-secondary)] transition-colors hover:bg-[var(--ec-surface-raised)] hover:text-[var(--ec-text-primary)]"
              aria-label="Sign out"
            >
              <span className="font-mono text-[11px] font-bold tracking-wide" aria-hidden>
                OUT
              </span>
            </button>
          </form>
        </div>
      </div>
    </header>
  )
}
