'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, PenLine, LineChart, User } from 'lucide-react'
import { cn } from '@/lib/utils'

type TabItem = {
  href: string
  label: string
  icon: typeof Home
  match: (p: string) => boolean
  primary?: boolean
}

const TABS: TabItem[] = [
  { href: '/dashboard', label: 'Home', icon: Home, match: (p: string) => p === '/dashboard' },
  {
    href: '/mark',
    label: 'Mark',
    icon: PenLine,
    primary: true,
    match: (p: string) => p === '/mark' || p.startsWith('/mark/'),
  },
  {
    href: '/dashboard/progress',
    label: 'Progress',
    icon: LineChart,
    match: (p: string) =>
      p.startsWith('/dashboard/progress') || p.startsWith('/dashboard/attempt/'),
  },
  {
    href: '/account',
    label: 'Account',
    icon: User,
    match: (p: string) => p.startsWith('/account'),
  },
]

export function MobileTabBar() {
  const pathname = usePathname()

  return (
    <nav
      aria-label="Main navigation"
      className="fixed inset-x-0 bottom-0 z-40 border-t lg:hidden"
      style={{
        borderColor: 'var(--ec-border)',
        background: 'color-mix(in srgb, var(--ec-canvas) 92%, transparent)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        boxShadow: '0 -4px 24px rgba(0, 0, 0, 0.18)',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      }}
    >
      <div className="mx-auto flex h-16 max-w-lg items-stretch justify-around px-2">
        {TABS.map(({ href, label, icon: Icon, match, primary }) => {
          const active = match(pathname)
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'relative flex min-h-[44px] min-w-[44px] flex-1 flex-col items-center justify-center gap-0.5 rounded-xl transition-colors',
                active ? 'text-[var(--ec-brand)]' : 'text-[var(--ec-text-secondary)]'
              )}
              aria-current={active ? 'page' : undefined}
            >
              {primary && active && (
                <span
                  className="absolute bottom-1 h-0.5 w-5 rounded-full"
                  style={{ background: 'var(--ec-brand)' }}
                  aria-hidden
                />
              )}
              <Icon
                className={cn(
                  'shrink-0 transition-transform',
                  primary ? 'h-6 w-6' : 'h-5 w-5',
                  active && primary && 'scale-110'
                )}
                strokeWidth={active ? 2.25 : 1.75}
              />
              <span className="text-[12px] font-medium leading-none">{label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
