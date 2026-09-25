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
  /**
   * When set, the back control is a POST form to this path instead of a
   * link. Sign-out is the one caller: GET /auth/signout no longer signs
   * anyone out (it was a CSRF logout — review §3), so a plain link would
   * land on the confirm page and cost a second click. A form keeps it one
   * click and still works without JavaScript.
   */
  backAction?: string
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
  backAction,
  layout = 'desk',
}: Props) {
  if (layout === 'onboarding') {
    return (
      <main className="ms-ob-shell">
        <div className="mb-8 flex justify-center sm:mb-10">
          <WordmarkLink />
        </div>
        {children}
        {/* A div, not a <p>: a form is flow content and would close the
            paragraph early, leaving the button outside the styled block. */}
        <div className="ms-micro" style={{ marginTop: 32 }}>
          {backAction ? (
            <form action={backAction} method="POST" className="inline">
              <button type="submit" className="ec-btn-underline">
                {backLabel}
              </button>
            </form>
          ) : (
            <Link href={backHref} className="ec-btn-underline">
              {backLabel}
            </Link>
          )}
        </div>
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
        {backAction ? (
          <form action={backAction} method="POST" className="inline">
            <button type="submit" className="ms-auth-desk__back">
              <span className="font-mono text-[11px] font-bold" aria-hidden>
                &lt;-
              </span>
              {backLabel}
            </button>
          </form>
        ) : (
          <Link href={backHref} className="ms-auth-desk__back">
            <span className="font-mono text-[11px] font-bold" aria-hidden>
              &lt;-
            </span>
            {backLabel}
          </Link>
        )}
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
