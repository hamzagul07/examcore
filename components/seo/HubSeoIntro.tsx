import type { ReactNode } from 'react'
import { HubSeoLink } from '@/components/seo/HubSeoLink'

type LinkItem = {
  href: string
  label: string
  variant?: 'primary' | 'ghost' | 'muted'
}

/**
 * Callers assemble these links from several sources — a curated list, sibling
 * courses, blog links, community — and two sources can legitimately point at the
 * same place. On the IB hub, "Practice by topic" and a blog link both resolved to
 * /ib/past-papers/<slug>#ib-topic-practice, which rendered the chip twice and
 * tripped React's duplicate-key warning (keys are the href).
 *
 * First occurrence wins, so the curated label beats the generated one.
 */
function dedupeByHref<T extends { href: string }>(links: T[]): T[] {
  const seen = new Set<string>()
  return links.filter((l) => {
    if (seen.has(l.href)) return false
    seen.add(l.href)
    return true
  })
}

export function HubSeoIntro({
  heading,
  paragraph,
  links,
  id = 'hub-seo-intro',
  collapsibleOnMobile = false,
  headingLevel = 'h2',
}: {
  heading: string
  paragraph: string
  links?: LinkItem[]
  id?: string
  /** Collapse body + links behind a summary on narrow screens (SEO content stays in DOM). */
  collapsibleOnMobile?: boolean
  /** Use h1 on hub pages where no other server-rendered H1 exists. */
  headingLevel?: 'h1' | 'h2'
}) {
  const body = (
    <>
      <p className="mb-0 text-sm leading-relaxed text-[var(--ec-text-secondary)] sm:text-base">{paragraph}</p>
      {links?.length ? (
        <div className="mt-4 flex flex-wrap gap-2 hub-seo-intro-links">
          {dedupeByHref(links).map((link) => (
            <HubSeoLink key={link.href} {...link} />
          ))}
        </div>
      ) : null}
    </>
  )

  const Heading = headingLevel

  return (
    <section
      className="hub-seo-intro mb-6 rounded-2xl border border-[var(--ec-border)] bg-[var(--ec-bg-soft)] p-5 sm:p-6"
      aria-labelledby={id}
    >
      <Heading id={id} className="mb-2 text-lg font-semibold tracking-tight text-[var(--ec-text-primary)] sm:text-xl">
        {heading}
      </Heading>
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
