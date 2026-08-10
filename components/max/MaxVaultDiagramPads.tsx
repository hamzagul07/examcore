'use client'

import Link from 'next/link'
import { LazyLiveDiagram } from '@/components/courses/visuals/LazyLiveDiagram'
import type { VaultDiagramPad } from '@/lib/max/vault-exclusives'
import { topicDrillHref } from '@/lib/insights/drill-link'

/**
 * Live MarkScheme diagrams for weak / showcase topics — the visual moment
 * that makes Vault feel like a product, not a link list.
 */
export function MaxVaultDiagramPads({
  pads,
  subjectCode,
}: {
  pads: VaultDiagramPad[]
  subjectCode: string | null
}) {
  if (pads.length === 0) return null

  return (
    <section className="ms-vault__section">
      <div className="ms-vault__section-head">
        <span className="ec-ink-stamp ec-ink-stamp--inline" aria-hidden>
          FX
        </span>
        <p className="ec-eyebrow mb-0">Built for your gaps</p>
        <h2 className="m-0 text-lg font-bold text-[var(--ec-text-primary)]">
          Your weak-topic pads
        </h2>
      </div>
      <div className="ms-vault__panel ms-vault__panel--gold space-y-4">
        <p className="text-body m-0 text-[var(--ec-text-secondary)]">
          Personalised from your marks — open the diagram that matches your weakest
          topics, then remake the questions.
        </p>
        <ul className="ms-vault__diagram-grid">
          {pads.map((pad) => {
            const fallbackMarkHref =
              subjectCode && pad.topicCode
                ? topicDrillHref(subjectCode, pad.topicCode, { returnTo: 'vault' })
                : '/mark?return=%2Fdashboard%2Fvault'
            return (
              <li key={pad.slug} className="ms-vault__diagram-card">
                <div className="ms-vault__diagram-stage">
                  <LazyLiveDiagram slug={pad.slug} captionOverride={pad.title} />
                </div>
                <div className="ms-vault__diagram-meta">
                  <p className="ms-overline m-0 text-[var(--ec-c-math)]">{pad.topicCode}</p>
                  <h3 className="m-0 text-base font-bold text-[var(--ec-text-primary)]">
                    {pad.title}
                  </h3>
                  <p className="text-caption m-0 text-[var(--ec-text-secondary)]">{pad.reason}</p>
                  <div className="ms-vault__diagram-actions">
                    <Link href={pad.lessonHref} className="ec-btn-primary text-sm">
                      Open full lesson
                    </Link>
                    {pad.markHref ? (
                      <Link href={pad.markHref} className="ec-btn-ghost text-sm">
                        Mark {pad.markLabel} →
                      </Link>
                    ) : (
                      <Link href={fallbackMarkHref} className="ec-btn-ghost text-sm">
                        Mark this topic →
                      </Link>
                    )}
                  </div>
                </div>
              </li>
            )
          })}
        </ul>
      </div>
    </section>
  )
}
