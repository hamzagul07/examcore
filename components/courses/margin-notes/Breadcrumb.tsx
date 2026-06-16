'use client'

import Link from 'next/link'

export type BreadcrumbItem = {
  label: string
  href?: string
}

export function Breadcrumb({ items }: { items: BreadcrumbItem[] }) {
  return (
    <nav className="crumb" aria-label="Breadcrumb">
      {items.map((it, i) => (
        <span key={`${it.label}-${i}`} style={{ display: 'contents' }}>
          {i > 0 ? <span className="crumb-sep">/</span> : null}
          {it.href ? (
            <Link className="crumb-link" href={it.href}>
              {it.label}
            </Link>
          ) : (
            <span className="crumb-cur">{it.label}</span>
          )}
        </span>
      ))}
    </nav>
  )
}
