import type { ReactNode } from 'react'

type Props = {
  children: ReactNode
}

/**
 * Secondary marketing depth (founder, comparison, etc.) stays available
 * without competing with the primary landing hierarchy (LAND-01).
 */
export function LandingMoreBand({ children }: Props) {
  return (
    <details className="ms-pg ms-landing-more">
      <summary className="ms-landing-more__summary">
        <span className="ms-landing-more__title">More from MarkScheme</span>
        <span className="ms-landing-more__hint">
          Mark · Learn · Discuss, founder story, and ChatGPT comparison
        </span>
        <span className="ms-landing-more__chevron" aria-hidden>
          ›
        </span>
      </summary>
      <div className="ms-landing-more__body">{children}</div>
    </details>
  )
}
