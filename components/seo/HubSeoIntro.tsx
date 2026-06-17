import Link from 'next/link'
import type { ReactNode } from 'react'

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
}: {
  heading: string
  paragraph: string
  links?: LinkItem[]
  id?: string
}) {
  return (
    <section
      className="hub-seo-intro mb-6 rounded-2xl border border-[var(--ec-border)] bg-[var(--ec-bg-soft)] p-5 sm:p-6"
      aria-labelledby={id}
    >
      <h2 id={id} className="mb-2 text-lg font-semibold tracking-tight text-[var(--ec-text-primary)] sm:text-xl">
        {heading}
      </h2>
      <p className="mb-0 text-sm leading-relaxed text-[var(--ec-text-secondary)] sm:text-base">{paragraph}</p>
      {links?.length ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {links.map((link) => (
            <HubSeoLink key={link.href} {...link} />
          ))}
        </div>
      ) : null}
    </section>
  )
}

function HubSeoLink({ href, label, variant = 'ghost' }: LinkItem) {
  const className =
    variant === 'primary'
      ? 'ec-btn-primary px-4 py-2 text-sm'
      : variant === 'muted'
        ? 'inline-flex rounded-full border border-[var(--ec-border)] px-3 py-1.5 text-xs font-semibold text-[var(--ec-text-secondary)] no-underline hover:border-[var(--ec-brand)]/40 hover:text-[var(--ec-brand)]'
        : 'ec-btn-ghost px-4 py-2 text-sm no-underline'

  return (
    <Link href={href} className={className}>
      {label}
    </Link>
  )
}

export function HubSeoIntroLinks({ children }: { children: ReactNode }) {
  return <div className="mt-4 flex flex-wrap gap-2">{children}</div>
}
