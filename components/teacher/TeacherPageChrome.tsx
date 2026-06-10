import Link from 'next/link'
import type { ReactNode } from 'react'

/** Shared back navigation for teacher sub-pages. */
export function TeacherBackLink({
  href,
  children,
}: {
  href: string
  children: ReactNode
}) {
  return (
    <Link
      href={href}
      className="mb-6 inline-flex min-h-[44px] items-center text-sm text-[var(--ec-text-secondary)] transition-colors hover:text-[var(--ec-text-primary)]"
    >
      {children}
    </Link>
  )
}

/** Standard width + spacing for teacher route content. */
export function TeacherPageContainer({
  children,
  className = '',
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div className={`mx-auto min-w-0 max-w-7xl ${className}`.trim()}>
      {children}
    </div>
  )
}

export function TeacherPageHeader({
  label,
  title,
  lead,
}: {
  label?: string
  title: ReactNode
  lead?: ReactNode
}) {
  return (
    <header className="mb-8 sm:mb-10">
      {label && <p className="ec-eyebrow mb-3">{label}</p>}
      <h1 className="text-headline">{title}</h1>
      {lead && <p className="text-body mt-2">{lead}</p>}
    </header>
  )
}
