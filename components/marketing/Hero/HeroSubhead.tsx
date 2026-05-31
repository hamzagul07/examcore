import type { ReactNode } from 'react'

interface HeroSubheadProps {
  children: ReactNode
}

export function HeroSubhead({ children }: HeroSubheadProps) {
  return (
    <p className="mx-auto mt-6 max-w-[580px] text-[18px] font-normal leading-[1.55] tracking-[-0.005em] text-[var(--ec-text-secondary)]">
      {children}
    </p>
  )
}
