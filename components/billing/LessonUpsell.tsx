'use client'

import Link from 'next/link'

type Feature = 'diagrams' | 'practice' | 'interactive'

const COPY: Record<Feature, { title: string; body: string; stamp: string }> = {
  diagrams: {
    title: 'Live diagrams & step-by-step visuals',
    body: 'Play interactive diagrams, drag the controls, and walk through each step.',
    stamp: '◇',
  },
  practice: {
    title: 'Past-paper practice questions',
    body: 'Try a real Cambridge question for this topic and mark it against the official scheme.',
    stamp: 'M1',
  },
  interactive: {
    title: 'Flashcards, quick checks & concept maps',
    body: 'Test yourself with active-recall flashcards, quizzes, and connected concept maps.',
    stamp: '¶',
  },
}

/**
 * Inline upsell shown in place of a gated lesson section for free-tier users.
 * Signed-out users are nudged to sign up; free users to upgrade via pricing.
 */
export function LessonUpsell({
  feature,
  signedIn,
}: {
  feature: Feature
  signedIn?: boolean
}) {
  const { title, body, stamp } = COPY[feature]
  const cta = signedIn ? 'See plans →' : 'Create free account →'
  return (
    <div className="lesson-upsell card lesson-upsell--paper" data-screen-label="Lesson — upgrade">
      <span className="ec-ink-stamp lesson-upsell-icon" aria-hidden>
        {stamp}
      </span>
      <div className="lesson-upsell-body">
        <p className="lesson-upsell-title serif">{title}</p>
        <p className="body-2 lesson-upsell-text">{body}</p>
      </div>
      <Link className="btn-primary sm lesson-upsell-cta" href="/pricing">
        {cta}
      </Link>
    </div>
  )
}
