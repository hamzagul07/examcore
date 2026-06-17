'use client'

import dynamic from 'next/dynamic'
import { useOmniAI } from '@/lib/omni-ai/context'

const OmniAI = dynamic(
  () => import('@/components/omni-ai/OmniAI').then((m) => m.OmniAI),
  { ssr: false, loading: () => null }
)

/** Defers Omni-AI panel + chat bundle until the user opens it (⌘K / FAB). */
export function OmniAILazy() {
  const { isOpen } = useOmniAI()
  if (!isOpen) return null
  return <OmniAI />
}
