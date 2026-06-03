'use client'

import { GoogleAuthButton } from '@/components/auth/GoogleAuthButton'

type Props = {
  label: string
  redirectPath?: string | null
  disabled?: boolean
  onError?: (message: string) => void
  /** Short line under the button (privacy reassurance). */
  hint?: string
}

export function GoogleAuthSection({
  label,
  redirectPath,
  disabled,
  onError,
  hint = 'Uses your Google account — we only receive your name and email.',
}: Props) {
  return (
    <section aria-labelledby="google-auth-heading" className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <p
          id="google-auth-heading"
          className="text-xs font-semibold uppercase tracking-wider text-[var(--ec-text-secondary)]"
        >
          Recommended
        </p>
        <span className="rounded-full border border-[var(--ec-border)] bg-[var(--ec-surface-raised)] px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-[var(--ec-text-secondary)]">
          ~10 sec
        </span>
      </div>

      <GoogleAuthButton
        label={label}
        redirectPath={redirectPath}
        disabled={disabled}
        onError={onError}
      />

      <p className="text-center text-xs leading-relaxed text-[var(--ec-text-secondary)]">
        {hint}
      </p>
    </section>
  )
}

/** Static placeholder matching Google button layout (SSR / Suspense). */
export function GoogleAuthSectionSkeleton({ label }: { label: string }) {
  return (
    <div className="space-y-3" aria-hidden>
      <div className="flex items-center justify-between gap-3">
        <div className="h-3 w-24 rounded bg-[var(--ec-surface-raised)]" />
        <div className="h-5 w-14 rounded-full bg-[var(--ec-surface-raised)]" />
      </div>
      <div className="flex min-h-[52px] w-full items-center justify-center gap-3 rounded-xl border border-[#747775]/40 bg-white/90 px-4 py-3.5 text-[15px] font-medium text-[#1f1f1f]/70">
        <span className="inline-block h-5 w-5 rounded-full bg-[#e8eaed]" />
        {label}
      </div>
      <div className="mx-auto h-3 w-[80%] max-w-xs rounded bg-[var(--ec-surface-raised)]" />
    </div>
  )
}
