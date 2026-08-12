'use client'

import { useState } from 'react'

/**
 * Real flashcards from a real published lesson, flippable.
 *
 * The courses are the part of the product a visitor is most likely to have
 * already met — the notes, the worked examples and the interactive diagram are
 * free and are what most search traffic lands on. What free does *not* include
 * is the active-recall half of a lesson: flashcards, the concept map and the
 * practice questions (see `hasFullLessonAccess` and the `premiumHidden` branch
 * in CourseLessonPage).
 *
 * So this shows the cards working rather than naming them. The content is
 * loaded from the lesson itself by the server component, never retyped here, so
 * it stays true if the lesson is re-edited.
 */
export function DemoFlashcards({
  cards,
}: {
  cards: Array<{ front: string; back: string }>
}) {
  const [flipped, setFlipped] = useState<Set<number>>(() => new Set())

  const toggle = (i: number) =>
    setFlipped((prev) => {
      const next = new Set(prev)
      if (next.has(i)) next.delete(i)
      else next.add(i)
      return next
    })

  return (
    <div className="demo-cards">
      <p className="demo-cards__hint">
        Tap a card to turn it over — this is the real thing, not a picture of it.
      </p>
      <ul className="demo-cards__grid">
        {cards.map((c, i) => {
          const isFlipped = flipped.has(i)
          return (
            <li key={i} className="demo-cards__cell">
              <button
                type="button"
                className={
                  isFlipped
                    ? 'demo-card demo-card--flipped'
                    : 'demo-card'
                }
                onClick={() => toggle(i)}
                // A flip card replaces its content rather than revealing extra
                // content below it, so this is a toggle (pressed / not pressed),
                // not a disclosure. `aria-expanded` would promise a region that
                // never appears.
                aria-pressed={isFlipped}
              >
                <span className="demo-card__side mono" aria-hidden>
                  {isFlipped ? 'ANSWER' : 'QUESTION'}
                </span>
                {/* The text swaps under the same control, so it has to announce
                    itself when it changes or a screen-reader user hears nothing
                    happen. */}
                <span className="demo-card__text" aria-live="polite">
                  {isFlipped ? c.back : c.front}
                </span>
                <span className="demo-card__turn mono" aria-hidden>
                  {isFlipped ? 'Turn back' : 'Turn over'}
                </span>
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
