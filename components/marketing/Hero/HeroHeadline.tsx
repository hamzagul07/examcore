'use client'

interface HeroHeadlineProps {
  text: string
}

export function HeroHeadline({ text }: HeroHeadlineProps) {
  return (
    <h1
      id="hero-headline"
      className="text-[40px] font-medium leading-[1.08] tracking-[-0.02em] text-[var(--ec-text-primary)] md:text-[56px] md:leading-[1.06] md:tracking-[-0.022em] lg:text-[72px] lg:leading-[1.05] lg:tracking-[-0.025em]"
    >
      {text}
    </h1>
  )
}
