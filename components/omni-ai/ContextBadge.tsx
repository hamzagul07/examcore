'use client'

import { Sparkles } from 'lucide-react'
import type { AIContextType } from '@/lib/omni-ai/types'
import { getContextLabel } from '@/lib/omni-ai/system-prompts'

interface ContextBadgeProps {
  context: AIContextType
  className?: string
}

/** Small pill showing which Omni-AI context mode is active. */
export function ContextBadge({ context, className = '' }: ContextBadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full ec-tint-success-chip px-2.5 py-1 text-xs font-medium ${className}`}
    >
      <Sparkles className="h-3 w-3" />
      {getContextLabel(context.type)}
    </span>
  )
}
