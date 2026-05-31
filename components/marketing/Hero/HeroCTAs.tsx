'use client'

import Link from 'next/link'

interface HeroCTAsProps {
  primary: { label: string; href: string }
  secondary: { label: string; targetId: string }
}

export function HeroCTAs({ primary, secondary }: HeroCTAsProps) {
  function handleSecondaryClick() {
    const el = document.getElementById(secondary.targetId)
    el?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <div>
      <Link href={primary.href}>{primary.label}</Link>
      <button
        type="button"
        onClick={handleSecondaryClick}
        aria-controls={secondary.targetId}
      >
        {secondary.label}
      </button>
    </div>
  )
}
