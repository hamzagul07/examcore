'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import type { MarginNotesLesson } from '@/lib/courses/margin-notes/types'
import { clampStage, stagePercent, stagesFor, type StageId } from '@/lib/courses/lesson-stages'
import { CourseRichText } from '@/components/courses/CourseRichText'
import { ExplainBlock } from '@/components/courses/ExplainBlock'
import { CourseLessonDiagramShell } from '@/components/courses/margin-notes/CourseLessonDiagramShell'
import { QuickCheck, Worked } from '@/components/courses/margin-notes/lesson-blocks'

/**
 * PROTOTYPE — a lesson as a path, for comparison against the live document view.
 *
 * One stage on screen at a time with an explicit next step, instead of thirteen
 * sections stacked and the student left to decide what to do.
 *
 * Note on the real thing: this renders only the active stage, which is fine for
 * a dev preview but would hide four fifths of the page from crawlers on the 871
 * indexed lesson URLs. Shipping it means rendering every stage into the DOM and
 * hiding the inactive ones in CSS, so the served HTML is unchanged.
 */
export function LessonPath({ lesson: L }: { lesson: MarginNotesLesson }) {
  const stages = useMemo(() => stagesFor(L), [L])
  const [index, setIndex] = useState(0)
  const [done, setDone] = useState<Set<string>>(new Set())
  const [step, setStep] = useState(1)

  const current = stages[clampStage(index, stages.length)]
  const percent = stagePercent(stages, done)
  const isLast = index >= stages.length - 1

  const complete = useCallback((id: StageId) => {
    setDone((prev) => (prev.has(id) ? prev : new Set(prev).add(id)))
  }, [])

  const go = useCallback(
    (next: number) => {
      if (current) complete(current.id)
      setIndex(clampStage(next, stages.length))
      // A new stage starts at the top of itself, not wherever the last one ended.
      window.scrollTo({ top: 0, behavior: 'smooth' })
    },
    [complete, current, stages.length]
  )

  // Arrow keys move between stages, unless the reader is typing an answer.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = document.activeElement
      if (el instanceof HTMLTextAreaElement || el instanceof HTMLInputElement) return
      if (e.key === 'ArrowRight') go(index + 1)
      else if (e.key === 'ArrowLeft') go(index - 1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [go, index])

  if (!stages.length) return null

  return (
    <div className="lpath">
      <header className="lpath-head">
        <div className="lpath-meta mono">
          <span className="lpath-code">{L.point}</span>
          <span aria-hidden>/</span>
          <span>{L.sub}</span>
        </div>
        <h1 className="h-display lpath-title">{L.name}</h1>

        <ol className="lpath-rail" aria-label="Lesson stages">
          {stages.map((s, i) => {
            const state = done.has(s.id) ? 'done' : i === index ? 'now' : 'todo'
            return (
              <li key={s.id} className={`lpath-rail-item is-${state}`}>
                <button type="button" onClick={() => go(i)} aria-current={i === index}>
                  <span className="lpath-rail-dot mono" aria-hidden>
                    {state === 'done' ? '✓' : i + 1}
                  </span>
                  <span className="lpath-rail-label">{s.label}</span>
                </button>
              </li>
            )
          })}
        </ol>
        <div className="lpath-bar" aria-hidden>
          <span style={{ width: `${percent}%` }} />
        </div>
      </header>

      <main className="lpath-stage" key={current.id}>
        <p className="micro lpath-intent">{current.intent}</p>

        {current.id === 'orient' ? (
          <div className="lpath-body">
            {L.simple?.lead ? (
              <CourseRichText content={L.simple.lead} variant="prose" className="lpath-lead" />
            ) : null}
            {L.simple?.analogy ? (
              <aside className="lpath-analogy">
                <span className="micro">THINK OF IT LIKE…</span>
                <CourseRichText content={L.simple.analogy} variant="prose" />
              </aside>
            ) : null}
            {L.objectives?.length ? (
              <ol className="lpath-objectives">
                {L.objectives.map((o, i) => (
                  <li key={i}>
                    <span className="obj-n mono">{i + 1}</span>
                    <CourseRichText content={o} variant="inline" breakAnywhere={false} />
                  </li>
                ))}
              </ol>
            ) : null}
          </div>
        ) : null}

        {current.id === 'see' ? (
          <CourseLessonDiagramShell
            lessonSlug={L.lessonSlug}
            template={L.template}
            diagramSpec={L.diagramSpec}
            interactiveEmbed={L.interactiveEmbed}
            steps={L.steps?.length ? L.steps : [{ n: 1, title: 'Explore', body: L.intro }]}
            step={step}
            setStep={setStep}
          />
        ) : null}

        {current.id === 'read' ? (
          <div className="lpath-body notes-body">
            {(L.notes ?? []).map((n, i) => (
              <div key={i} className="note-block">
                <h3 className="note-h serif">{n.h}</h3>
                {n.p ? (
                  <div className="body-2 note-p">
                    <CourseRichText content={n.p} variant="prose" />
                  </div>
                ) : null}
                {n.bullets?.length ? (
                  <ul className="note-bullets">
                    {n.bullets.map((b, bi) => (
                      <li key={bi} className="body-2">
                        <CourseRichText content={b} variant="prose" />
                      </li>
                    ))}
                  </ul>
                ) : null}
                {n.tip ? (
                  <div className="note-tip">
                    <span className="note-tip-tag mono">EXAM TIP</span>
                    <div className="body-2">
                      <CourseRichText content={n.tip} variant="prose" />
                    </div>
                  </div>
                ) : null}
                <ExplainBlock subjectCode={L.code} lessonSlug={L.lessonSlug} block={n} />
              </div>
            ))}
          </div>
        ) : null}

        {current.id === 'check' && L.quiz?.length ? (
          <QuickCheck
            items={L.quiz}
            storageKey={`path:${L.lessonSlug}`}
            onComplete={() => complete('check')}
          />
        ) : null}

        {current.id === 'prove' ? (
          <div className="lpath-body">
            {(L.worked ?? []).map((w, i) => (
              <Worked key={i} w={w} idx={i} />
            ))}
            {L.practiceQuestions?.[0]?.href || L.practice?.href ? (
              <Link
                className="btn-primary lpath-cta"
                href={(L.practiceQuestions?.[0] ?? L.practice)!.href}
              >
                Do a real question and get it marked →
              </Link>
            ) : null}
          </div>
        ) : null}
      </main>

      <nav className="lpath-nav" aria-label="Stage navigation">
        <button type="button" className="btn-ghost" onClick={() => go(index - 1)} disabled={index === 0}>
          ← Back
        </button>
        <span className="micro lpath-count">
          {index + 1} of {stages.length}
        </span>
        {isLast ? (
          <button type="button" className="btn-primary" onClick={() => complete(current.id)}>
            Finish
          </button>
        ) : (
          <button type="button" className="btn-primary" onClick={() => go(index + 1)}>
            Continue →
          </button>
        )}
      </nav>
    </div>
  )
}
