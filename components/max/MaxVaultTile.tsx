import Link from 'next/link'
import { MaxBadge } from '@/components/max/MaxBadge'

/** Dashboard home tile that takes Max users straight into the Vault. */
export function MaxVaultTile() {
  return (
    <aside className="ms-mark-example-slip mb-6" aria-label="Max Resource Vault">
      <div className="ms-mark-example-slip__body">
        <span className="ec-ink-stamp" aria-hidden>
          MX
        </span>
        <div className="ms-mark-example-slip__copy">
          <div className="mb-2">
            <MaxBadge label="Max Resource Vault" />
          </div>
          <p className="ms-mark-example-slip__title">Your exclusive desk</p>
          <p className="ms-mark-example-slip__lead">
            Personalised sprint pack, curated flagship resources, and your full-marks
            bank — one tap from Home.
          </p>
          <span className="ms-mark-example-slip__note" aria-hidden>
            max only · opens on your weakest subject
          </span>
        </div>
      </div>
      <Link
        href="/dashboard/vault"
        className="ms-mark-example-slip__cta inline-flex min-h-[44px] items-center font-mono text-xs font-bold uppercase tracking-wide text-[var(--ec-brand)]"
      >
        Open Vault -&gt;
      </Link>
    </aside>
  )
}
