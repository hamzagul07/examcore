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

/**
 * The desk-style page head (`.ms-teacher-desk-head`): eyebrow with an ink
 * stamp, a serif title, an optional handwritten note in crimson, and actions
 * on the right (full width on a phone).
 *
 *   <TeacherDeskHead eyebrow="Teacher desk" stamp="DK" title="Your desk"
 *     note="3 sets due this week" actions={<LoadingLink …>New class</LoadingLink>} />
 *
 * The note is decorative handwriting, so it is hidden from assistive tech —
 * pass anything a screen-reader user needs as `lead` instead.
 */
export function TeacherDeskHead({
  eyebrow,
  stamp,
  title,
  lead,
  note,
  actions,
  titleId,
}: {
  eyebrow: string
  stamp?: string
  title: ReactNode
  lead?: ReactNode
  note?: ReactNode
  actions?: ReactNode
  titleId?: string
}) {
  return (
    <header className="ms-teacher-desk-head">
      <div className="min-w-0">
        <div className="ms-teacher-desk-head__eyebrow">
          <p className="ec-eyebrow mb-0">{eyebrow}</p>
          {stamp ? (
            <span className="ec-ink-stamp ec-ink-stamp--inline" aria-hidden>
              {stamp}
            </span>
          ) : null}
        </div>
        <h1 id={titleId} className="text-headline">
          {title}
        </h1>
        {lead ? <p className="text-body mt-2 max-w-2xl">{lead}</p> : null}
        {note ? (
          <span className="ms-teacher-desk-head__note" aria-hidden>
            {note}
          </span>
        ) : null}
      </div>
      {actions ? <div className="ms-teacher-desk-head__actions">{actions}</div> : null}
    </header>
  )
}
