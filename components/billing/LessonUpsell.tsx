'use client'

import Link from 'next/link'

type Feature = 'diagrams' | 'practice' | 'interactive'

/**
 * `scene` deep-links to the single /demo panel that proves *this* feature, so a
 * reader refused flashcards lands on the working flashcards rather than at the
 * top of a page about everything. See DemoSectionNav's `?scene=` handling.
 */
const COPY: Record<
  Feature,
  { title: string; body: string; stamp: string; scene: string; see: string }
> = {
  diagrams: {
    title: 'Live diagrams & step-by-step visuals',
    body: 'Play interactive diagrams, drag the controls, and walk through each step.',
    stamp: '◇',
    scene: 'cards',
    see: 'See a lesson with everything switched on →',
  },
  practice: {
    title: 'Past-paper practice questions',
    body: 'Try a real Cambridge question for this topic and mark it against the official scheme.',
    stamp: 'M1',
    scene: 'paper',
    see: 'See the question desk it builds for you →',
  },
  interactive: {
    title: 'Flashcards, quick checks & concept maps',
    body: 'Test yourself with active-recall flashcards, quizzes, and connected concept maps.',
    stamp: '¶',
    scene: 'cards',
    see: 'Try the real flashcards on an example lesson →',
  },
}

/**
 * Inline upsell shown in place of a gated lesson section for free-tier users.
 * Signed-out users are nudged to sign up; free users to upgrade via pricing.
 *
 * The secondary link matters more than it looks. These three sentences describe
 * features the reader has never seen — "drag the controls", "connected concept
 * maps" — and a description cannot create want on its own. /demo is a whole
 * worked account, so there is somewhere to send a reader who is interested but
 * not yet convinced, instead of only somewhere to send one who already is.
 */
export function LessonUpsell({
  feature,
  signedIn,
}: {
  feature: Feature
  signedIn?: boolean
}) {
  const { title, body, stamp, scene, see } = COPY[feature]
  const cta = signedIn ? 'See plans →' : 'Create free account →'
  return (
    <div className="lesson-upsell card lesson-upsell--paper" data-screen-label="Lesson — upgrade">
      <span className="ec-ink-stamp lesson-upsell-icon" aria-hidden>
        {stamp}
      </span>
      <div className="lesson-upsell-body">
        <p className="lesson-upsell-title serif">{title}</p>
        <p className="body-2 lesson-upsell-text">{body}</p>
        <Link className="lesson-upsell-see" href={`/demo?scene=${scene}`}>
          {see}
        </Link>
      </div>
      <Link className="btn-primary sm lesson-upsell-cta" href="/pricing">
        {cta}
      </Link>
    </div>
  )
}
