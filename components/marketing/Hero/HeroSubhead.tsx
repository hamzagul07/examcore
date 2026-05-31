import type { ReactNode } from 'react'

interface HeroSubheadProps {
  children: ReactNode
}

export function HeroSubhead({ children }: HeroSubheadProps) {
  return <p>{children}</p>
}
