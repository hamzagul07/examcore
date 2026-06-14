import type { ReactNode } from 'react'

type MarketingPageShellProps = {
  children: ReactNode
  /** Narrow hero for legal/docs pages */
  narrow?: boolean
  /** Wide layout for course lessons and visual learning */
  wide?: boolean
  /** Full-bleed course studio (left nav + reading column) */
  studio?: boolean
  className?: string
}

export function MarketingPageShell({
  children,
  narrow = false,
  wide = false,
  studio = false,
  className = '',
}: MarketingPageShellProps) {
  const mainClass = studio
    ? 'course-studio-page'
    : wide
      ? 'mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8'
      : narrow
        ? 'mx-auto max-w-3xl px-4 py-16 sm:px-6 sm:py-20'
        : 'app-padding'

  return (
    <div className="relative min-h-screen">
      <main className={`${mainClass}${className ? ` ${className}` : ''}`.trim()}>{children}</main>
    </div>
  )
}

export function MarketingHero({
  label,
  title,
  lead,
  children,
}: {
  label?: string
  title: ReactNode
  lead?: string
  children?: ReactNode
}) {
  return (
    <section className="ms-pg ms-content-hero scroll-mt-24">
      {label ? <p className="ms-overline">{label}</p> : null}
      <h1 className="ms-h2" style={{ fontSize: 'clamp(36px, 5vw, 56px)' }}>
        {title}
      </h1>
      {lead ? (
        <p className="ms-lead" style={{ marginTop: 16, maxWidth: '56ch' }}>
          {lead}
        </p>
      ) : null}
      {children}
    </section>
  )
}

export function MarketingSection({
  children,
  className = '',
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <section className={`ms-pg ms-sec scroll-mt-24 ${className}`}>{children}</section>
  )
}

export function LegalDisclaimer() {
  return (
    <div className="ec-highlight-warning-panel mb-8 rounded-2xl p-4 text-sm leading-relaxed text-[var(--ec-text-secondary)]">
      This is a draft policy written for transparency during early access. If you
      have legal needs requiring formal review, consult a lawyer before relying on
      it for compliance.
    </div>
  )
}
