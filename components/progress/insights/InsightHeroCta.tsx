'use client'

import { LoadingLink } from '@/components/ui/LoadingLink'

type Props = {
  href: string
  label: string
}

export function InsightHeroCta({ href, label }: Props) {
  return (
    <LoadingLink href={href} loadingText="Opening..." className="ec-btn-primary text-sm">
      {label}
      <span className="h-4 w-4" aria-hidden>-&gt;</span>
    </LoadingLink>
  )
}
