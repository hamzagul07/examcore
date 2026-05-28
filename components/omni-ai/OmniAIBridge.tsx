'use client'

import { useSetAIContext } from '@/lib/omni-ai/context'
import { SidebarChat } from '@/components/omni-ai/SidebarChat'
import type { AIContextType } from '@/lib/omni-ai/types'

interface OmniAIBridgeProps {
  context: AIContextType
}

/**
 * Client bridge for server pages — sets Omni-AI context from server-fetched
 * data and mounts the dashboard sidebar + FAB.
 */
export function OmniAIBridge({ context }: OmniAIBridgeProps) {
  useSetAIContext(context, [JSON.stringify(context)])
  return <SidebarChat />
}
