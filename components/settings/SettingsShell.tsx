'use client'

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { SETTINGS_NAV, settingsNavItem } from '@/lib/settings/nav'
import { SignOutButton } from '@/components/settings/SignOutButton'
import { AppSupportStrip } from '@/components/marketing/AppSupportStrip'
import { cn } from '@/lib/utils'

export function SettingsShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const active = settingsNavItem(pathname)
  const isIndex = pathname === '/account'
  // Index is a master-detail shell: mobile list + desktop Profile panel (no viewport redirect).
  const profileActive =
    isIndex || pathname === '/account/profile' || pathname.startsWith('/account/profile/')

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
                <span className="lg:hidden">
                  Your <em>account</em>
                </span>
                <span className="hidden lg:inline">{SETTINGS_NAV[0]?.label ?? 'Profile'}</span>
              </>
            ) : (
              active?.label ?? 'Settings'
            )}
          </h1>
          {(isIndex || active?.description) && (
            <p className="ms-lead" style={{ marginTop: 10, maxWidth: 520 }}>
              {isIndex ? (
                <>
                  <span className="lg:hidden">
                    Manage your profile, exam setup, billing, and preferences.
                  </span>
                  <span className="hidden lg:inline">
                    {SETTINGS_NAV[0]?.description ?? 'Display name and email'}
                  </span>
                </>
              ) : (
                active?.description
              )}
            </p>
          )}
        </header>

        <div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:gap-10">
          <aside className="hidden shrink-0 lg:block lg:w-[220px]">
            <nav aria-label="Settings categories" className="sticky top-24 space-y-1">
              {SETTINGS_NAV.map((item) => {
                const isActive =
                  item.slug === 'profile'
                    ? profileActive
                    : pathname === item.href || pathname.startsWith(`${item.href}/`)
                const Icon = item.icon
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      'flex min-h-[44px] items-center gap-2.5 rounded px-3 py-2.5 text-body font-medium transition-colors',
                      isActive
                        ? 'bg-[var(--ec-brand-muted)] text-[var(--ec-brand)]'
                        : 'text-[var(--ec-text-secondary)] hover:bg-[var(--ec-brand-muted)] hover:text-[var(--ec-text-primary)]'
                    )}
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
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded border border-[var(--ec-brand-border)] bg-[var(--ec-brand-muted)] text-[var(--ec-brand)]">
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

/* ------------------------------------------------------------------
   Save feedback shared by the settings sections.

   A save is confirmed where it happened: a small "✓ Saved" stamp lands
   beside the control that saved, holds for a beat, fades, and leaves the
   DOM — the same rhythm PreferencesSection uses per row. Each section keeps
   its own persistent sr-only role="status" for the spoken copy.
   ------------------------------------------------------------------ */

export type SavedStampState = { phase: 'shown' | 'leaving'; nonce: number } | null

/** How long the stamp holds before it fades (ms). */
const SAVED_HOLD_MS = 1800
/** The fade itself — keep in step with `--ec-dur-menu`. */
const SAVED_FADE_MS = 200

function prefersReducedMotion() {
  return (
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true
  )
}

/**
 * Timer-backed stamp state. `showSaved()` lands a fresh stamp (restarting the
 * hold if one is already up); `clearSaved()` removes it at once, e.g. when a
 * new save starts.
 */
export function useSavedStamp() {
  const [stamp, setStamp] = useState<SavedStampState>(null)
  const nonce = useRef(0)

  const savedNonce = stamp?.nonce ?? null
  useEffect(() => {
    if (savedNonce === null) return
    const fade = prefersReducedMotion() ? 0 : SAVED_FADE_MS
    const leave = window.setTimeout(() => {
      setStamp((s) => (s && s.nonce === savedNonce ? { ...s, phase: 'leaving' } : s))
    }, SAVED_HOLD_MS)
    const clear = window.setTimeout(() => {
      setStamp((s) => (s && s.nonce === savedNonce ? null : s))
    }, SAVED_HOLD_MS + fade)
    return () => {
      window.clearTimeout(leave)
      window.clearTimeout(clear)
    }
  }, [savedNonce])

  const showSaved = useCallback(() => {
    nonce.current += 1
    setStamp({ phase: 'shown', nonce: nonce.current })
  }, [])

  const clearSaved = useCallback(() => setStamp(null), [])

  return { stamp, showSaved, clearSaved }
}

/**
 * The visual stamp. Decorative — the section's sr-only status carries the
 * announcement — so it is hidden from assistive tech.
 */
export function SavedStamp({
  state,
  label = '✓ Saved',
  className,
}: {
  state: SavedStampState
  label?: ReactNode
  className?: string
}) {
  if (!state) return null
  return (
    <span
      data-state={state.phase}
      aria-hidden
      className={cn(
        'pointer-events-none inline-flex transition-opacity duration-[var(--ec-dur-menu)] ease-[var(--ec-ease-out)] data-[state=leaving]:opacity-0 motion-reduce:transition-none',
        className
      )}
    >
      {/* `.ec-land` animates transform, so it lives on its own layer:
          the stamp underneath keeps its -3deg tilt. */}
      <span className="ec-land inline-flex">
        <span className="ec-ink-stamp ec-ink-stamp--inline">{label}</span>
      </span>
    </span>
  )
}
