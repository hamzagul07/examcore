import type { ReactNode } from 'react'

type Props = {
  title: string
  children: ReactNode
  /** Open on first paint when the section carries the only remaining CTA. */
  defaultOpen?: boolean
}

/** Expandable secondary block — keeps next-action hierarchy clear (DB-02). */
export function DashboardSection({ title, children, defaultOpen = false }: Props) {
  return (
    <details className="ms-dash-section mb-6" open={defaultOpen || undefined}>
      <summary className="ms-dash-section__summary">
        <span className="ms-dash-section__title">{title}</span>
        <span className="ms-dash-section__chevron" aria-hidden>
          ›
        </span>
      </summary>
      <div className="ms-dash-section__body pt-4">{children}</div>
    </details>
  )
}
