'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useLayoutEffect } from 'react'
import { SETTINGS_NAV, settingsNavItem } from '@/lib/settings/nav'
import { SignOutButton } from '@/components/settings/SignOutButton'
import { AppSupportStrip } from '@/components/marketing/AppSupportStrip'
import { cn } from '@/lib/utils'

export function SettingsShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const active = settingsNavItem(pathname)
  const isIndex = pathname === '/account'

  useLayoutEffect(() => {
    if (typeof window === 'undefined') return
    const mq = window.matchMedia('(min-width: 1024px)')
    const sync = () => {
      if (mq.matches && isIndex) {
        router.replace('/account/profile')
      }
    }
    sync()
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [isIndex, router])

  return (
    <main className="app-shell app-shell-tabbed ms-settings-shell md:py-10 lg:py-14">
      <div className="mx-auto min-w-0 w-full max-w-5xl">
        {!isIndex && (
          <div className="mb-6 lg:hidden">
            <Link
              href="/account"
              className="inline-flex min-h-[44px] items-center gap-1.5 text-body font-semibold text-[var(--ec-text-secondary)] transition-colors hover:text-[var(--ec-brand)]"
            >
              <ChevronLeft className="h-4 w-4" aria-hidden />
              Settings
            </Link>
          </div>
        )}

        <header className="ms-settings-header animate-entry mb-8 lg:mb-10">
          <p className="ms-overline">Settings</p>
          <h1 className="ms-h2" style={{ marginTop: 12 }}>
            {isIndex ? (
              <>
                Your <em>account</em>
              </>
            ) : (
              active?.label ?? 'Settings'
            )}
          </h1>
          {(isIndex || active?.description) && (
            <p className="ms-lead" style={{ marginTop: 10, maxWidth: 520 }}>
              {isIndex
                ? 'Manage your profile, exam setup, billing, and preferences.'
                : active?.description}
            </p>
          )}
        </header>

        <div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:gap-10">
          <aside className="hidden shrink-0 lg:block lg:w-[220px]">
            <nav aria-label="Settings categories" className="sticky top-24 space-y-1">
              {SETTINGS_NAV.map((item) => {
                const isActive =
                  pathname === item.href || pathname.startsWith(`${item.href}/`)
                const Icon = item.icon
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      'flex min-h-[44px] items-center gap-2.5 rounded-xl px-3 py-2.5 text-body font-medium transition-colors',
                      isActive
                        ? 'text-[var(--ec-brand)]'
                        : 'text-[var(--ec-text-secondary)] hover:bg-[var(--ec-brand-muted)] hover:text-[var(--ec-text-primary)]'
                    )}
                    style={
                      isActive
                        ? { background: 'var(--ec-brand-muted)' }
                        : undefined
                    }
                    aria-current={isActive ? 'page' : undefined}
                  >
                    <Icon className="h-4 w-4 shrink-0" aria-hidden />
                    {item.label}
                  </Link>
                )
              })}
            </nav>
          </aside>

          <div className="min-w-0 flex-1 animate-entry">{children}</div>
        </div>
      </div>
    </main>
  )
}

export function SettingsMobileIndex() {
  return (
    <div className="ms-acct-grid lg:hidden">
      {SETTINGS_NAV.map((item) => {
        const Icon = item.icon
        return (
          <Link
            key={item.href}
            href={item.href}
            className="ms-acct-card flex min-h-[56px] items-center gap-3 transition-colors hover:border-[var(--ec-brand)]/40"
          >
            <span
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
              style={{ background: 'var(--ec-brand-muted)', color: 'var(--ec-brand)' }}
            >
              <Icon className="h-5 w-5" aria-hidden />
            </span>
            <span className="min-w-0 flex-1 text-left">
              <span className="block text-sm font-semibold text-[var(--ec-text-primary)]">
                {item.label}
              </span>
              <span className="block truncate text-xs text-[var(--ec-text-secondary)]">
                {item.description}
              </span>
            </span>
            <ChevronRight className="h-5 w-5 shrink-0 text-[var(--ec-text-secondary)]" aria-hidden />
          </Link>
        )
      })}

      <div className="ms-acct-card lg:hidden">
        <SignOutButton />
      </div>

      <AppSupportStrip className="ms-acct-support" />
    </div>
  )
}
