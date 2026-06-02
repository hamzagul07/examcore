'use client'

import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Send, Sparkles, RotateCcw } from 'lucide-react'
import { useOmniAI } from '@/lib/omni-ai/context'
import { StreamingMessage } from './StreamingMessage'
import { UpgradeModal } from '@/components/billing/UpgradeModal'
import { OmniUsageStrip, useOmniSubmitBlocked } from '@/components/billing/OmniUsageStrip'
import { omniCapForTier } from '@/lib/billing/caps'
import type { SubscriptionTier } from '@/lib/database.types'
import type { OmniAIMessage } from '@/lib/omni-ai/types'
import {
  getContextLabel,
  getEmptyStateMessage,
  getProactiveOpener,
} from '@/lib/omni-ai/system-prompts'

interface ChatPanelProps {
  showHeader?: boolean
  showSuggestions?: boolean
  starterSuggestions?: string[]
  proactiveOpener?: boolean
  splitPaper?: boolean
  className?: string
}

type OmniQuotaModalState = {
  tier: SubscriptionTier
  cap: number
  periodResetsAt: string | null
  creditBalance: number
}

type SsePayload = {
  type: string
  content?: string
  cleanText?: string
  action?: OmniAIMessage['action']
  error?: string
  code?: string
  tier?: SubscriptionTier
  cap?: number
  period_resets_at?: string | null
  credit_balance?: number
}

function parseOmniQuotaPayload(data: SsePayload): OmniQuotaModalState | null {
  if (data.code !== 'omni_quota_exceeded' || !data.tier) return null
  return {
    tier: data.tier,
    cap: data.cap ?? omniCapForTier(data.tier),
    periodResetsAt: data.period_resets_at ?? null,
    creditBalance: data.credit_balance ?? 0,
  }
}

function parseSseLine(line: string): SsePayload | null {
  if (!line.startsWith('data: ')) return null
  try {
    return JSON.parse(line.slice(6)) as SsePayload
  } catch {
    return null
  }
}

export function ChatPanel({
  showHeader = true,
  showSuggestions = true,
  starterSuggestions = [],
  proactiveOpener = false,
  splitPaper = false,
  className = '',
}: ChatPanelProps) {
  const {
    context,
    messages,
    setMessages,
    isStreaming,
    setIsStreaming,
    clearChat,
  } = useOmniAI()
  const [input, setInput] = useState('')
  const [omniQuotaModal, setOmniQuotaModal] = useState<OmniQuotaModalState | null>(
    null
  )
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const openerInjectedRef = useRef(false)

  const isMetered = context.type !== 'landing'
  const omniSubmitBlocked = useOmniSubmitBlocked()

  function handleOmniQuotaExceeded(
    quota: OmniQuotaModalState,
    userMsgId: string,
    assistantId: string,
    restoreText: string
  ) {
    setMessages((prev) => prev.filter((m) => m.id !== userMsgId && m.id !== assistantId))
    setInput(restoreText)
    setOmniQuotaModal(quota)
  }

  // Proactive opener when sidebar opens on context-rich pages.
  useEffect(() => {
    if (!proactiveOpener || messages.length > 0 || openerInjectedRef.current) {
      return
    }
    const opener = getProactiveOpener(context)
    if (opener) {
      openerInjectedRef.current = true
      setMessages([
        {
          id: `opener-${Date.now()}`,
          role: 'assistant',
          content: opener,
        },
      ])
    }
  }, [context, proactiveOpener, messages.length, setMessages])

  // Reset opener flag when chat cleared.
  useEffect(() => {
    if (messages.length === 0) {
      openerInjectedRef.current = false
    }
  }, [messages.length])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isStreaming])

  async function sendMessage(text: string) {
    if (!text.trim() || isStreaming) return

    const userMsg: OmniAIMessage = {
      id: `u-${Date.now()}`,
      role: 'user',
      content: text,
    }

    const assistantId = `a-${Date.now()}`
    const assistantMsg: OmniAIMessage = {
      id: assistantId,
      role: 'assistant',
      content: '',
      isStreaming: true,
    }

    setMessages((prev) => [...prev, userMsg, assistantMsg])
    setInput('')
    setIsStreaming(true)

    try {
      const res = await fetch('/api/omni-ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: messages.slice(-8),
          context,
          query: text,
          attemptId:
            context.type === 'marking_result'
              ? context.data.attemptId
              : undefined,
        }),
      })

      if (res.status === 429) {
        const raw = await res.text()
        let msg = 'Rate limit reached. Try again later.'
        for (const line of raw.split('\n')) {
          const data = parseSseLine(line)
          if (data?.error) msg = data.error
        }
        setMessages((prev) =>
          prev
            .filter((m) => m.id !== userMsg.id && m.id !== assistantId)
            .concat({
              id: assistantId,
              role: 'assistant',
              content: msg,
            })
        )
        setInput(text)
        setIsStreaming(false)
        return
      }

      if (isMetered && res.status === 402) {
        const raw = await res.text()
        for (const line of raw.split('\n')) {
          const data = parseSseLine(line)
          if (!data) continue
          const quota = parseOmniQuotaPayload(data)
          if (quota) {
            handleOmniQuotaExceeded(quota, userMsg.id, assistantId, text)
            return
          }
        }
      }

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
          const data = parseSseLine(line)
          if (!data) continue

          if (isMetered && data.type === 'error') {
            const quota = parseOmniQuotaPayload(data)
            if (quota) {
              handleOmniQuotaExceeded(quota, userMsg.id, assistantId, text)
              return
            }
          }

          if (data.type === 'chunk' && data.content) {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantId
                  ? { ...m, content: m.content + data.content }
                  : m
              )
            )
          } else if (data.type === 'done') {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantId
                  ? {
                      ...m,
                      content: data.cleanText || m.content,
                      action: data.action,
                      isStreaming: false,
                    }
                  : m
              )
            )
            if (isMetered && typeof window !== 'undefined') {
              window.dispatchEvent(new Event('ec:billing-refresh'))
            }
          } else if (data.type === 'error') {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantId
                  ? {
                      ...m,
                      content:
                        data.error || 'Sorry, something went wrong. Try again?',
                      isStreaming: false,
                    }
                  : m
              )
            )
          }
        }
      }
    } catch (error) {
      console.error('Omni-AI send failed:', error)
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId
            ? {
                ...m,
                content: 'Sorry, something went wrong. Try again?',
                isStreaming: false,
              }
            : m
        )
      )
    } finally {
      setIsStreaming(false)
    }
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    sendMessage(input)
  }

  return (
    <>
      <div className={`flex h-full flex-col ${className}`}>
        {showHeader && (
          <div
            className="flex items-center justify-between border-b px-5 py-4"
            style={{ borderColor: 'var(--ec-border)' }}
          >
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full ec-chat-avatar">
                <Sparkles className="h-5 w-5 ec-on-brand-text" />
              </div>
              <div>
                <h3 className="font-semibold leading-tight text-[var(--ec-text-primary)]">
                  MarkScheme
                </h3>
                <p className="flex items-center gap-1.5 text-xs text-[var(--ec-brand)]">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[var(--ec-brand)]" />
                  {getContextLabel(context.type)}
                </p>
              </div>
            </div>
            {messages.length > 0 && (
              <button
                type="button"
                onClick={clearChat}
                className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg text-[var(--ec-text-secondary)] transition-colors hover:bg-[var(--ec-surface-raised)]"
                title="Clear chat"
              >
                <RotateCcw className="h-4 w-4" />
              </button>
            )}
          </div>
        )}

        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
          {messages.length === 0 && showSuggestions && (
            <div className="py-12 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl ec-chat-avatar-soft">
                <Sparkles className="h-8 w-8 ec-text-brand" />
              </div>
              <h4 className="mb-2 text-lg font-semibold text-[var(--ec-text-primary)]">
                How can I help?
              </h4>
              <p className="mb-6 text-sm text-[var(--ec-text-secondary)]">
                {getEmptyStateMessage(context.type)}
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                {starterSuggestions.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => sendMessage(s)}
                    className="min-h-[44px] rounded-full border px-4 py-2.5 text-sm transition-all ec-hover-brand-border-mild hover:bg-[var(--ec-brand-muted)] hover:text-[var(--ec-brand)]"
                    style={{
                      borderColor: 'var(--ec-border)',
                      background: 'var(--ec-surface-raised)',
                      color: 'var(--ec-text-secondary)',
                    }}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg) => (
            <StreamingMessage key={msg.id} message={msg} splitPaper={splitPaper} />
          ))}

          <div ref={messagesEndRef} />
        </div>

        <OmniUsageStrip />
        <form
          onSubmit={handleSubmit}
          className="border-t px-5 py-4 backdrop-blur-xl"
          style={{
            borderColor: 'var(--ec-border)',
            background: 'color-mix(in srgb, var(--ec-surface) 92%, transparent)',
          }}
        >
          <div className="flex items-center gap-2">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about your paper, mark scheme, or revision…"
              maxLength={2000}
              disabled={isStreaming || (isMetered && omniSubmitBlocked)}
              className="ec-input flex-1 disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={!input.trim() || isStreaming || (isMetered && omniSubmitBlocked)}
              className="rounded-xl ec-btn-send ec-on-brand-text p-3 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Send className="h-5 w-5" />
            </button>
          </div>
        </form>
      </div>

      {isMetered && (
        <UpgradeModal
          open={Boolean(omniQuotaModal)}
          onClose={() => setOmniQuotaModal(null)}
          variant="omni_cap"
          tier={omniQuotaModal?.tier}
          cap={omniQuotaModal?.cap}
          periodResetsAt={omniQuotaModal?.periodResetsAt}
          creditBalance={omniQuotaModal?.creditBalance}
        />
      )}
    </>
  )
}
