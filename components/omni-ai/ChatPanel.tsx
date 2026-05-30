'use client'

import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Send, Sparkles, RotateCcw } from 'lucide-react'
import { useOmniAI } from '@/lib/omni-ai/context'
import { StreamingMessage } from './StreamingMessage'
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
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const openerInjectedRef = useRef(false)

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
          try {
            const data = JSON.parse(line.slice(6)) as {
              type: string
              content?: string
              cleanText?: string
              action?: OmniAIMessage['action']
              error?: string
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
          } catch (e) {
            console.error('Omni-AI parse error:', e)
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
    <div className={`flex h-full flex-col ${className}`}>
      {showHeader && (
        <div className="flex items-center justify-between border-b border-white/5 px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-cyan-500">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <div>
              <h3 className="font-semibold leading-tight text-white">Omni-AI</h3>
              <p className="flex items-center gap-1.5 text-xs text-emerald-400">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
                {getContextLabel(context.type)}
              </p>
            </div>
          </div>
          {messages.length > 0 && (
            <button
              type="button"
              onClick={clearChat}
              className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-white/5"
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
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500/20 to-cyan-500/20">
              <Sparkles className="h-8 w-8 text-emerald-400" />
            </div>
            <h4 className="mb-2 text-lg font-semibold text-white">How can I help?</h4>
            <p className="mb-6 text-sm text-slate-400">
              {getEmptyStateMessage(context.type)}
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              {starterSuggestions.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => sendMessage(s)}
                  className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-slate-300 transition-all hover:border-emerald-500/30 hover:bg-emerald-500/10 hover:text-emerald-300"
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

      <form
        onSubmit={handleSubmit}
        className="border-t border-white/5 bg-dark-950/30 px-5 py-4 backdrop-blur-xl"
      >
        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask Omni-AI anything..."
            maxLength={2000}
            disabled={isStreaming}
            className="flex-1 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-slate-500 transition-all focus:border-emerald-500/50 focus:bg-white/10 focus:outline-none disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!input.trim() || isStreaming}
            className="rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 p-3 text-white transition-shadow hover:shadow-[0_0_24px_rgba(16,185,129,0.4)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Send className="h-5 w-5" />
          </button>
        </div>
      </form>
    </div>
  )
}
