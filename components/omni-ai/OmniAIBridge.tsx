'use client'

import { useSetAIContext } from '@/lib/omni-ai/context'
import type { AIContextType } from '@/lib/omni-ai/types'

interface OmniAIBridgeProps {
  context: AIContextType
}

/**
 * Client bridge for server pages — sets Omni-AI context from server-fetched data.
 * Drawer + mobile FAB are handled globally by OmniAI + OmniFABGate.
 */
export function OmniAIBridge({ context }: OmniAIBridgeProps) {
  useSetAIContext(context, [JSON.stringify(context)])
  return null
}
