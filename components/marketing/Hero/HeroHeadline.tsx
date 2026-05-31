'use client'

interface HeroHeadlineProps {
  text: string
}

export function HeroHeadline({ text }: HeroHeadlineProps) {
  return <h1 id="hero-headline">{text}</h1>
}
