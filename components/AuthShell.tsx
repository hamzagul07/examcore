'use client'

import Link from 'next/link'
import type { ReactNode } from 'react'
import { WordmarkLink } from '@/components/layout/Wordmark'

type Props = {
  children: ReactNode
  /** Optional left-column artefact for the signup spread desk. */
  aside?: ReactNode
  showBetaBadge?: boolean
  backLabel?: string
  backHref?: string
  /** Ask before following the back link (e.g. "Sign out?" mid-onboarding). */
  confirmBackMessage?: string
  /**
   * desk — filing docket for signup / signin / verify
   * onboarding — wizard shell (progress outside the docket)
   * card — legacy alias for desk
   */
  layout?: 'desk' | 'onboarding' | 'card'
}

/** Outer chrome for /auth/* and /onboarding — examiner’s filing desk. */
export function AuthShell({
  children,
  aside = null,
  showBetaBadge = true,
  backLabel = 'Back to home',
  backHref = '/',
  confirmBackMessage,
  layout = 'desk',
}: Props) {
  const handleBackClick = confirmBackMessage
    ? (e: React.MouseEvent) => {
        if (!window.confirm(confirmBackMessage)) e.preventDefault()
      }
    : undefined

  if (layout === 'onboarding') {
    return (
      <main className="ms-ob-shell">
        <div className="mb-8 flex justify-center sm:mb-10">
          <WordmarkLink />
        </div>
        {children}
        <p className="ms-micro" style={{ marginTop: 32 }}>
          <Link href={backHref} className="ec-btn-underline" onClick={handleBackClick}>
            {backLabel}
          </Link>
        </p>
      </main>
    )
  }

  const spread = Boolean(aside)

  return (
    <main className="ms-auth-desk">
      <header className="ms-auth-desk__masthead">
        <WordmarkLink />
        {showBetaBadge ? (
          <div className="ms-auth-desk__masthead-meta">
            <span className="ec-ink-stamp ec-ink-stamp--inline" aria-hidden>
              FREE
            </span>
            <span className="ms-auth-desk__masthead-label">No card required</span>
          </div>
        ) : null}
      </header>

      <div
        className={`ms-auth-desk__docket${spread ? ' ms-auth-desk__docket--spread' : ''}`}
      >
        {aside ? <div className="ms-auth-desk__aside">{aside}</div> : null}
        <div className="ms-auth-desk__sheet">{children}</div>
      </div>

      <div className="ms-auth-desk__footer">
        <Link
          href={backHref}
          onClick={handleBackClick}
          className="ms-auth-desk__back"
        >
          <span className="font-mono text-[11px] font-bold" aria-hidden>
            &lt;-
          </span>
          {backLabel}
        </Link>
        <p className="mt-2 text-xs text-[var(--ec-text-secondary)]">
          <Link href="/faq" className="ec-link inline-flex min-h-[44px] items-center px-1">
            FAQ
          </Link>
          {' · '}
          <Link href="/how-it-works" className="ec-link inline-flex min-h-[44px] items-center px-1">
            How it works
          </Link>
        </p>
      </div>
    </main>
  )
}
