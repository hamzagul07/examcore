'use client'

import { useEffect, useRef, useState } from 'react'
import { Check, MousePointerClick, X } from 'lucide-react'
import { ExaminerInkOverlay } from '@/components/examiner-ink/ExaminerInkOverlay'
import { ScoreReveal } from '@/components/mark/ScoreReveal'
import { DEMO_INK, DEMO_SCRIPT_IMAGE } from '@/lib/marking/demo-ink'
import { DEMO_MARK_RESULT } from '@/lib/marking/demo-result'

/**
 * One explorable artefact instead of two pictures of the same thing.
 *
 * The landing page had grown two separate blocks describing the same script —
 * a score card and a marked page — disconnected, so a visitor saw the same
 * example twice and had to join it up themselves. This is the join: pick any
 * mark and the stamp lights up on the handwriting, the row highlights, and the
 * examiner's reasoning for THAT mark appears underneath. Click a stamp on the
 * script and it works the other way.
 *
 * It also demonstrates the mechanic the real result view uses, rather than
 * describing it — the same `activeMarkId` wiring, on the same components.
 *
 * A visitor who clicks nothing still gets the whole story: the lost mark is
 * selected by default, because that is the mark the example exists to explain.
 */

const r = DEMO_MARK_RESULT
const marks = r.ai_marking.marks_awarded
const percentage = Math.round((r.marks_earned / r.total_marks) * 100)
// The mark the demo is about — a correct conclusion with nothing behind it.
const DEFAULT_INDEX = marks.findIndex((m) => !m.earned)

export function InteractiveMarkDemo() {
  const [selected, setSelected] = useState(
    DEFAULT_INDEX >= 0 ? DEFAULT_INDEX : 0
  )
  const [inView, setInView] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (
      typeof IntersectionObserver === 'undefined' ||
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    ) {
      setInView(true)
      return
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setInView(true)
          io.disconnect()
        }
      },
      { rootMargin: '-12% 0px' }
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])

  const active = marks[selected]
  const activeCode = active?.type?.trim().toUpperCase() ?? null

  return (
    <section
      ref={ref}
      className="ms-demo"
      aria-labelledby="demo-h"
    >
      <div className="ms-demo__intro">
        <p className="ms-overline">Worked example</p>
        <h2 id="demo-h" className="ms-demo__title">
          Marked like an examiner would
        </h2>
        <p className="ms-demo__lead">
          A real A-Level Maths answer. Tap any mark — on the script or in the
          list — to see exactly why it was given or withheld.
        </p>
      </div>

      <div className="ms-demo__grid">
        <div className="ms-demo__script">
          <ExaminerInkOverlay
            imageUrl={DEMO_SCRIPT_IMAGE}
            lineReferences={DEMO_INK}
            animate={inView}
            activeMarkId={activeCode}
            onActiveMarkChange={(markId) => {
              const idx = marks.findIndex(
                (m) => m.type?.trim().toUpperCase() === markId.toUpperCase()
              )
              if (idx >= 0) setSelected(idx)
            }}
          />
        </div>

        <div className="ms-demo__panel">
          <ScoreReveal
            marksEarned={r.marks_earned}
            totalMarks={r.total_marks}
            percentage={percentage}
            grade={null}
            nextGrade={null}
            marks={marks.map((m, i) => ({
              id: String(m.mark_id ?? i),
              earned: !!m.earned,
              label: m.type?.trim() || `Mark ${i + 1}`,
            }))}
            onSelectMark={(id) => {
              const idx = marks.findIndex(
                (m, i) => String(m.mark_id ?? i) === id
              )
              if (idx >= 0) setSelected(idx)
            }}
          />

          <p className="ms-demo__hint">
            <MousePointerClick className="h-3.5 w-3.5" aria-hidden="true" />
            Tap a mark to see the examiner&apos;s reasoning
          </p>

          <ul className="ms-demo__marks">
            {marks.map((m, i) => (
              <li key={String(m.mark_id ?? i)}>
                <button
                  type="button"
                  onClick={() => setSelected(i)}
                  aria-pressed={i === selected}
                  className={`ms-demo__mark ${m.earned ? 'is-earned' : 'is-lost'} ${
                    i === selected ? 'is-active' : ''
                  }`}
                >
                  <span className="ms-mpl__icon" aria-hidden="true">
                    {m.earned ? (
                      <Check className="h-3.5 w-3.5" />
                    ) : (
                      <X className="h-3.5 w-3.5" />
                    )}
                  </span>
                  <span className="ms-mpl__type">{m.type}</span>
                  <span className="ms-mpl__work">{m.line_reference}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {active && (
        <div
          className={`ms-demo__why ${active.earned ? 'is-earned' : 'is-lost'}`}
          // Announce the change so keyboard and screen-reader users get the
          // reasoning without hunting for where it appeared.
          aria-live="polite"
        >
          <p className="ms-demo__why-label">
            {active.type} — {active.earned ? 'awarded' : 'withheld'}
          </p>
          <p className="ms-demo__why-body">{active.reasoning}</p>
        </div>
      )}
    </section>
  )
}
