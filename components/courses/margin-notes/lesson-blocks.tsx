'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import Link from 'next/link'
import type { MarginNotesLesson } from '@/lib/courses/margin-notes/types'
import { CourseRichText } from '@/components/courses/CourseRichText'

export function jumpTo(id: string) {
  const el = document.getElementById(id)
  if (!el) return
  const y = el.getBoundingClientRect().top + window.scrollY - 88
  const smooth =
    typeof window !== 'undefined' &&
    !window.matchMedia('(prefers-reduced-motion: reduce)').matches
  window.scrollTo({ top: y, behavior: smooth ? 'smooth' : 'instant' })
  if (typeof window !== 'undefined') {
    const url = `${window.location.pathname}${window.location.search}#${id}`
    window.history.replaceState(null, '', url)
  }
}

export function lessonTopicHref(code: string, topic: { slug: string; n: string; t: string }) {
  return `/courses/${code}/${topic.slug}`
}

export function FormulaCard({ f }: { f: NonNullable<MarginNotesLesson['formulas']>[number] }) {
  const [sel, setSel] = useState<string | null>(null)
  const latex = f.latex?.trim()
  const useLatex = !!latex && isLatexFormula(latex)
  // Strip inline math `$` delimiters so the token fallback never shows raw
  // "$A$" — bare tokens also match their part symbols and stay tappable.
  const toks = f.tex.replace(/\$/g, '').split(/(\s+)/)
  // Drop placeholder/noise parts so cards don't show "Definition coming soon"
  // or word fragments tagged "key term in this formula".
  const parts = f.parts.filter(
    (p) => p.m !== 'Definition coming soon' && !p.m.endsWith('— key term in this formula')
  )
  const selected = sel ? parts.find((p) => p.s === sel) : null

  return (
    <div className="formula-card">
      <div className={`formula-eq${useLatex ? ' formula-eq--latex' : ' mono'}`}>
        {useLatex ? (
          <CourseRichText content={latex} variant="formula" breakAnywhere={false} />
        ) : (
          toks.map((tk, i) => {
            const part = parts.find((p) => p.s === tk.trim())
            if (!part) return <span key={i}>{tk}</span>
            const active = sel === part.s
            return (
              <button
                key={i}
                type="button"
                className={`fsym${active ? ' on' : ''}`}
                onClick={() => setSel(active ? null : part.s)}
              >
                {tk}
              </button>
            )
          })
        )}
      </div>
      {parts.length > 0 ? (
        <>
          <div className="formula-parts">
            {parts.map((p) => (
              <button
                key={p.s}
                type="button"
                className={`fpart${sel === p.s ? ' on' : ''}`}
                onClick={() => setSel(sel === p.s ? null : p.s)}
              >
                <span className="fpart-s mono">{p.s}</span>
                <span className="fpart-m">{p.m}</span>
              </button>
            ))}
          </div>
          <p className="formula-hint">
            {selected ? selected.m : 'Tap a symbol — great for exam definitions'}
          </p>
        </>
      ) : null}
    </div>
  )
}

function isLatexFormula(raw: string): boolean {
  return /\\|[_{^]|\\frac|\\rho|\\Delta|\\lambda|\\theta/.test(raw)
}

export function Worked({ w, idx }: { w: NonNullable<MarginNotesLesson['worked']>[number]; idx: number }) {
  const [shown, setShown] = useState(1)
  const [revealing, setRevealing] = useState(false)
  const [justRevealed, setJustRevealed] = useState<number | null>(null)

  const revealNext = () => {
    if (revealing || shown >= w.steps.length) return
    setRevealing(true)
    const next = shown + 1
    setShown(next)
    setJustRevealed(next)
    window.setTimeout(() => setJustRevealed(null), 450)
    window.setTimeout(() => setRevealing(false), 360)
  }

  return (
    <div className="worked card" data-screen-label={`Lesson — ${w.title}`}>
      <div className="worked-head">
        <span className="worked-badge mono">EXAMPLE {idx + 1}</span>
        <div className="worked-q">
          <CourseRichText content={w.q} variant="prose" className="worked-q-rich" />
        </div>
      </div>
      <ol className="worked-steps">
        {w.steps.slice(0, shown).map((s, i) => (
          <li
            key={i}
            className={`worked-step${justRevealed === i + 1 ? ' worked-step--enter' : ''}`}
          >
            <span className="worked-step-n mono">{i + 1}</span>
            <CourseRichText content={s} variant="prose" className="worked-step-rich" />
          </li>
        ))}
      </ol>
      {shown < w.steps.length ? (
        <button
          type="button"
          className="btn-ghost sm worked-reveal"
          aria-busy={revealing || undefined}
          disabled={revealing}
          onClick={revealNext}
        >
          Reveal step {shown + 1} of {w.steps.length} →
        </button>
      ) : (
        <span className="worked-done mono">✓ FULLY WORKED</span>
      )}
    </div>
  )
}

export function ConceptMapBlock({ lesson }: { lesson: MarginNotesLesson }) {
  // Hooks must run unconditionally — keep useState above the early return.
  const [sel, setSel] = useState<string | null>(null)
  const cm = lesson.conceptMap
  if (!cm) return null
  const cur = cm.nodes.find((n) => n.id === sel)
  return (
    <div className="cmap" data-screen-label="Lesson — concept map">
      <div className="cmap-canvas">
        <div className="cmap-core">
          <span className="micro cmap-core-label">MAIN IDEA</span>
          <span className="cmap-core-t">{cm.center}</span>
        </div>
        <div className="cmap-nodes" role="list">
          {cm.nodes.map((n) => (
            <button
              key={n.id}
              type="button"
              role="listitem"
              className={`cmap-node${sel === n.id ? ' on' : ''}`}
              onClick={() => setSel(sel === n.id ? null : n.id)}
            >
              {n.t}
            </button>
          ))}
        </div>
      </div>
      <div className="cmap-detail">
        {cur ? (
          <>
            <p className="micro cmap-detail-kicker">
              {cur.t.toUpperCase()}
            </p>
            <div className="cmap-detail-body">
              <CourseRichText content={cur.d} variant="prose" className="cmap-detail-rich body-2" breakAnywhere={false} />
            </div>
          </>
        ) : (
          <p className="body-2">
            Tap a linked idea to see how it connects back to the main topic — that connection is
            what examiners reward.
          </p>
        )}
      </div>
    </div>
  )
}

export function Glossary({ items }: { items: NonNullable<MarginNotesLesson['glossary']> }) {
  const [open, setOpen] = useState<number | null>(null)
  return (
    <div className="gloss-grid">
      {items.map((g, i) => (
        <button
          key={i}
          type="button"
          className={`gloss${open === i ? ' on' : ''}`}
          onClick={() => setOpen(open === i ? null : i)}
        >
          <span className="gloss-t">
            <CourseRichText content={g.t} variant="inline" />
          </span>
          <span className="gloss-d">
            {open === i ? (
              <CourseRichText content={g.d} variant="prose" className="gloss-d-rich" />
            ) : (
              'Tap to reveal definition'
            )}
          </span>
        </button>
      ))}
    </div>
  )
}

export function QuickCheck({ items }: { items: NonNullable<MarginNotesLesson['quiz']> }) {
  const listRef = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState<Record<number, boolean>>({})
  const [focus, setFocus] = useState(0)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = listRef.current
      if (!el) return
      const rect = el.getBoundingClientRect()
      const inView = rect.top < window.innerHeight * 0.92 && rect.bottom > window.innerHeight * 0.08
      if (!inView && !el.contains(document.activeElement)) return

      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setFocus((i) => Math.min(items.length - 1, i + 1))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setFocus((i) => Math.max(0, i - 1))
      } else if (e.key === 'Enter' || e.key === ' ') {
        if (el.contains(document.activeElement)) {
          e.preventDefault()
          setOpen((s) => ({ ...s, [focus]: !s[focus] }))
        }
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [focus, items.length])

  return (
    <div ref={listRef} className="qc-list">
      {items.map((q, i) => (
        <button
          key={i}
          type="button"
          className={`qc${open[i] ? ' on' : ''}${focus === i ? ' focus' : ''}`}
          onClick={() => {
            setFocus(i)
            setOpen((s) => ({ ...s, [i]: !s[i] }))
          }}
          onFocus={() => setFocus(i)}
        >
          <div className="qc-q">
            <span className="qc-n mono">Q{i + 1}</span>
            <CourseRichText content={q.q} variant="inline" className="qc-q-text" breakAnywhere={false} />
          </div>
          {open[i] ? (
            <div className="qc-a">
              <CourseRichText content={q.a} variant="prose" />
            </div>
          ) : (
            <span className="qc-reveal mono">TAP TO CHECK</span>
          )}
        </button>
      ))}
    </div>
  )
}

export function Flashcards({ cards }: { cards: NonNullable<MarginNotesLesson['flashcards']> }) {
  const zoneRef = useRef<HTMLDivElement>(null)
  const [i, setI] = useState(0)
  const [flip, setFlip] = useState(false)
  const [busy, setBusy] = useState(false)
  const c = cards[i]
  const go = useCallback(
    (d: number) => {
      if (busy) return
      setBusy(true)
      setFlip(false)
      setI((p) => (p + d + cards.length) % cards.length)
      window.setTimeout(() => setBusy(false), 280)
    },
    [busy, cards.length]
  )
  const toggleFlip = useCallback(() => {
    if (busy) return
    setBusy(true)
    setFlip((f) => !f)
    window.setTimeout(() => setBusy(false), 320)
  }, [busy])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = zoneRef.current
      if (!el) return
      const rect = el.getBoundingClientRect()
      const inView = rect.top < window.innerHeight * 0.92 && rect.bottom > window.innerHeight * 0.08
      const focused = el.contains(document.activeElement)
      if (!inView && !focused) return

      if (e.key === 'ArrowLeft') {
        e.preventDefault()
        go(-1)
      } else if (e.key === 'ArrowRight') {
        e.preventDefault()
        go(1)
      } else if (e.key === ' ' || e.key === 'Spacebar') {
        if (focused || document.activeElement === document.body) {
          e.preventDefault()
          toggleFlip()
        }
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [go, toggleFlip])

  return (
    <div ref={zoneRef} className="fc-zone" data-screen-label="Lesson — flashcards">
      <div
        className={`fcard${flip ? ' flipped' : ''}${busy ? ' fcard--busy' : ''}`}
        onClick={toggleFlip}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            toggleFlip()
          }
        }}
        role="button"
        tabIndex={0}
        aria-label={`Flashcard ${i + 1} of ${cards.length}. ${flip ? 'Answer' : 'Question'}. Press space to flip.`}
      >
        <div className="fcard-face fcard-front">
          <span className="micro">
            QUESTION · {i + 1} / {cards.length}
          </span>
          <span className="fcard-text serif">
            <CourseRichText content={c.q} variant="flashcard" />
          </span>
          <span className="fcard-hint micro">TAP OR SPACE TO FLIP</span>
        </div>
        <div className="fcard-face fcard-back">
          <span className="micro fcard-answer-label">
            ANSWER
          </span>
          <span className="fcard-text serif">
            <CourseRichText content={c.a} variant="flashcard" />
          </span>
          <span className="fcard-hint micro">TAP OR SPACE TO FLIP BACK</span>
        </div>
      </div>
      <div className="fc-nav">
        <button type="button" className="fc-arrow" onClick={() => go(-1)} aria-label="Previous card" disabled={busy}>
          ←
        </button>
        <span className="micro fc-nav-meta">
          {i + 1} / {cards.length}
          <span className="fc-nav-hint"> · ← → space</span>
        </span>
        <button type="button" className="fc-arrow" onClick={() => go(1)} aria-label="Next card" disabled={busy}>
          →
        </button>
      </div>
    </div>
  )
}

export function SecHead({ k, title, sub }: { k: string; title: string; sub?: string }) {
  return (
    <div className="lsec-head">
      <span className="lsec-k mono">{k}</span>
      <h2 className="lsec-title serif">{title}</h2>
      {sub ? <p className="body-2 lsec-sub">{sub}</p> : null}
    </div>
  )
}

export function Faq({ f }: { f: { q: string; a: string } }) {
  const [open, setOpen] = useState(false)
  return (
    <div className={`faq${open ? ' on' : ''}`}>
      <button type="button" className="faq-q" onClick={() => setOpen((o) => !o)}>
        <CourseRichText content={f.q} variant="inline" className="faq-q-text" breakAnywhere={false} />
        <span className="faq-plus">{open ? '−' : '+'}</span>
      </button>
      {open ? (
        <div className="faq-a body-2">
          <CourseRichText content={f.a} variant="prose" />
        </div>
      ) : null}
    </div>
  )
}

function PracticeBlock({
  practice,
  lesson,
  big,
  collapseScheme,
  index = 0,
  total = 1,
}: {
  practice: NonNullable<MarginNotesLesson['practice']>
  lesson: MarginNotesLesson
  big?: boolean
  collapseScheme?: boolean
  index?: number
  total?: number
}) {
  const p = practice
  const [schemeOpen, setSchemeOpen] = useState(!collapseScheme)
  return (
    <div className={`practice card${big ? ' big' : ''}`} data-screen-label="Lesson — practice question">
      <div className="practice-head">
        <span className="practice-tag mono">
          {total > 1 ? `Question ${index + 1} of ${total}` : 'Real past paper'}
        </span>
        <span className="practice-marks mono">[{p.marks}]</span>
      </div>
      <h3 className="h3 practice-ref">{p.ref}</h3>
      <div className="body-2 practice-text">
        <CourseRichText content={p.text} variant="prose" breakAnywhere={false} />
      </div>
      <div className="practice-foot">
        <Link className="btn-primary" href={p.href}>
          Do it on paper → mark it
        </Link>
        <span className="micro">MARKED MARK-BY-MARK · B1 / M1 / A1 · OFFICIAL SCHEME</span>
      </div>
      {!lesson.outline && p.markPoints?.length ? (
        <div className="practice-scheme">
          {collapseScheme ? (
            <button
              type="button"
              className="practice-scheme-toggle"
              onClick={() => setSchemeOpen((o) => !o)}
              aria-expanded={schemeOpen}
            >
              <span className="practice-scheme-tag mono">
                Mark scheme preview
                {p.markPoints?.length ? ` · ${p.markPoints.length} marks` : ''}
              </span>
              <span className="faq-plus">{schemeOpen ? '−' : '+'}</span>
            </button>
          ) : (
            <span className="practice-scheme-tag mono">MARK SCHEME PREVIEW</span>
          )}
          {schemeOpen ? (
            <div className="practice-scheme-body">
              {p.markPoints.map((mp, i) => (
                <div key={i} className="ms-line">
                  <CourseRichText content={mp.text} variant="prose" className="ms-line-text" />
                  <span className="stamp ok">+{mp.marks}</span>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}

export function PracticeSection({ lesson, big }: { lesson: MarginNotesLesson; big?: boolean }) {
  const questions =
    lesson.practiceQuestions?.length
      ? lesson.practiceQuestions
      : lesson.practice
        ? [lesson.practice]
        : []
  if (!questions.length) return null

  const collapseScheme = questions.length > 1

  return (
    <div className="practice-stack">
      {questions.map((p, i) => (
        <PracticeBlock
          key={`${p.ref}-${i}`}
          practice={p}
          lesson={lesson}
          big={big && i === 0}
          collapseScheme={collapseScheme}
          index={i}
          total={questions.length}
        />
      ))}
    </div>
  )
}
