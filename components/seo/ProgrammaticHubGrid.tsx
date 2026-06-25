import Link from 'next/link'
import type { CSSProperties } from 'react'
import { subjectAccent, subjectGlyph, accentCssVar } from '@/lib/courses/margin-notes/subject-meta'

type HubCard = {
  code: string
  title: string
  subtitle?: string
  href: string
  meta?: string
}

type Props = {
  items: HubCard[]
  className?: string
}

/** Grid of syllabus-linked cards for programmatic SEO hubs. */
export function ProgrammaticHubGrid({ items, className = '' }: Props) {
  if (!items.length) return null

  return (
    <ul className={`ms-guide-grid sm:grid-cols-2 lg:grid-cols-3 ${className}`}>
      {items.map((item) => (
        <li key={item.href}>
          <Link
            href={item.href}
            className="ms-hub-card subject-accented ec-card-accent-edge"
            style={{ display: 'block', '--acc': accentCssVar(subjectAccent(item.code)) } as CSSProperties}
          >
            <span className="ec-chip ec-chip-accent" aria-hidden="true">
              <span style={{ fontSize: '1rem' }}>{subjectGlyph(item.code, '')}</span> {item.code}
            </span>
            <h3 className="ms-h3" style={{ marginTop: 10, fontSize: '1.05rem' }}>
              {item.title}
            </h3>
            {item.subtitle ? (
              <p className="ms-body-2" style={{ marginTop: 6, fontSize: 14 }}>
                {item.subtitle}
              </p>
            ) : null}
            {item.meta ? (
              <p className="ms-micro" style={{ marginTop: 8 }}>
                {item.meta}
              </p>
            ) : null}
          </Link>
        </li>
      ))}
    </ul>
  )
}
