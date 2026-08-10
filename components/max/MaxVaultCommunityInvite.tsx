import Link from 'next/link'
import type { VaultCommunityHook } from '@/lib/max/vault-exclusives'

/**
 * Max → Exam Room loop: pre-filled weak-topic questions so posting feels
 * effortless and addictive. Hidden entirely when community is off.
 */
export function MaxVaultCommunityInvite({ hooks }: { hooks: VaultCommunityHook[] }) {
  if (hooks.length === 0) return null

  return (
    <section className="ms-vault__section">
      <div className="ms-vault__section-head">
        <span className="ec-ink-stamp ec-ink-stamp--inline" aria-hidden>
          RM
        </span>
        <p className="ec-eyebrow mb-0">Exam Room</p>
        <h2 className="m-0 text-lg font-bold text-[var(--ec-text-primary)]">
          Post your stuck question
        </h2>
      </div>
      <div className="ms-vault__panel ms-vault__panel--teal space-y-4">
        <p className="text-body m-0 text-[var(--ec-text-secondary)]">
          Max pre-fills a question from your weakest topics. Ask once, get method-mark
          advice from students who just sat the same paper — then mark the fix here.
        </p>
        <ul className="m-0 list-none space-y-3 pl-0">
          {hooks.map((h) => (
            <li key={h.topicCode} className="ms-vault__community-row">
              <div className="min-w-0 flex-1">
                <p className="m-0 font-semibold text-[var(--ec-text-primary)]">{h.topicName}</p>
                <p className="text-caption m-0 text-[var(--ec-text-secondary)]">{h.prompt}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Link href={h.askHref} className="ec-btn-primary text-sm">
                  Ask about {h.topicCode}
                </Link>
                <Link href={h.browseHref} className="ec-btn-ghost text-sm">
                  Browse room
                </Link>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
