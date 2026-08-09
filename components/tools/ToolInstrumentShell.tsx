import type { ReactNode } from 'react'
import Link from 'next/link'
import { MarketingPageShell } from '@/components/marketing/MarketingPageShell'
import { MarketingBreadcrumbs } from '@/components/seo/MarketingBreadcrumbs'

type Crumb = { name: string; path: string }

type Props = {
  stamp: string
  label: string
  title: ReactNode
  lead: string
  note?: string
  /** Primary CTAs under the lead (inside the hero). */
  actions?: ReactNode
  /** Optional right-column slip (ScoreReveal cousin). */
  artefact?: ReactNode
  breadcrumbs?: Crumb[]
  children: ReactNode
  /** Extra blocks below the instrument stage (FAQ, etc.). */
  after?: ReactNode
}

/**
 * Shared chrome for a single /tools instrument — desk hero + stage, not MarketingHero.
 */
export function ToolInstrumentShell({
  stamp,
  label,
  title,
  lead,
  note,
  actions,
  artefact,
  breadcrumbs,
  children,
  after,
}: Props) {
  return (
    <MarketingPageShell>
      <div className="ms-pg ms-tool-instrument">
        {breadcrumbs ? (
          <div className="mb-6">
            <MarketingBreadcrumbs items={breadcrumbs} />
          </div>
        ) : (
          <p className="ms-tool-instrument__crumb">
            <Link href="/tools" className="ec-btn-underline">
              &lt;- Instrument desk
            </Link>
          </p>
        )}

        <section className="ms-tool-instrument__hero" aria-labelledby="tool-instrument-title">
          <div className="ms-tool-instrument__copy">
            <div className="ms-tool-instrument__brand">
              <span className="ec-ink-stamp" aria-hidden>
                {stamp}
              </span>
              <span className="ms-tool-instrument__brand-mark">{label}</span>
            </div>
            <h1 id="tool-instrument-title" className="ms-tool-instrument__title">
              {title}
            </h1>
            <p className="ms-tool-instrument__lead">{lead}</p>
            {note ? (
              <p className="ms-tool-instrument__note" aria-hidden>
                {note}
              </p>
            ) : null}
            {actions ? (
              <div className="ms-tool-instrument__actions">{actions}</div>
            ) : null}
          </div>
          {artefact ? (
            <div className="ms-tool-instrument__artefact">{artefact}</div>
          ) : null}
        </section>

        <section className="ms-tool-instrument__stage">{children}</section>

        {after}
      </div>
    </MarketingPageShell>
  )
}
