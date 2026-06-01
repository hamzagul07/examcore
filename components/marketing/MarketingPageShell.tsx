import type { ReactNode } from 'react'

type MarketingPageShellProps = {
  children: ReactNode
  /** Narrow hero for legal/docs pages */
  narrow?: boolean
}

export function MarketingPageShell({ children, narrow = false }: MarketingPageShellProps) {
  return (
    <div className="relative min-h-screen">
      <main
        className={
          narrow
            ? 'mx-auto max-w-3xl px-4 py-16 sm:px-6 sm:py-20'
            : 'app-padding'
        }
      >
        {children}
      </main>
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
    <section className="landing-section scroll-mt-24 pb-12 pt-24 sm:pb-16 sm:pt-28">
      <div className="landing-hero-glow" aria-hidden />
      <div className="relative mx-auto max-w-3xl">
        {label ? <p className="ec-label-tech mb-4">{label}</p> : null}
        <h1 className="text-display mb-6 text-[var(--ec-text-primary)]">{title}</h1>
        {lead ? <p className="landing-lead">{lead}</p> : null}
        {children}
      </div>
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
    <section className={`landing-section scroll-mt-24 ${className}`}>{children}</section>
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
