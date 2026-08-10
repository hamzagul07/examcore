import Link from 'next/link'
import { MaxBadge } from '@/components/max/MaxBadge'

/** Dashboard home tile that takes Max users straight into the Vault. */
export function MaxVaultTile() {
  return (
    <Link
      href="/dashboard/vault"
      className="ec-card ec-card--paper mb-6 block p-4 sm:p-5 transition-opacity hover:opacity-95"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-2">
          <MaxBadge label="Max Resource Vault" />
          <p className="text-body m-0 text-[var(--ec-text-secondary)]">
            Sprint pack, curated flagship resources, full-marks bank — open your Vault.
          </p>
        </div>
        <span className="font-mono text-xs font-bold uppercase tracking-wide text-[var(--ec-brand)]">
          Open →
        </span>
      </div>
    </Link>
  )
}
