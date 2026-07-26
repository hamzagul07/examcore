'use client'

import { useState } from 'react'
import Link from 'next/link'
import { resumeMessage, type Resume } from '@/lib/courses/lesson-resume'

/**
 * The one sentence worth showing someone who has been here before.
 *
 * Sits inline at the top of the lesson rather than floating: it is information
 * about where you are, not an interruption, and it should scroll away with the
 * rest of the page once acted on.
 */
export function ResumeStrip({
  state,
  onJump,
  practiceHref,
}: {
  state: Resume
  onJump: (id: string) => void
  practiceHref?: string | null
}) {
  const [hidden, setHidden] = useState(false)
  const msg = resumeMessage(state)
  if (!msg || hidden) return null

  return (
    <aside className="resume-strip" role="status">
      <div className="resume-strip-body">
        <p className="resume-strip-title">{msg.title}</p>
        <p className="resume-strip-text">{msg.body}</p>
      </div>
      <div className="resume-strip-actions">
        {state.kind === 'continue' ? (
          <button type="button" className="resume-strip-cta" onClick={() => onJump(state.nextId)}>
            Continue →
          </button>
        ) : null}
        {state.kind === 'check' ? (
          <button type="button" className="resume-strip-cta" onClick={() => onJump(state.checkId)}>
            Go to quick check →
          </button>
        ) : null}
        {state.kind === 'complete' && practiceHref ? (
          <Link className="resume-strip-cta" href={practiceHref}>
            Mark a question →
          </Link>
        ) : null}
        <button
          type="button"
          className="resume-strip-dismiss"
          onClick={() => setHidden(true)}
          aria-label="Hide"
        >
          ✕
        </button>
      </div>
    </aside>
  )
}
