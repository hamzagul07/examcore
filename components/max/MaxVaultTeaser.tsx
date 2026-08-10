import Link from 'next/link'

/** Blur-style upgrade gate for non-Max visitors who hit /dashboard/vault. */
export function MaxVaultTeaser() {
  return (
    <div className="ec-card ec-card--paper mx-auto max-w-lg space-y-4 p-6 sm:p-8">
      <span className="ec-ink-stamp ec-ink-stamp--hero" aria-hidden>
        MX
      </span>
      <div>
        <h1 className="text-title text-[var(--ec-text-primary)]">Max Resource Vault</h1>
        <p className="text-body mt-2 text-[var(--ec-text-secondary)]">
          Personalised sprint packs and curated resources for every subject on your profile —
          weak-topic drills, examiner digests, and your full-marks model bank. Included on Max.
        </p>
      </div>
      <Link href="/pricing" className="ec-btn-primary inline-flex w-full justify-center sm:w-auto">
        Upgrade to Max →
      </Link>
    </div>
  )
}
