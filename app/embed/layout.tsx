import type { ReactNode } from 'react'

/** Minimal chrome for third-party iframes — no site header/footer. */
export default function EmbedLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-[280px] bg-[var(--ec-bg)] p-4 text-[var(--ec-text-primary)]">
      {children}
    </div>
  )
}
