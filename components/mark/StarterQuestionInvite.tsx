'use client'

import { useEffect, useState } from 'react'
import { trackFunnelEvent } from '@/lib/analytics/funnel'

export type StarterQuestionPayload = {
  paper_code: string
  paper_session: string
  question_number: string
  question_text: string
  total_marks: number
}

/**
 * "Nothing to hand? Try a real one."
 *
 * Over 30 days, 1,300 sessions opened /mark and 93 typed a character. The page
 * asks a visitor to bring a question, an answer and three minutes of patience;
 * someone who arrived from a grade-boundary search has none of them, and the
 * only thing offered to them was a read-only example that 16 of 1,300 opened.
 *
 * This fills the form with a real banked past-paper question — the path that
 * marks best, because the paper reference resolves the official scheme and the
 * total comes from the row rather than being read off an image.
 *
 * Only rendered when the form is genuinely empty; the moment a student has
 * their own work in hand, someone else's question is in the way.
 */
export function StarterQuestionInvite({
  subject,
  onLoad,
}: {
  /** The chosen subject, when there is one. Otherwise the server picks. */
  subject?: string | null
  onLoad: (question: StarterQuestionPayload) => void
}) {
  const [question, setQuestion] = useState<StarterQuestionPayload | null>(null)

  // Fetched on mount, and the whole block renders nothing until a real question
  // comes back. Only four Cambridge subjects have whole, self-contained
  // questions banked, so an invitation that appears before we know would
  // promise something we often cannot deliver — and an error where a student
  // asked for nothing is worse than no offer.
  useEffect(() => {
    let cancelled = false
    const url = subject
      ? `/api/mark/starter-question?subject=${encodeURIComponent(subject)}`
      : '/api/mark/starter-question'
    fetch(url)
      .then((r) => r.json())
      .then((data: { found?: boolean } & Partial<StarterQuestionPayload>) => {
        if (cancelled) return
        if (
          data.found &&
          data.paper_code &&
          data.paper_session &&
          data.question_number &&
          data.question_text &&
          typeof data.total_marks === 'number'
        ) {
          setQuestion(data as StarterQuestionPayload)
        }
      })
      .catch(() => {
        /* No offer is the correct failure here. */
      })
    return () => {
      cancelled = true
    }
  }, [subject])

  if (!question) return null

  return (
    <div className="ms-starter-invite">
      <p className="ms-starter-invite-lead">
        <strong>No question to hand?</strong> Here is a real one —{' '}
        <span className="ms-starter-invite-ref">
          {question.paper_code} Q{question.question_number}, {question.total_marks}{' '}
          {question.total_marks === 1 ? 'mark' : 'marks'}
        </span>
      </p>
      {/* The question itself, because an abstract offer is what the read-only
          example already is, and 16 of 1,300 sessions opened that. */}
      <p className="ms-starter-invite-question">{question.question_text}</p>
      <button
        type="button"
        className="ec-btn-secondary ms-starter-invite-cta"
        onClick={() => {
          trackFunnelEvent('starter_question_taken', {
            subject: question.paper_code.split('/')[0] ?? null,
          })
          onLoad(question)
        }}
      >
        Answer this one &rarr;
      </button>
    </div>
  )
}
