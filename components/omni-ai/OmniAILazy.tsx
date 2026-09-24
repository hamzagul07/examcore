'use client'

import dynamic from 'next/dynamic'
import { useEffect, useState } from 'react'
import { useOmniAI } from '@/lib/omni-ai/context'

const OmniAI = dynamic(
  () => import('@/components/omni-ai/OmniAI').then((m) => m.OmniAI),
  { ssr: false, loading: () => null }
)

/**
 * Defers the Omni-AI panel + chat bundle until the user first opens it
 * (⌘K / FAB). Once opened it stays mounted: OmniAI animates its own open
 * and close with AnimatePresence, and unmounting it here on close used to
 * cut that exit off — the drawer simply vanished.
 */
export function OmniAILazy() {
  const { isOpen } = useOmniAI()
  const [everOpened, setEverOpened] = useState(false)

  useEffect(() => {
    if (isOpen) setEverOpened(true)
  }, [isOpen])

  if (!isOpen && !everOpened) return null
  return <OmniAI />
}
