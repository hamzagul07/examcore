import Link from 'next/link'
import { MaxBadge } from '@/components/max/MaxBadge'

/** Dashboard home tile that takes Max users straight into the Vault. */
export function MaxVaultTile() {
  return (
    <aside className="ms-vault-slip mb-6" aria-label="Max Resource Vault">
      <div className="ms-vault-slip__body">
        <span className="ec-ink-stamp" aria-hidden>
          MX
        </span>
        <div className="min-w-0 space-y-1">
          <MaxBadge label="Max Resource Vault" />
          <p className="m-0 text-base font-bold text-[var(--ec-text-primary)]">
            Your exclusive exam desk
          </p>
          <p className="text-body m-0 text-[var(--ec-text-secondary)]">
            Personalised sprint pack, curated flagship resources, projected grade, and
            full-marks models — built only for Max.
          </p>
        </div>
      </div>
      <Link href="/dashboard/vault" className="ms-vault-slip__cta">
        Open Vault -&gt;
      </Link>
    </aside>
  )
}
