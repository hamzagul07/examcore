'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  BookOpen,
  ClipboardCheck,
  LogOut,
  Settings,
} from 'lucide-react'
import { ThemeSwitcher } from '@/components/design-system/ThemeSwitcher'
import { cn } from '@/lib/utils'

const NAV = [
  { href: '/teacher/dashboard', label: 'Classrooms', icon: LayoutDashboard },
  { href: '/teacher/reviews', label: 'Reviews', icon: ClipboardCheck },
]

export function TeacherNav() {
  const pathname = usePathname()

  return (
    <header
      className="ec-app-header sticky top-0 z-50 border-b lg:backdrop-blur-xl"
      style={{ borderColor: 'var(--ec-border)' }}
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <Link href="/teacher/dashboard" className="flex shrink-0 items-center gap-2">
          <BookOpen className="h-5 w-5 text-[var(--ec-brand)]" aria-hidden />
          <span className="font-bold text-[var(--ec-text-primary)]">
            Examcore{' '}
            <span className="font-normal text-[var(--ec-text-secondary)]">Teacher</span>
          </span>
        </Link>

        <nav
          className="flex min-w-0 flex-1 items-center justify-center gap-1 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] sm:justify-start [&::-webkit-scrollbar]:hidden"
          aria-label="Teacher navigation"
        >
          {NAV.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(`${href}/`)
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  'flex min-h-[44px] shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors',
                  active
                    ? 'bg-[var(--ec-brand-muted)] text-[var(--ec-text-primary)]'
                    : 'text-[var(--ec-text-secondary)] hover:bg-[var(--ec-surface-raised)] hover:text-[var(--ec-text-primary)]'
                )}
                aria-current={active ? 'page' : undefined}
              >
                <Icon className="h-4 w-4" aria-hidden />
                <span className="whitespace-nowrap">{label}</span>
              </Link>
            )
          })}
        </nav>

        <div className="flex shrink-0 items-center gap-1 sm:gap-2">
          <ThemeSwitcher />
          <Link
            href="/account"
            className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg text-[var(--ec-text-secondary)] transition-colors hover:bg-[var(--ec-surface-raised)] hover:text-[var(--ec-text-primary)]"
            aria-label="Account settings"
          >
            <Settings className="h-4 w-4" />
          </Link>
          <Link
            href="/auth/signout"
            className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg text-[var(--ec-text-secondary)] transition-colors hover:bg-[var(--ec-surface-raised)] hover:text-[var(--ec-text-primary)]"
            aria-label="Sign out"
          >
            <LogOut className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </header>
  )
}
