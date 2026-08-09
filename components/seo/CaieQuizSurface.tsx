'use client'

import { useMemo, useState } from 'react'
import type { CourseLesson } from '@/lib/courses/types'
import { QuizChallengeShare } from '@/components/seo/QuizChallengeShare'

export function CaieQuizSurface({
  lesson,
  quizHref,
}: {
  lesson: CourseLesson
  quizHref: string
}) {
  const items = lesson.quickCheck ?? []
  const [revealed, setRevealed] = useState<Record<number, boolean>>({})
  const [answers, setAnswers] = useState<Record<number, boolean>>({})

  const score = useMemo(
    () => Object.values(answers).filter(Boolean).length,
    [answers]
  )
  const attempted = Object.keys(answers).length

  return (
    <div>
      <ol className="space-y-4">
        {items.map((q, i) => (
          <li key={i} className="ec-card ec-card--paper p-5">
            <p className="ms-overline">Question {i + 1}</p>
            <p className="mt-2 font-semibold">{q.prompt}</p>
            {q.options?.length ? (
              <ul className="ms-body-2 mt-2 list-disc pl-5">
                {q.options.map((o) => (
                  <li key={o}>{o}</li>
                ))}
              </ul>
            ) : null}
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                className="ec-btn-ghost min-h-[40px] text-sm"
                onClick={() => setRevealed((r) => ({ ...r, [i]: true }))}
              >
                Show answer
              </button>
              <button
                type="button"
                className="ec-btn-ghost min-h-[40px] text-sm"
                onClick={() => setAnswers((a) => ({ ...a, [i]: true }))}
              >
                I got it
              </button>
              <button
                type="button"
                className="ec-btn-ghost min-h-[40px] text-sm"
                onClick={() => setAnswers((a) => ({ ...a, [i]: false }))}
              >
                Missed it
              </button>
            </div>
            {revealed[i] ? (
              <p className="ms-body-2 mt-2 whitespace-pre-wrap">{q.answer}</p>
            ) : null}
          </li>
        ))}
      </ol>
      {attempted > 0 ? (
        <QuizChallengeShare
          title={lesson.title}
          score={score}
          total={items.length}
          quizHref={quizHref}
        />
      ) : null}
    </div>
  )
}
