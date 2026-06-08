'use client'

import { useState } from 'react'
import { ChevronLeft, ChevronRight, Layers, RotateCcw, Sparkles } from 'lucide-react'
import type { FlashcardItem } from '@/lib/courses/visual-types'
import { CourseRichText } from '@/components/courses/CourseRichText'
import { VisualSectionFrame } from '@/components/courses/visuals/VisualSectionFrame'

export function FlashcardDeck({ title, cards }: { title: string; cards: FlashcardItem[] }) {
  const [index, setIndex] = useState(0)
  const [flipped, setFlipped] = useState(false)

  if (!cards.length) return null

  const card = cards[index]
  const atStart = index === 0
  const atEnd = index === cards.length - 1

  function go(delta: number) {
    setFlipped(false)
    setIndex((i) => Math.min(cards.length - 1, Math.max(0, i + delta)))
  }

  return (
    <VisualSectionFrame
      title={title}
      hint="Tap the card to flip. Swipe through when you are ready."
      icon={Layers}
      accent="violet"
      className="course-flashcards"
      bodyClassName="course-flashcard-body"
    >
      <div className="course-flashcard-stage">
        <p className="course-flashcard-banner">
          <Sparkles className="h-3.5 w-3.5 shrink-0" aria-hidden />
          Tap to reveal — test yourself before the exam
        </p>

        <button
          type="button"
          className={`course-flashcard-card${flipped ? ' is-flipped' : ''}`}
          onClick={() => setFlipped((f) => !f)}
          aria-pressed={flipped}
          aria-label={flipped ? 'Show question' : 'Show answer'}
        >
          <div className="course-flashcard-inner">
            <div className="course-flashcard-face course-flashcard-front">
              <p className="course-flashcard-label">Question</p>
              <div className="course-flashcard-text">
                <CourseRichText content={card.front} variant="flashcard" />
              </div>
              <p className="course-flashcard-hint">Tap to reveal answer</p>
            </div>
            <div className="course-flashcard-face course-flashcard-back">
              <p className="course-flashcard-label">Answer</p>
              <div className="course-flashcard-text">
                <CourseRichText content={card.back} variant="flashcard" />
              </div>
            </div>
          </div>
        </button>

        <div className="course-flashcard-controls">
          <button
            type="button"
            className="course-visual-nav-btn"
            onClick={() => go(-1)}
            disabled={atStart}
            aria-label="Previous card"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <span className="course-flashcard-counter">
            {index + 1} / {cards.length}
          </span>
          <button
            type="button"
            className="course-visual-nav-btn"
            onClick={() => go(1)}
            disabled={atEnd}
            aria-label="Next card"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
          <button
            type="button"
            className="course-visual-nav-btn ml-2"
            onClick={() => setFlipped(false)}
            aria-label="Reset card to question side"
          >
            <RotateCcw className="h-4 w-4" />
          </button>
        </div>

        <div className="course-flashcard-dots" role="tablist" aria-label="Flashcard progress">
          {cards.map((c, i) => (
            <button
              key={`${c.front.slice(0, 24)}-${i}`}
              type="button"
              role="tab"
              aria-selected={i === index}
              aria-label={`Card ${i + 1}`}
              className={`course-flashcard-dot${i === index ? ' is-active' : ''}`}
              onClick={() => {
                setFlipped(false)
                setIndex(i)
              }}
            />
          ))}
        </div>
      </div>
    </VisualSectionFrame>
  )
}
