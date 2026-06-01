'use client'

import { useOmniAI } from '@/lib/omni-ai/context'
import { useAuthenticatedAppChrome } from '@/lib/hooks/useAuthenticatedAppChrome'
import { FloatingActionButton } from './FloatingActionButton'

/** Mobile-only Ask AI FAB on authenticated app routes (including /account). */
export function OmniFABGate() {
  const visible = useAuthenticatedAppChrome()
  const { isOpen, setIsOpen } = useOmniAI()

  if (!visible) return null

  return (
    <FloatingActionButton
      onClick={() => setIsOpen(!isOpen)}
      isOpen={isOpen}
    />
  )
}
