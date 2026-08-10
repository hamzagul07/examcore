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
          Your private exam machine: live diagrams for weak topics, course lessons that
          close mark gaps, personalised sprint packs, full-marks rewrites of{' '}
          <em>your</em> answers, priority marking, and Exam Room asks pre-filled from your
          mastery. Not a bookmark list — included only on Max.
        </p>
        <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-[var(--ec-text-secondary)]">
          <li>Diagram pads + visual course path from your weakest topics</li>
          <li>Sprint / week pack built from real past-paper rows</li>
          <li>Full-marks rewrite bank + projected grade</li>
          <li>Priority queue + Max credit gifts</li>
        </ul>
      </div>
      <Link href="/pricing" className="ec-btn-primary inline-flex w-full justify-center sm:w-auto">
        Upgrade to Max →
      </Link>
    </div>
  )
}
