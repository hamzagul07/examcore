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
            Your Vault — built especially for you
          </p>
          <p className="text-body m-0 text-[var(--ec-text-secondary)]">
            Live diagrams, courses that adapt to your weak topics, sprint packs, and
            coach notes. Videos coming soon. Open it and use everything Max put here.
          </p>
        </div>
      </div>
      <Link href="/dashboard/vault" className="ms-vault-slip__cta">
        See what&apos;s in your Vault -&gt;
      </Link>
    </aside>
  )
}
