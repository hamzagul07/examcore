'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  HINT_KEYS,
  STORAGE,
  nextHint,
  parseSeen,
  serializeSeen,
  type HintKey,
} from '@/lib/courses/first-run'

/**
 * Tells a reader about a feature they could not otherwise guess at — once.
 *
 * Inline rather than a floating tooltip: it sits in the flow above the thing it
 * describes, so it cannot cover the text, cannot mis-position on a resize, and
 * needs no portal. It also means a hint that somehow survives is a slightly odd
 * paragraph, not a coach mark stuck over the page.
 */

const COPY: Record<HintKey, { title: string; body: string }> = {
  [HINT_KEYS.explain]: {
    title: 'Stuck on a paragraph?',
    body: 'Every section has Simpler, Why? and Show me underneath. Tap one and this exact paragraph gets explained again — in plainer words, from first principles, or with a worked example.',
  },
  [HINT_KEYS.studyMode]: {
    title: 'Want the whole screen?',
    body: 'Turn on Study mode (top right). Same lesson — full-screen, just scroll. Press Escape or switch OFF to exit.',
  },
  [HINT_KEYS.highlight]: {
    title: 'You can mark this page up',
    body: 'Select any sentence and choose Key point, Don\u2019t get it, or Exam-worthy. It stays there next time, and everything you marked is collected at the bottom of the lesson — so "the four things I did not follow" becomes a revision list.',
  },
  [HINT_KEYS.diagramSync]: {
    title: 'The diagram follows your reading',
    body: 'It stays beside the text and advances to whichever step the paragraph you are on is describing. Tap a step to jump the other way.',
  },
  [HINT_KEYS.quickCheck]: {
    title: 'Write before you look',
    body: 'These want your answer first. You will keep far more by attempting it and then comparing than by reading the model answer cold.',
  },
}

export function FeatureHint({
  hintKey,
  available,
}: {
  hintKey: HintKey
  /** Every hint this page could show, so only one appears at a time. */
  available: readonly HintKey[]
}) {
  const [show, setShow] = useState(false)
  // Decided once per page load, never re-derived.
  //
  // Without this, using a hint changes what is available, the next-best hint
  // immediately takes its place, and a reader who acts on one tip gets handed
  // another — which is how a page becomes a tutorial. The contract is one hint
  // per visit; the rest wait.
  const decided = useRef(false)

  useEffect(() => {
    if (decided.current) return
    decided.current = true
    let seen: Set<string>
    try {
      seen = parseSeen(window.localStorage.getItem(STORAGE))
    } catch {
      // Private mode: showing the hint once per visit is better than never.
      seen = new Set()
    }
    setShow(nextHint(seen, available) === hintKey)
  }, [available, hintKey])

  const dismiss = useCallback(() => {
    setShow(false)
    try {
      const seen = parseSeen(window.localStorage.getItem(STORAGE))
      seen.add(hintKey)
      window.localStorage.setItem(STORAGE, serializeSeen(seen))
    } catch {
      /* ignore */
    }
  }, [hintKey])

  // Using the feature is the best possible acknowledgement — the hint has done
  // its job and should not need dismissing as well.
  useEffect(() => {
    if (!show) return
    const onUsed = (e: Event) => {
      if ((e as CustomEvent<string>).detail === hintKey) dismiss()
    }
    window.addEventListener('ms:hint-used', onUsed)
    return () => window.removeEventListener('ms:hint-used', onUsed)
  }, [dismiss, hintKey, show])

  if (!show) return null
  const copy = COPY[hintKey]

  return (
    <aside className="feature-hint" role="note">
      <span className="feature-hint-mark mono" aria-hidden>
        NEW
      </span>
      <div className="feature-hint-body">
        <p className="feature-hint-title">{copy.title}</p>
        <p className="feature-hint-text">{copy.body}</p>
      </div>
      <button
        type="button"
        className="feature-hint-close"
        onClick={dismiss}
        aria-label="Got it, hide this tip"
      >
        Got it
      </button>
    </aside>
  )
}

/** Call when the feature is used, so its hint retires itself. */
export function markHintUsed(hintKey: HintKey): void {
  try {
    window.dispatchEvent(new CustomEvent('ms:hint-used', { detail: hintKey }))
  } catch {
    /* ignore */
  }
}
