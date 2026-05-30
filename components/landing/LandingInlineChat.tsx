'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { RichTextRenderer } from '@/components/RichTextRenderer'
import { useEcTheme } from '@/lib/design-system/ThemeProvider'
import type { OmniAIAction } from '@/lib/omni-ai/types'

// ─── Types ───────────────────────────────────────────────────────────────────

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  action?: OmniAIAction
  isStreaming?: boolean
}

export interface LandingInlineChatProps {
  onActiveChange?: (active: boolean) => void
  className?: string
}

// ─── Constants ────────────────────────────────────────────────────────────────

const SUGGESTED_PROMPTS = [
  'Help me with a Math question',
  'How does marking work?',
  'What subjects do you cover?',
  'Mark a sample essay',
]

let _idCounter = 0
function genId(): string {
  return `msg-${Date.now()}-${++_idCounter}`
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Spinner() {
  return (
    <svg
      className="animate-spin"
      style={{ width: 16, height: 16, color: 'var(--ec-canvas)' }}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  )
}

function StreamingCaret() {
  return (
    <span
      className="inline-block ml-0.5 align-middle animate-pulse"
      style={{
        width: 2,
        height: '1em',
        background: 'var(--ec-brand)',
        borderRadius: 1,
        verticalAlign: 'text-bottom',
      }}
      aria-hidden="true"
    />
  )
}

interface CTAButtonProps {
  cta: { text: string; href?: string; style?: 'primary' | 'secondary' }
}
function CTAButton({ cta }: CTAButtonProps) {
  const href = cta.href || '/auth/signup'
  return (
    <Link
      href={href}
      className={cta.style === 'secondary' ? 'ec-btn-secondary' : 'ec-btn-primary'}
      style={{ marginTop: 10, fontSize: 14, padding: '10px 20px' }}
    >
      {cta.text}
    </Link>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export function LandingInlineChat({ onActiveChange, className = '' }: LandingInlineChatProps) {
  const { theme } = useEcTheme()
  const richTextVariant = theme === 'zen' ? 'light' : 'dark'

  const [messages, setMessages] = useState<Message[]>([])
  const [inputValue, setInputValue] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)

  const inputRef = useRef<HTMLInputElement>(null)
  const bottomSentinelRef = useRef<HTMLDivElement>(null)
  const conversationRef = useRef<HTMLDivElement>(null)
  const abortRef = useRef<AbortController | null>(null)

  const hasMessages = messages.length > 0

  // ── Hero-collapse coordination ──────────────────────────────────────────────
  const notifiedActiveRef = useRef(false)
  useEffect(() => {
    if (hasMessages && !notifiedActiveRef.current) {
      notifiedActiveRef.current = true
      onActiveChange?.(true)
    }
  }, [hasMessages, onActiveChange])

  // ── Auto-scroll to bottom ───────────────────────────────────────────────────
  useEffect(() => {
    if (bottomSentinelRef.current) {
      bottomSentinelRef.current.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
    }
  }, [messages])

  // ── Mobile keyboard scroll ──────────────────────────────────────────────────
  useEffect(() => {
    const input = inputRef.current
    if (!input) return

    let timeoutId: ReturnType<typeof setTimeout>

    function onFocus() {
      // Only apply on touch devices
      if (!('ontouchstart' in window)) return
      timeoutId = setTimeout(() => {
        input?.scrollIntoView({ block: 'center', behavior: 'smooth' })
      }, 300)
    }

    function onViewportResize() {
      if (!window.visualViewport) return
      input?.scrollIntoView({ block: 'center', behavior: 'smooth' })
    }

    input.addEventListener('focus', onFocus)
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', onViewportResize)
    }

    return () => {
      clearTimeout(timeoutId)
      input.removeEventListener('focus', onFocus)
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', onViewportResize)
      }
    }
  }, [])

  // ── Send message ────────────────────────────────────────────────────────────
  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim()
      if (!trimmed || isStreaming) return

      const userMsg: Message = { id: genId(), role: 'user', content: trimmed }
      const assistantId = genId()
      const assistantMsg: Message = {
        id: assistantId,
        role: 'assistant',
        content: '',
        isStreaming: true,
      }

      setMessages((prev) => [...prev, userMsg, assistantMsg])
      setInputValue('')
      setIsStreaming(true)

      const history = [...messages, userMsg].map((m) => ({
        role: m.role,
        content: m.content,
      }))

      const controller = new AbortController()
      abortRef.current = controller

      try {
        const res = await fetch('/api/omni-ai', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: history.slice(-8),
            context: { type: 'landing' },
            query: trimmed,
          }),
          signal: controller.signal,
        })

        if (!res.body) throw new Error('No response body')

        const reader = res.body.getReader()
        const decoder = new TextDecoder()
        let buffer = ''

        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split('\n')
          buffer = lines.pop() || ''

          for (const line of lines) {
            if (!line.startsWith('data: ')) continue
            let data: { type: string; content?: string; cleanText?: string; action?: OmniAIAction; error?: string }
            try {
              data = JSON.parse(line.slice(6))
            } catch {
              continue
            }

            if (data.type === 'chunk' && data.content) {
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantId
                    ? { ...m, content: m.content + data.content! }
                    : m,
                ),
              )
            } else if (data.type === 'done') {
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantId
                    ? {
                        ...m,
                        content: data.cleanText ?? m.content,
                        action: data.action,
                        isStreaming: false,
                      }
                    : m,
                ),
              )
            } else if (data.type === 'error') {
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantId
                    ? { ...m, content: data.error ?? 'An error occurred.', isStreaming: false }
                    : m,
                ),
              )
            }
          }
        }
      } catch (err) {
        if ((err as Error).name === 'AbortError') return
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? { ...m, content: 'Something went wrong. Please try again.', isStreaming: false }
              : m,
          ),
        )
      } finally {
        setIsStreaming(false)
        abortRef.current = null
        // Ensure streaming flag is cleared even if 'done' event was missed
        setMessages((prev) =>
          prev.map((m) => (m.id === assistantId ? { ...m, isStreaming: false } : m)),
        )
      }
    },
    [isStreaming, messages],
  )

  // ── Reset ───────────────────────────────────────────────────────────────────
  const handleReset = useCallback(() => {
    abortRef.current?.abort()
    setMessages([])
    setInputValue('')
    setIsStreaming(false)
    notifiedActiveRef.current = false
    onActiveChange?.(false)
    setTimeout(() => inputRef.current?.focus(), 50)
  }, [onActiveChange])

  // ── Input handlers ──────────────────────────────────────────────────────────
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        sendMessage(inputValue)
      }
    },
    [inputValue, sendMessage],
  )

  const handleSubmit = useCallback(() => {
    sendMessage(inputValue)
  }, [inputValue, sendMessage])

  const canSend = inputValue.trim().length > 0 && !isStreaming

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div
      className={className}
      style={{
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        gap: 0,
      }}
    >
      {/* ── Conversation area (animated in) ── */}
      <AnimatePresence>
        {hasMessages && (
          <motion.div
            key="conversation"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            style={{ overflow: 'hidden' }}
          >
            {/* Header with "Start over" */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-end',
                paddingBottom: 8,
              }}
            >
              <button
                onClick={handleReset}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: 13,
                  color: 'var(--ec-text-secondary)',
                  padding: '4px 0',
                  textDecoration: 'underline',
                  textUnderlineOffset: 3,
                }}
                aria-label="Clear conversation and start over"
              >
                Start over
              </button>
            </div>

            {/* Messages list */}
            <div
              ref={conversationRef}
              style={{
                maxHeight: 420,
                overflowY: 'auto',
                display: 'flex',
                flexDirection: 'column',
                gap: 12,
                paddingBottom: 4,
                scrollbarWidth: 'thin',
              }}
            >
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start',
                  }}
                >
                  <div
                    style={
                      msg.role === 'user'
                        ? {
                            background: 'var(--ec-brand-muted)',
                            border: '1px solid var(--ec-brand)',
                            borderRadius: 'var(--ec-radius-button)',
                            padding: '10px 14px',
                            maxWidth: '80%',
                            fontSize: 14,
                            lineHeight: 1.55,
                            color: 'var(--ec-text-primary)',
                          }
                        : {
                            background: 'var(--ec-surface-raised)',
                            border: '1px solid var(--ec-border)',
                            borderRadius: 'var(--ec-radius-button)',
                            padding: '10px 14px',
                            maxWidth: '90%',
                            fontSize: 14,
                          }
                    }
                  >
                    {msg.role === 'assistant' ? (
                      <>
                        {msg.content ? (
                          <RichTextRenderer
                            text={msg.content}
                            variant={richTextVariant}
                          />
                        ) : msg.isStreaming ? (
                          <span
                            style={{ color: 'var(--ec-text-secondary)', fontSize: 14 }}
                          >
                            Thinking
                            <StreamingCaret />
                          </span>
                        ) : null}
                        {msg.isStreaming && msg.content && <StreamingCaret />}

                        {/* CTA button from action */}
                        {!msg.isStreaming && msg.action && renderAction(msg.action)}
                      </>
                    ) : (
                      <span style={{ color: 'var(--ec-text-primary)' }}>{msg.content}</span>
                    )}
                  </div>
                </div>
              ))}
              <div ref={bottomSentinelRef} style={{ height: 1 }} aria-hidden="true" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Suggested prompts (only when no messages) ── */}
      <AnimatePresence>
        {!hasMessages && (
          <motion.div
            key="prompts"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 8,
              marginBottom: 12,
            }}
            role="list"
            aria-label="Suggested prompts"
          >
            {SUGGESTED_PROMPTS.map((prompt) => (
              <button
                key={prompt}
                role="listitem"
                onClick={() => sendMessage(prompt)}
                disabled={isStreaming}
                style={{
                  background: 'var(--ec-surface-raised)',
                  border: '1px solid var(--ec-border)',
                  borderRadius: 'var(--ec-radius-button)',
                  padding: '8px 14px',
                  fontSize: 13,
                  color: 'var(--ec-text-secondary)',
                  cursor: 'pointer',
                  transition: 'all 150ms ease',
                  minHeight: 36,
                  lineHeight: 1.4,
                }}
                onMouseEnter={(e) => {
                  ;(e.currentTarget as HTMLButtonElement).style.color =
                    'var(--ec-text-primary)'
                  ;(e.currentTarget as HTMLButtonElement).style.borderColor =
                    'var(--ec-brand)'
                  ;(e.currentTarget as HTMLButtonElement).style.background =
                    'var(--ec-brand-muted)'
                }}
                onMouseLeave={(e) => {
                  ;(e.currentTarget as HTMLButtonElement).style.color =
                    'var(--ec-text-secondary)'
                  ;(e.currentTarget as HTMLButtonElement).style.borderColor =
                    'var(--ec-border)'
                  ;(e.currentTarget as HTMLButtonElement).style.background =
                    'var(--ec-surface-raised)'
                }}
              >
                {prompt}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Input row ── */}
      <div
        style={{
          display: 'flex',
          gap: 8,
          alignItems: 'center',
          background: 'var(--ec-surface)',
          border: '1px solid var(--ec-border)',
          borderRadius: 'var(--ec-radius-button)',
          padding: '6px 6px 6px 14px',
          transition: 'border-color 200ms ease, box-shadow 200ms ease',
        }}
        onFocus={() => {}}
      >
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask Examcore anything about your A-Levels..."
          maxLength={2000}
          disabled={isStreaming}
          aria-label="Chat message input"
          style={{
            flex: 1,
            background: 'none',
            border: 'none',
            outline: 'none',
            fontSize: 15,
            lineHeight: 1.4,
            color: 'var(--ec-text-primary)',
            minHeight: 44,
            cursor: isStreaming ? 'not-allowed' : 'text',
          }}
        />
        <button
          onClick={handleSubmit}
          disabled={!canSend}
          className="ec-btn-primary"
          style={{
            padding: '10px 18px',
            fontSize: 14,
            minWidth: 44,
            minHeight: 44,
            flexShrink: 0,
            borderRadius: 'var(--ec-radius-button)',
          }}
          aria-label={isStreaming ? 'Sending…' : 'Send message'}
        >
          {isStreaming ? <Spinner /> : (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width={16}
              height={16}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2.5}
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          )}
        </button>
      </div>
    </div>
  )
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function renderAction(action: OmniAIAction): React.ReactNode {
  if (action.type === 'render_cta') {
    const cta = action.cta ?? (action.params as { text?: string; href?: string; style?: 'primary' | 'secondary' } | undefined)
    if (cta?.text) {
      return <CTAButton cta={{ text: cta.text, href: cta.href, style: cta.style }} />
    }
  }
  if (action.type === 'render_upload' || action.type === 'render_signup') {
    return (
      <CTAButton cta={{ text: 'Get started — it\'s free', href: '/auth/signup', style: 'primary' }} />
    )
  }
  return null
}
