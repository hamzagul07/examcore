'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'
import type { AIContextType, OmniAIMessage } from './types'

interface AIContextValue {
  context: AIContextType
  setContext: (ctx: AIContextType) => void
  messages: OmniAIMessage[]
  setMessages: (
    m: OmniAIMessage[] | ((prev: OmniAIMessage[]) => OmniAIMessage[])
  ) => void
  isOpen: boolean
  setIsOpen: (v: boolean) => void
  toggleOpen: () => void
  isStreaming: boolean
  setIsStreaming: (v: boolean) => void
  clearChat: () => void
}

const AIContextStore = createContext<AIContextValue | null>(null)

export function AIContextProvider({ children }: { children: ReactNode }) {
  const [context, setContext] = useState<AIContextType>({ type: 'landing' })
  const [messages, setMessages] = useState<OmniAIMessage[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [isStreaming, setIsStreaming] = useState(false)

  const clearChat = useCallback(() => {
    setMessages([])
  }, [])

  const toggleOpen = useCallback(() => {
    setIsOpen((prev) => !prev)
  }, [])

  // Global ⌘/Ctrl+K toggles the chat panel from anywhere.
  useEffect(() => {
    function handleKeydown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setIsOpen((prev) => !prev)
      }
      if (e.key === 'Escape') {
        setIsOpen(false)
      }
    }
    window.addEventListener('keydown', handleKeydown)
    return () => window.removeEventListener('keydown', handleKeydown)
  }, [])

  return (
    <AIContextStore.Provider
      value={{
        context,
        setContext,
        messages,
        setMessages,
        isOpen,
        setIsOpen,
        toggleOpen,
        isStreaming,
        setIsStreaming,
        clearChat,
      }}
    >
      {children}
    </AIContextStore.Provider>
  )
}

export function useOmniAI() {
  const ctx = useContext(AIContextStore)
  if (!ctx) {
    throw new Error('useOmniAI must be used within AIContextProvider')
  }
  return ctx
}

/** Set Omni-AI context on page mount; resets to landing on unmount. */
export function useSetAIContext(ctx: AIContextType, deps: unknown[] = []) {
  const { setContext } = useOmniAI()

  useEffect(() => {
    setContext(ctx)
    return () => setContext({ type: 'landing' })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)
}
