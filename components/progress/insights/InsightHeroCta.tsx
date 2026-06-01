'use client'

import { ArrowRight } from 'lucide-react'
import { LoadingLink } from '@/components/ui/LoadingLink'

type Props = {
  href: string
  label: string
}

export function InsightHeroCta({ href, label }: Props) {
  return (
    <LoadingLink href={href} loadingText="Opening..." className="ec-btn-primary text-sm">
      {label}
      <ArrowRight className="h-4 w-4" aria-hidden="true" />
    </LoadingLink>
  )
}
