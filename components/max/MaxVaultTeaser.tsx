import Link from 'next/link'

/** Blur-style upgrade gate for non-Max visitors who hit /dashboard/vault. */
export function MaxVaultTeaser() {
  return (
    <div className="ec-card ec-card--paper mx-auto max-w-lg space-y-4 p-6 sm:p-8">
      <span className="ec-ink-stamp ec-ink-stamp--hero" aria-hidden>
        MX
      </span>
      <div>
        <h1 className="text-title text-[var(--ec-text-primary)]">
          Your private exam machine
        </h1>
        <p className="text-body mt-2 text-[var(--ec-text-secondary)]">
          Max listens to every stamp. Then it rebuilds a desk around the leak — Cinema that
          makes the idea move, a sprint pack from real past papers, full-marks rewrites of{' '}
          <em>your</em> answers, priority depth when the paper is long, and a Sunday coach that
          won&apos;t let the week go soft.
        </p>
        <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-[var(--ec-text-secondary)]">
          <li>Vault desks that chase where marks actually leak</li>
          <li>Concept Cinema beside the path — scrub until it clicks</li>
          <li>Sprint pack when the exam is inside two weeks</li>
          <li>Priority marking + welcome / sprint gift marks</li>
        </ul>
      </div>
      <Link href="/pricing#plans" className="ec-btn-primary inline-flex w-full justify-center sm:w-auto">
        I want Max →
      </Link>
    </div>
  )
}
