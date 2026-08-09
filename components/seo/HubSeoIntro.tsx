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
  quiet = false,
}: {
  heading: string
  paragraph: string
  links?: LinkItem[]
  id?: string
  /** Collapse body + links behind a summary on narrow screens (SEO content stays in DOM). */
  collapsibleOnMobile?: boolean
  /** Use h1 on hub pages where no other server-rendered H1 exists. */
  headingLevel?: 'h1' | 'h2'
  /**
   * Examiner’s Ink demotion — thinner paper slip, no hard card shadow / ¶ stamp.
   * Prefer for course hubs + catalogs so the product spine leads.
   */
  quiet?: boolean
}) {
  const body = (
    <>
      <p
        className={
          quiet
            ? 'mb-0 text-sm leading-relaxed text-[var(--ec-text-secondary)]'
            : 'mb-0 text-sm leading-relaxed text-[var(--ec-text-secondary)] sm:text-base'
        }
      >
        {paragraph}
      </p>
      {links?.length ? (
        <div className="mt-3 flex flex-wrap gap-2 hub-seo-intro-links">
          {dedupeByHref(links).map((link) => (
            <HubSeoLink
              key={link.href}
              {...link}
              variant={quiet && link.variant === 'primary' ? 'ghost' : link.variant}
            />
          ))}
        </div>
      ) : null}
    </>
  )

  const Heading = headingLevel

  return (
    <section
      className={
        quiet
          ? 'hub-seo-intro hub-seo-intro--quiet mb-6'
          : 'hub-seo-intro ec-card ec-card--paper mb-6 border border-[var(--ec-border)] bg-[var(--ec-paper,var(--ec-surface))] p-5 shadow-[var(--ec-shadow-hard,4px_4px_0_rgba(0,0,0,0.08))] sm:p-6'
      }
      aria-labelledby={id}
    >
      {!quiet ? (
        <span
          className="mb-3 inline-grid h-6 min-w-6 place-items-center rounded border border-[var(--ec-brand-border)] bg-[var(--ec-brand-muted)] px-1.5 font-mono text-[10px] font-bold tracking-wide text-[var(--ec-brand)]"
          aria-hidden
        >
          ¶
        </span>
      ) : (
        <span className="hub-seo-intro-kicker" aria-hidden>
          ABOUT
        </span>
      )}
      <Heading
        id={id}
        className={
          quiet
            ? 'hub-seo-intro-heading mb-2 text-base font-semibold tracking-tight text-[var(--ec-text-primary)] sm:text-lg'
            : 'mb-2 text-lg font-semibold tracking-tight text-[var(--ec-text-primary)] sm:text-xl'
        }
      >
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
