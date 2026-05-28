'use client'

import { AIContextProvider } from '@/lib/omni-ai/context'

export function OmniAIProviders({ children }: { children: React.ReactNode }) {
  return <AIContextProvider>{children}</AIContextProvider>
}
