import type { ReactNode } from 'react'
import { HubSeoLink } from '@/components/seo/HubSeoLink'

type LinkItem = {
  href: string
  label: string
  variant?: 'primary' | 'ghost' | 'muted'
}

export function HubSeoIntro({
  heading,
  paragraph,
  links,
  id = 'hub-seo-intro',
  collapsibleOnMobile = false,
}: {
  heading: string
  paragraph: string
  links?: LinkItem[]
  id?: string
  /** Collapse body + links behind a summary on narrow screens (SEO content stays in DOM). */
  collapsibleOnMobile?: boolean
}) {
  const body = (
    <>
      <p className="mb-0 text-sm leading-relaxed text-[var(--ec-text-secondary)] sm:text-base">{paragraph}</p>
      {links?.length ? (
        <div className="mt-4 flex flex-wrap gap-2 hub-seo-intro-links">
          {links.map((link) => (
            <HubSeoLink key={link.href} {...link} />
          ))}
        </div>
      ) : null}
    </>
  )

  return (
    <section
      className="hub-seo-intro mb-6 rounded-2xl border border-[var(--ec-border)] bg-[var(--ec-bg-soft)] p-5 sm:p-6"
      aria-labelledby={id}
    >
      <h2 id={id} className="mb-2 text-lg font-semibold tracking-tight text-[var(--ec-text-primary)] sm:text-xl">
        {heading}
      </h2>
      {collapsibleOnMobile ? (
        <details className="hub-seo-intro-details">
          <summary className="hub-seo-intro-details-summary">About Exam Room</summary>
          {body}
        </details>
      ) : (
        body
      )}
    </section>
  )
}

export function HubSeoIntroLinks({ children }: { children: ReactNode }) {
  return <div className="mt-4 flex flex-wrap gap-2">{children}</div>
}
