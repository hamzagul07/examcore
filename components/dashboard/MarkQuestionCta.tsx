'use client'

import { ArrowRight } from 'lucide-react'
import { LoadingLink } from '@/components/ui/LoadingLink'
import { cn } from '@/lib/utils'

type Props = {
  className?: string
}

export function MarkQuestionCta({ className }: Props) {
  return (
    <LoadingLink
      href="/mark"
      loadingText="Opening..."
      className={cn(
        'ec-btn-primary inline-flex w-full justify-center sm:w-auto',
        className
      )}
    >
      Mark a question
      <ArrowRight className="h-4 w-4" />
    </LoadingLink>
  )
}
