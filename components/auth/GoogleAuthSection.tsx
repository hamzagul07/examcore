'use client'

import { GoogleAuthButton } from '@/components/auth/GoogleAuthButton'

type Props = {
  label: string
  redirectPath?: string | null
  disabled?: boolean
  onError?: (message: string) => void
  /** Short line under the button (privacy reassurance). Omit to hide. */
  hint?: string | null
  /** Hide the Recommended row — used in compact signup modals. */
  compact?: boolean
}

export function GoogleAuthSection({
  label,
  redirectPath,
  disabled,
  onError,
  hint = 'School or personal Google — we only receive your name and email.',
  compact = false,
}: Props) {
  return (
    <section aria-labelledby={compact ? undefined : 'google-auth-heading'}>
      {compact ? null : (
        <div className="ms-google-section__head">
          <p
            id="google-auth-heading"
            className="ms-overline"
            style={{ marginBottom: 0 }}
          >
            Fastest path
          </p>
          <span className="ec-ink-stamp ec-ink-stamp--inline" aria-hidden>
            ~10s
          </span>
        </div>
      )}

      <GoogleAuthButton
        label={label}
        redirectPath={redirectPath}
        disabled={disabled}
        onError={onError}
      />

      {hint ? <p className="ms-google-section__hint">{hint}</p> : null}
    </section>
  )
}

/** Static placeholder matching Google button layout (SSR / Suspense). */
export function GoogleAuthSectionSkeleton({ label }: { label: string }) {
  return (
    <div aria-hidden>
      <div className="ms-google-section__head">
        <div className="h-3 w-24 rounded bg-[var(--ec-surface-raised)]" />
        <div className="h-6 w-12 rounded bg-[var(--ec-surface-raised)]" />
      </div>
      <div className="ms-google-btn opacity-70">
        <span className="inline-block h-5 w-5 rounded bg-[var(--ec-surface-raised)]" />
        {label}
      </div>
      <div className="ms-google-section__hint">
        <span className="inline-block h-3 w-[70%] rounded bg-[var(--ec-surface-raised)]" />
      </div>
    </div>
  )
}
