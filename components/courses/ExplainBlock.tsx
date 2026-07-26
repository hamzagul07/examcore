'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { LessonNote } from '@/lib/courses/margin-notes/types'
import {
  EXPLAIN_INTENTS,
  lessonBlockKey,
  type ExplainIntent,
} from '@/lib/courses/explain-block-key'
import { CourseRichText } from '@/components/courses/CourseRichText'
import { markHintUsed } from '@/components/courses/FeatureHint'
import { HINT_KEYS } from '@/lib/courses/first-run'

/**
 * Per-paragraph help, attached to one lesson note block.
 *
 * Additive by design: this expands *below* the paragraph and never replaces or
 * hides the bullets or the exam tip. The old page-level "Explain simpler"
 * toggle did hide them, which took exam guidance away from precisely the
 * student who had just asked for help.
 *
 * Three intents rather than one button, because "I don't understand" is three
 * different failures — unfamiliar wording, missing derivation, and no concrete
 * referent — and they need different answers.
 */

const INTENT_LABEL: Record<ExplainIntent, string> = {
  simpler: 'Simpler',
  why: 'Why?',
  example: 'Show me',
}

const INTENT_HINT: Record<ExplainIntent, string> = {
  simpler: 'Say this again in plain English',
  why: 'Where does this come from?',
  example: 'Give me a concrete example',
}

type SsePayload = {
  type?: string
  text?: string
  body?: string
  error?: string
}

function parseSseLine(line: string): SsePayload | null {
  if (!line.startsWith('data: ')) return null
  try {
    return JSON.parse(line.slice(6)) as SsePayload
  } catch {
    return null
  }
}

export function ExplainBlock({
  subjectCode,
  lessonSlug,
  block,
}: {
  subjectCode: string
  lessonSlug: string
  block: LessonNote
}) {
  const blockKey = useMemo(() => lessonBlockKey(block), [block])

  const [open, setOpen] = useState<ExplainIntent | null>(null)
  const [answers, setAnswers] = useState<Partial<Record<ExplainIntent, string>>>({})
  const [pending, setPending] = useState<ExplainIntent | null>(null)
  const [error, setError] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => () => abortRef.current?.abort(), [])

  // Escape closes the panel — it is an inline expansion, and a reader who opened
  // one mid-paragraph should be able to dismiss it without reaching for the mouse.
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      const el = panelRef.current
      if (!el) return
      // Only the panel the reader is actually in.
      if (!el.contains(document.activeElement) && !el.matches(':hover')) return
      setOpen(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  // A content regen changes the key; anything we streamed for the old
  // paragraph no longer describes what is on screen.
  useEffect(() => {
    setAnswers({})
    setOpen(null)
    setError(null)
  }, [blockKey])

  const request = useCallback(
    async (intent: ExplainIntent) => {
      abortRef.current?.abort()
      const controller = new AbortController()
      abortRef.current = controller

      setPending(intent)
      setError(null)
      setAnswers((prev) => ({ ...prev, [intent]: '' }))

      try {
        const res = await fetch('/api/courses/explain', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ subjectCode, lessonSlug, blockKey, intent }),
          signal: controller.signal,
        })

        if (!res.body) throw new Error('No response body')

        const reader = res.body.getReader()
        const decoder = new TextDecoder()
        let buffer = ''
        let failed: string | null = null

        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split('\n')
          buffer = lines.pop() || ''

          for (const line of lines) {
            const data = parseSseLine(line)
            if (!data) continue
            if (data.type === 'error') {
              failed = data.error || 'Could not explain this right now.'
            } else if (data.type === 'delta' && data.text) {
              const chunk = data.text
              setAnswers((prev) => ({ ...prev, [intent]: (prev[intent] ?? '') + chunk }))
            } else if (data.type === 'done' && data.body) {
              const body = data.body
              setAnswers((prev) => ({ ...prev, [intent]: body }))
            }
          }
        }

        if (failed) {
          setError(failed)
          setAnswers((prev) => {
            const next = { ...prev }
            delete next[intent]
            return next
          })
        }
      } catch (err) {
        if ((err as Error)?.name === 'AbortError') return
        setError('Could not explain this right now. Try again.')
        setAnswers((prev) => {
          const next = { ...prev }
          delete next[intent]
          return next
        })
      } finally {
        setPending((current) => (current === intent ? null : current))
      }
    },
    [blockKey, lessonSlug, subjectCode]
  )

  const onPick = useCallback(
    (intent: ExplainIntent) => {
      if (open === intent) {
        setOpen(null)
        return
      }
      setOpen(intent)
      setError(null)
      // Using it is the best acknowledgement — the hint retires itself.
      markHintUsed(HINT_KEYS.explain)
      if (answers[intent] === undefined) void request(intent)
    },
    [answers, open, request]
  )

  const panelId = `explain-${blockKey}`
  const body = open ? answers[open] : undefined
  const isStreaming = pending !== null && pending === open

  return (
    <div className="explain-block">
      <div className="explain-actions">
        <span className="micro explain-lead">Not clear?</span>
        {EXPLAIN_INTENTS.map((intent) => (
          <button
            key={intent}
            type="button"
            className={`explain-btn${open === intent ? ' on' : ''}`}
            onClick={() => onPick(intent)}
            aria-expanded={open === intent}
            aria-controls={panelId}
            title={INTENT_HINT[intent]}
          >
            {INTENT_LABEL[intent]}
          </button>
        ))}
      </div>

      {open ? (
        <div
          className="explain-panel"
          id={panelId}
          ref={panelRef}
          role="region"
          aria-live="polite"
          aria-label={INTENT_HINT[open]}
        >
          <div className="explain-panel-head">
            <span className="micro explain-panel-tag">{INTENT_HINT[open]}</span>
            <button
              type="button"
              className="explain-close"
              onClick={() => setOpen(null)}
              aria-label="Close explanation"
            >
              ×
            </button>
          </div>
          {body ? (
            <div className="body-2 explain-panel-body">
              <CourseRichText content={body} variant="prose" />
            </div>
          ) : null}
          {isStreaming && !body ? (
            // Shimmer rather than a "thinking…" line: it reserves the height the
            // answer will occupy, so the paragraph below does not jump when the
            // first token lands.
            <div className="explain-skeleton" aria-hidden>
              <span />
              <span />
              <span />
            </div>
          ) : null}
          {error ? <p className="body-2 explain-panel-error">{error}</p> : null}
        </div>
      ) : null}
    </div>
  )
}
