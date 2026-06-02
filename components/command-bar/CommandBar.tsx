/**
 * @deprecated Superseded by Omni-AI LandingChat (Sprint 23). Kept for reference;
 * preview components in this folder are still used by Omni-AI.
 */
'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowUp, Sparkles, X } from 'lucide-react'
import { ChatMessage, type ChatMessageData } from './ChatMessage'
import { SuggestionChips } from './SuggestionChips'
import type {
  ChatAction,
  ChatRequestMessage,
  ChatResponse,
} from '@/lib/chat-intents'

const STARTER_SUGGESTIONS = [
  'Mark my work',
  '9709 May/June 2024 Q1',
  'I need help with Integration',
  'I keep running out of time',
]

/**
 * The Instant-Action Agent — the landing-page Command Bar.
 *
 * Two visual states:
 *   - Collapsed: a fat input "button" + starter suggestion chips. This is the
 *     surface visitors first see in the hero.
 *   - Expanded: a full chat panel (centered modal on desktop, bottom sheet on
 *     mobile). Listens for ⌘/Ctrl+K and ESC.
 *
 * Conversation state is local — visitors aren't authenticated and we don't
 * persist sessions. Last 6 messages get sent back for context.
 */
export function CommandBar() {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<ChatMessageData[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // ⌘/Ctrl+K to open, ESC to close. Registered once on mount.
  useEffect(() => {
    function handleKeydown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setIsOpen(true)
        return
      }
      if (e.key === 'Escape') {
        setIsOpen(false)
      }
    }
    window.addEventListener('keydown', handleKeydown)
    return () => window.removeEventListener('keydown', handleKeydown)
  }, [])

  // Scroll-to-bottom whenever messages or loading state changes.
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isLoading])

  // Focus the chat input when the panel opens.
  useEffect(() => {
    if (isOpen) {
      // Slight delay so the spring animation has started — focus jumping
      // mid-transition looks awkward on mobile.
      const t = setTimeout(() => inputRef.current?.focus(), 120)
      return () => clearTimeout(t)
    }
  }, [isOpen])

  // Lock body scroll while the modal is open.
  useEffect(() => {
    if (!isOpen) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [isOpen])

  const sendMessage = useCallback(
    async (text: string) => {
      const query = text.trim()
      if (!query || isLoading) return

      const userMessage: ChatMessageData = {
        id: `u-${Date.now()}`,
        role: 'user',
        content: query,
      }
      setMessages((prev) => [...prev, userMessage])
      setInput('')
      setIsLoading(true)

      try {
        const history: ChatRequestMessage[] = messages.slice(-6).map((m) => ({
          role: m.role,
          content: m.content,
        }))

        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query, messages: history }),
        })

        const data = (await res.json()) as ChatResponse & { error?: string }

        if (!res.ok && data?.error && !data?.response_text) {
          throw new Error(data.error)
        }

        const assistant: ChatMessageData = {
          id: `a-${Date.now()}`,
          role: 'assistant',
          content: data.response_text || "I'm here — what's the question?",
          action: data.action as ChatAction | undefined,
        }
        setMessages((prev) => [...prev, assistant])
      } catch (err) {
        console.error('Chat send failed', err)
        setMessages((prev) => [
          ...prev,
          {
            id: `a-${Date.now()}`,
            role: 'assistant',
            content:
              "Something went wrong on my end. Try again, or just upload a question to see MarkScheme in action.",
            action: { type: 'render_upload' },
          },
        ])
      } finally {
        setIsLoading(false)
      }
    },
    [isLoading, messages]
  )

  const handleSelectSuggestion = useCallback(
    (suggestion: string) => {
      setIsOpen(true)
      // Defer the send by a tick so the panel mount + state update don't race.
      setTimeout(() => {
        sendMessage(suggestion)
      }, 50)
    },
    [sendMessage]
  )

  const openShortcutLabel = useMemo(() => {
    // Best-effort platform hint. Real check happens at runtime only — server
    // render is "⌘K" regardless to avoid hydration mismatch.
    return ['⌘', 'K']
  }, [])

  return (
    <>
      <CollapsedBar
        onOpen={() => setIsOpen(true)}
        onSelectSuggestion={handleSelectSuggestion}
        shortcutLabel={openShortcutLabel}
      />

      <AnimatePresence>
        {isOpen && (
          <ExpandedPanel
            messages={messages}
            input={input}
            setInput={setInput}
            isLoading={isLoading}
            onClose={() => setIsOpen(false)}
            onSend={sendMessage}
            onSelectSuggestion={(s) => sendMessage(s)}
            messagesEndRef={messagesEndRef}
            inputRef={inputRef}
          />
        )}
      </AnimatePresence>
    </>
  )
}

// =============================================================================
// Collapsed state — the prominent landing-hero input
// =============================================================================

function CollapsedBar({
  onOpen,
  onSelectSuggestion,
  shortcutLabel,
}: {
  onOpen: () => void
  onSelectSuggestion: (s: string) => void
  shortcutLabel: string[]
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
      className="mx-auto w-full max-w-2xl"
    >
      <button
        type="button"
        onClick={onOpen}
        aria-label="Open MarkScheme agent"
        className="group flex w-full items-center gap-3 rounded-2xl border border-[var(--ec-border)] bg-[var(--ec-surface-raised)]/80 px-6 py-5 backdrop-blur-2xl transition-all ec-hover-brand-border"
      >
        <Sparkles className="h-5 w-5 ec-text-brand transition-transform group-hover:rotate-12" />
        <span className="flex-1 text-left text-[var(--ec-text-secondary)] transition-colors group-hover:text-[var(--ec-text-primary)]">
          Ask MarkScheme anything — past papers, topics, marking...
        </span>
        <kbd className="hidden items-center gap-1 rounded border border-[var(--ec-border)] bg-[var(--ec-surface-raised)] px-2 py-1 font-mono text-xs text-[var(--ec-text-secondary)] md:flex">
          <span>{shortcutLabel[0]}</span>
          <span>{shortcutLabel[1]}</span>
        </kbd>
      </button>

      <div className="mt-4">
        <SuggestionChips
          suggestions={STARTER_SUGGESTIONS}
          onSelect={onSelectSuggestion}
        />
      </div>
    </motion.div>
  )
}

// =============================================================================
// Expanded state — modal / bottom sheet
// =============================================================================

function ExpandedPanel({
  messages,
  input,
  setInput,
  isLoading,
  onClose,
  onSend,
  onSelectSuggestion,
  messagesEndRef,
  inputRef,
}: {
  messages: ChatMessageData[]
  input: string
  setInput: (v: string) => void
  isLoading: boolean
  onClose: () => void
  onSend: (text: string) => void
  onSelectSuggestion: (s: string) => void
  messagesEndRef: React.RefObject<HTMLDivElement | null>
  inputRef: React.RefObject<HTMLInputElement | null>
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[60] flex items-end justify-center p-0 md:items-center md:p-6"
      role="dialog"
      aria-modal="true"
      aria-label="MarkScheme agent chat"
    >
      <div
        className="absolute inset-0 ec-modal-backdrop"
        onClick={onClose}
      />

      <motion.div
        initial={{ opacity: 0, y: 40, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 40, scale: 0.95 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="relative flex h-[88vh] max-h-[820px] w-full flex-col overflow-hidden rounded-t-3xl border border-[var(--ec-border)] bg-[var(--ec-surface)] shadow-2xl md:h-[80vh] md:w-[640px] md:rounded-3xl"
      >
        <header className="flex items-center justify-between border-b border-[var(--ec-border)] bg-[var(--ec-surface)]/80 px-6 py-4 backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full ec-chat-avatar">
              <Sparkles className="h-5 w-5 ec-on-brand-text" />
            </div>
            <div>
              <h3 className="font-semibold text-[var(--ec-text-primary)]">MarkScheme Agent</h3>
              <p className="flex items-center gap-1.5 text-xs ec-text-brand">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[var(--ec-brand)]" />
                Online
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close chat"
            className="rounded-lg p-2 text-[var(--ec-text-secondary)] transition-colors hover:bg-[var(--ec-surface-raised)]"
          >
            <X className="h-5 w-5 text-[var(--ec-text-secondary)]" />
          </button>
        </header>

        <div className="flex-1 space-y-4 overflow-y-auto px-6 py-6">
          {messages.length === 0 && (
            <div className="py-12 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl ec-chat-avatar-soft">
                <Sparkles className="h-8 w-8 ec-text-brand" />
              </div>
              <h4 className="mb-2 text-xl font-semibold text-[var(--ec-text-primary)]">How can I help?</h4>
              <p className="mx-auto mb-6 max-w-sm text-sm text-[var(--ec-text-secondary)]">
                Ask about a past paper, get a topic diagnostic, or upload your work
                to see how marking works.
              </p>
              <SuggestionChips
                suggestions={STARTER_SUGGESTIONS}
                onSelect={onSelectSuggestion}
              />
            </div>
          )}

          {messages.map((msg) => (
            <ChatMessage key={msg.id} message={msg} />
          ))}

          {isLoading && (
            <div className="flex items-center gap-2 text-sm text-[var(--ec-text-secondary)]">
              <div className="flex gap-1">
                <span
                  className="h-2 w-2 animate-bounce rounded-full bg-[var(--ec-brand)]"
                  style={{ animationDelay: '0ms' }}
                />
                <span
                  className="h-2 w-2 animate-bounce rounded-full bg-[var(--ec-brand)]"
                  style={{ animationDelay: '150ms' }}
                />
                <span
                  className="h-2 w-2 animate-bounce rounded-full bg-[var(--ec-brand)]"
                  style={{ animationDelay: '300ms' }}
                />
              </div>
              <span>Thinking...</span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        <footer className="border-t border-[var(--ec-border)] bg-[var(--ec-surface)]/80 px-6 py-4 backdrop-blur-xl">
          <form
            onSubmit={(e) => {
              e.preventDefault()
              onSend(input)
            }}
            className="flex items-center gap-3"
          >
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask anything..."
              maxLength={1000}
              className="ec-input flex-1"
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              aria-label="Send message"
              className="rounded-xl ec-btn-send ec-on-brand-text p-3 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <ArrowUp className="h-5 w-5" />
            </button>
          </form>
          <p className="mt-2 text-center text-xs text-[var(--ec-text-secondary)]">
            Free during beta. Powered by MarkScheme.
          </p>
        </footer>
      </motion.div>
    </motion.div>
  )
}
