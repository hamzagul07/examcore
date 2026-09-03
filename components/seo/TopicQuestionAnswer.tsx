'use client'

import { useId, useState } from 'react'

import {
  MIN_PRACTICE_ANSWER,
  isUsablePracticeAnswer,
  stashPracticeAnswer,
} from '@/lib/marking/practice-answer'
import { trackAnswerInputStarted, trackFunnelEvent } from '@/lib/analytics/funnel'
import { splitSubjectLevel, stashHandoff } from '@/lib/courses/mark-handoff'

type Props = {
  /** From the question cache — already carries practice=1 and the paper reference. */
  markHref: string
  /** Cambridge numeric code or IB subject slug, for the funnel beacon only. */
  subject: string
  /** Funnel board segment: 'cambridge' | 'ib' | … */
  board: string
  /** "9700/23 · 2(c)" — names the question for screen readers. */
  label: string
  /**
   * Overrides the field label where "Your answer to X" does not read.
   *
   * It is right for a question ("Your answer to 9700/23 Q2(c)") and wrong for a
   * whole subject ("Your answer to IB Chemistry HL"), which is what the subject
   * pages pass.
   */
  fieldLabel?: string
  /**
   * Show the box immediately instead of behind "Answer this one".
   *
   * For a page with ONE task the box is the page's action, so hiding it behind
   * a disclosure only adds a click. The collapsed form exists because the
   * Cambridge pages list up to a dozen questions and a dozen open textareas is
   * a wall, not an invitation.
   */
  defaultOpen?: boolean
  /** Taller where the expected answer is an essay extract rather than working. */
  rows?: number
  placeholder?: string
  /** What the answer will be marked against, shown once it is long enough. */
  readyNote?: string
  /** Funnel `source` for both beacons, so the two surfaces stay separable. */
  source?: string
  /**
   * The question this answer is against, in full, when the page holds one.
   *
   * Supplying it switches the handoff: question AND answer travel, via
   * lib/courses/mark-handoff. That is the only route that leaves /mark in a
   * submittable state for a subject-only deep link — practice marking refuses
   * to start without a question, so an answer arriving alone strands the
   * student on a blocked button having just done the writing.
   *
   * Left undefined by the topic pages on purpose: their stems are 130-char
   * truncated previews, and marking against half a question is worse than not
   * prefilling at all. There the paper reference in the link resolves the real
   * question server-side instead.
   */
  question?: string
  /**
   * Subject code for that handoff, level suffix included ("ib-chemistry-hl").
   * The marker picks subject and level with separate controls, so it arrives
   * split — see splitSubjectLevel.
   */
  handoffSubjectCode?: string
  /** Where the student is returned to after marking. */
  returnPath?: string
}

/**
 * Write the answer where the question is.
 *
 * The topic pages already link each question to /mark with the paper, session
 * and question number pre-selected, which is a good link and still asks the
 * student to leave before they have written anything. Over the 30 days to
 * 2026-08-29, 1,891 sessions landed on a product surface and 86 began an
 * answer — the drop is here, not at the marker.
 *
 * So the box comes to them. On submit the answer travels in sessionStorage
 * (see lib/marking/practice-answer.ts) and /mark opens with it already typed.
 *
 * Independent per question rather than an accordion: a student who has written
 * into one box and then opens another must not lose the first draft.
 *
 * A client island on a prerendered SEO page — no data fetching, no auth read,
 * so the route stays static. Guests are not gated here; /mark owns the
 * allowance, and a guest's one free mark is the whole point of the invitation.
 */
export function TopicQuestionAnswer({
  markHref,
  subject,
  board,
  label,
  fieldLabel,
  defaultOpen = false,
  rows = 5,
  placeholder = 'Write it as you would in the exam — the examiner marks what you actually wrote.',
  readyNote = 'Marked against the official scheme. No account needed for your first one.',
  source = 'topic_question_inline',
  question,
  handoffSubjectCode,
  returnPath,
}: Props) {
  const [open, setOpen] = useState(defaultOpen)
  const [answer, setAnswer] = useState('')
  const [leaving, setLeaving] = useState(false)
  const id = useId()

  const ready = isUsablePracticeAnswer(answer)
  const remaining = MIN_PRACTICE_ANSWER - answer.trim().length

  function submit() {
    if (!ready || leaving) return
    setLeaving(true)
    trackFunnelEvent('mark_cta_clicked', {
      subject,
      board,
      source,
    })
    if (question && handoffSubjectCode) {
      const { subjectCode, ibLevel } = splitSubjectLevel(handoffSubjectCode)
      window.location.href = stashHandoff(
        { question, answer, subjectCode, ibLevel, returnPath: returnPath ?? null },
        markHref
      )
      return
    }
    window.location.href = stashPracticeAnswer(answer, markHref)
  }

  if (!open) {
    return (
      // No aria-controls while collapsed: the panel is not in the DOM yet, and
      // pointing at an id that does not exist is worse than omitting it.
      <button
        type="button"
        className="ms-tq-open"
        aria-expanded="false"
        onClick={() => setOpen(true)}
      >
        Answer this one &rarr;
      </button>
    )
  }

  return (
    <div className="ms-tq-answer" id={id}>
      <label className="ms-tq-answer-label" htmlFor={`${id}-input`}>
        {fieldLabel ?? `Your answer to ${label}`}
      </label>
      <textarea
        id={`${id}-input`}
        className="ms-tq-answer-input"
        rows={rows}
        value={answer}
        // Focus the box the student just asked for by clicking, never on load:
        // an autofocused textarea on a prerendered page scrolls the reader past
        // the question they came to read.
        autoFocus={!defaultOpen}
        placeholder={placeholder}
        onChange={(e) => {
          setAnswer(e.target.value)
          if (e.target.value.trim().length > 0) {
            trackAnswerInputStarted({ subject, board, source })
          }
        }}
      />
      <div className="ms-tq-answer-actions">
        <button
          type="button"
          className="ec-btn-primary ms-tq-answer-go"
          disabled={!ready || leaving}
          onClick={submit}
        >
          {leaving ? 'Opening the marker…' : 'Get this marked →'}
        </button>
        {/* Nothing sensible to collapse back to when the box is the page's
            one action, so the control is omitted rather than shown inert. */}
        {defaultOpen ? null : (
          <button
            type="button"
            className="ec-btn-underline text-sm"
            onClick={() => setOpen(false)}
            disabled={leaving}
          >
            Close
          </button>
        )}
      </div>
      <p className="ms-tq-answer-note">
        {ready
          ? readyNote
          : `Write ${remaining} more character${remaining === 1 ? '' : 's'} to send this for marking.`}
      </p>
    </div>
  )
}
