'use client'

import { useEffect, useState, useCallback, useRef, useId } from 'react'
import Link from 'next/link'
import { describeInterval, FIRST_INTERVAL_DAYS } from '@/lib/courses/recall-schedule'
import type { MarginNotesLesson } from '@/lib/courses/margin-notes/types'
import { appendMarkReturn } from '@/lib/courses/format-session'
import { useLessonMastery } from '@/lib/hooks/useLessonMastery'
import type { MasteryLevel } from '@/lib/mastery'
import { CourseRichText } from '@/components/courses/CourseRichText'
import { isUsableHandoff, stashHandoff } from '@/lib/courses/mark-handoff'
import { contentSubjectCode } from '@/lib/courses/board'
import { GUEST_EARN_EVENT } from '@/components/auth/GuestSavePrompt'

/** Breathing room between the sticky chrome and whatever you jumped to. */
const JUMP_GAP = 14

/**
 * How much sticky chrome sits above the content, measured rather than assumed.
 *
 * This used to be a hardcoded 88px, which was already too small on desktop —
 * the nav and mode bar are 128px together — and badly wrong on a phone, where
 * the mode bar wraps to two lines and the real figure is over 200. The result
 * was that jumping to a section put its heading underneath the bar you had just
 * clicked. Reading `top` off the computed style gives where each bar sits once
 * pinned, so this is right regardless of scroll position, wrapping or safe-area
 * insets.
 */
function stickyChromeHeight(): number {
  let bottom = 0
  for (const el of document.querySelectorAll<HTMLElement>('body *')) {
    const cs = getComputedStyle(el)
    if (cs.position !== 'sticky' && cs.position !== 'fixed') continue
    const top = parseFloat(cs.top)
    // `top: auto` (anything anchored to the bottom, like the back-to-top
    // button) parses to NaN and is correctly skipped.
    if (!Number.isFinite(top) || top > 200) continue
    const r = el.getBoundingClientRect()
    if (r.height <= 0) continue
    // Only full-width bars count. The contents sidebar is also sticky near the
    // top, but it sits beside the prose rather than over it — counting its
    // height sent every jump several hundred pixels too far.
    if (r.width < window.innerWidth * 0.6) continue
    bottom = Math.max(bottom, top + r.height)
  }
  return bottom
}

/** Scroll an element to just below the sticky chrome. */
export function scrollToElement(el: Element) {
  const y =
    el.getBoundingClientRect().top + window.scrollY - stickyChromeHeight() - JUMP_GAP
  const smooth =
    typeof window !== 'undefined' &&
    !window.matchMedia('(prefers-reduced-motion: reduce)').matches
  window.scrollTo({ top: y, behavior: smooth ? 'smooth' : 'instant' })
}

export function jumpTo(id: string) {
  const el = document.getElementById(id)
  if (!el) return
  scrollToElement(el)
  if (typeof window !== 'undefined') {
    const url = `${window.location.pathname}${window.location.search}#${id}`
    window.history.replaceState(null, '', url)
  }
}

export function lessonTopicHref(
  code: string,
  topic: { slug: string; n: string; t: string },
  basePath = '/courses'
) {
  return `${basePath}/${code}/${topic.slug}`
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
      <span className="formula-sheet-head mono">KEY RELATION</span>
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
    <div className="worked sheet" data-screen-label={`Lesson — ${w.title}`}>
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
          className="worked-reveal"
          aria-busy={revealing || undefined}
          disabled={revealing}
          onClick={revealNext}
        >
          {`Reveal step ${shown + 1} of ${w.steps.length} ->`}
        </button>
      ) : (
        <span className="stamp ok worked-done-stamp">DONE</span>
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
      {items.map((g, i) => {
        const panelId = `gloss-panel-${i}`
        const isOpen = open === i
        return (
          <button
            key={i}
            type="button"
            className={`gloss${isOpen ? ' on' : ''}`}
            aria-expanded={isOpen}
            aria-controls={panelId}
            onClick={() => setOpen(isOpen ? null : i)}
          >
            <span className="gloss-t">
              <CourseRichText content={g.t} variant="inline" />
            </span>
            <span className="gloss-d" id={panelId} role="region">
              {isOpen ? (
                <CourseRichText content={g.d} variant="prose" className="gloss-d-rich" />
              ) : (
                'Open to reveal definition'
              )}
            </span>
          </button>
        )
      })}
    </div>
  )
}

/**
 * Quick check — produce, then compare.
 *
 * The card used to be a single tap-to-reveal button. Revealing an answer you
 * have not tried to produce feels like learning and mostly is not: the gain
 * comes from generating the explanation yourself and then seeing where yours
 * differs (the self-explanation effect). So the student writes first, and the
 * reveal shows their attempt *beside* the model answer rather than replacing it.
 *
 * Deliberately no grading and no AI. Nothing here is scored, nothing is sent
 * anywhere — a hard gate on a revision aid would just teach students to type "a"
 * to get past it. The nudge is soft and the answer is always one tap away.
 */
export function QuickCheck({
  items,
  storageKey,
  practiceHref,
  practiceRef,
  subjectCode,
  lessonSlug,
  onComplete,
  returnPath,
}: {
  items: NonNullable<MarginNotesLesson['quiz']>
  /** Lesson slug — scopes saved attempts so they survive a reload. */
  storageKey?: string
  /** Where "now do the real thing" goes once every question is answered. */
  practiceHref?: string | null
  practiceRef?: string
  /** Identify the lesson for spaced recall. Omit to disable recording. */
  subjectCode?: string
  lessonSlug?: string
  /** Fired once when every question has an answer. */
  onComplete?: () => void
  /** Where the marker should send them back to. */
  returnPath?: string | null
}) {
  const listRef = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState<Record<number, boolean>>({})
  const [revealed, setRevealed] = useState<Record<number, boolean>>({})
  const [drafts, setDrafts] = useState<Record<number, string>>({})
  const [focus, setFocus] = useState(0)

  const lsKey = storageKey ? `ms:quickcheck:${storageKey}` : null

  useEffect(() => {
    if (!lsKey) return
    try {
      const raw = window.localStorage.getItem(lsKey)
      if (raw) setDrafts(JSON.parse(raw) as Record<number, string>)
    } catch {
      /* private mode / quota — attempts just do not persist */
    }
  }, [lsKey])

  const saveDraft = useCallback(
    (i: number, value: string) => {
      setDrafts((prev) => {
        const next = { ...prev, [i]: value }
        if (lsKey) {
          try {
            window.localStorage.setItem(lsKey, JSON.stringify(next))
          } catch {
            /* ignore */
          }
        }
        return next
      })
    },
    [lsKey]
  )

  // Roving tabindex: arrows only when focus is already inside this widget (CO-02).
  // Never attach to window — that stole page scroll whenever the list was merely on screen.
  useEffect(() => {
    const el = listRef.current
    if (!el) return

    const focusHead = (index: number) => {
      const heads = el.querySelectorAll<HTMLButtonElement>('.qc-head')
      heads[index]?.focus()
    }

    const onKey = (e: KeyboardEvent) => {
      const active = document.activeElement
      if (!(active instanceof Node) || !el.contains(active)) return
      // Never hijack keys while typing an answer — Space would collapse the card.
      if (active instanceof HTMLTextAreaElement || active instanceof HTMLInputElement) return

      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setFocus((i) => {
          const next = Math.min(items.length - 1, i + 1)
          queueMicrotask(() => focusHead(next))
          return next
        })
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setFocus((i) => {
          const next = Math.max(0, i - 1)
          queueMicrotask(() => focusHead(next))
          return next
        })
      } else if (e.key === 'Enter' || e.key === ' ') {
        // Native button activation already toggles via click; only handle when
        // focus is on a non-button descendant so we do not double-fire.
        if (active instanceof HTMLButtonElement) return
        e.preventDefault()
        setOpen((s) => ({ ...s, [focus]: !s[focus] }))
      }
    }

    el.addEventListener('keydown', onKey)
    return () => el.removeEventListener('keydown', onKey)
  }, [focus, items.length])

  const answered = items.reduce(
    (n, _, i) => ((drafts[i] ?? '').trim() ? n + 1 : n),
    0
  )
  const allAnswered = answered === items.length && items.length > 0
  const pct = items.length ? Math.round((answered / items.length) * 100) : 0

  // Record the completion once so the lesson can come back for spaced recall.
  // Fire-and-forget and guarded by a ref: this must never block the UI, and a
  // failure (offline, signed out) simply means no scheduling — the quick check
  // itself is unaffected. The route no-ops for guests.
  const recordedRef = useRef(false)
  // What the server actually did, not what we hope it did. The route already
  // reports the interval it wrote and no-ops for guests; showing its answer
  // means the promise on screen can never disagree with the row in the table.
  const [recall, setRecall] = useState<
    { recorded: true; intervalDays: number } | { recorded: false } | null
  >(null)
  useEffect(() => {
    if (!allAnswered || recordedRef.current) return
    if (!subjectCode || !lessonSlug) return
    recordedRef.current = true
    onComplete?.()
    // A reader who has just written answers has something worth saving. Let the
    // guest prompt offer the account here rather than on a timer.
    try {
      window.dispatchEvent(new Event(GUEST_EARN_EVENT))
    } catch {
      /* ignore */
    }
    void fetch('/api/courses/recall', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        subjectCode,
        lessonSlug,
        answered,
        total: items.length,
      }),
    })
      .then(async (r) => {
        if (!r.ok) return
        const j = (await r.json()) as { recorded?: boolean; intervalDays?: number }
        setRecall(
          j.recorded && typeof j.intervalDays === 'number'
            ? { recorded: true, intervalDays: j.intervalDays }
            : { recorded: false }
        )
      })
      .catch(() => {
        // Offline or a server error: say nothing rather than promise a recall
        // that was never scheduled. Retry on the next completion.
        recordedRef.current = false
      })
  }, [allAnswered, answered, items.length, lessonSlug, onComplete, subjectCode])

  return (
    <div ref={listRef} className="qc-list">
      {/* Progress is the whole loop: an empty bar is a visible, closeable gap,
          and each answer moves it. Counts attempts, not correctness — nothing
          here is graded, and a bar that judged you would stop people writing. */}
      <div className="qc-progress" aria-hidden={items.length < 2}>
        <div className="qc-progress-bar">
          <span className="qc-progress-fill" style={{ width: `${pct}%` }} />
        </div>
        <span className="micro qc-progress-label">
          {allAnswered
            ? `All ${items.length} answered`
            : `${answered} of ${items.length} answered`}
        </span>
      </div>

      {/* Recall was doing its work invisibly: a row written, a lesson
          reappearing days later with nothing having said it would. */}
      {recall ? (
        <p className="qc-recall" role="status">
          {recall.recorded ? (
            <>
              <span className="qc-recall-mark" aria-hidden>
                ✓
              </span>
              Saved. This lesson comes back{' '}
              <b>{describeInterval(recall.intervalDays)}</b> — timed for just
              before you would start forgetting it.
            </>
          ) : (
            <>
              <span className="qc-recall-mark" aria-hidden>
                ✓
              </span>
              Nice work. Signed-in students get this lesson back{' '}
              <b>{describeInterval(FIRST_INTERVAL_DAYS)}</b>, timed for just
              before you would start forgetting it.
            </>
          )}
        </p>
      ) : null}

      {items.map((q, i) => {
        const draft = drafts[i] ?? ''
        const tried = draft.trim().length > 0
        const isOpen = !!open[i]
        const isRevealed = !!revealed[i]
        return (
          <div key={i} className={`qc-card${isOpen ? ' on' : ''}${focus === i ? ' focus' : ''}`}>
            <button
              type="button"
              className="qc-head"
              aria-expanded={isOpen}
              tabIndex={focus === i ? 0 : -1}
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
              {!isOpen ? (
                <span className="qc-reveal mono">
                  {tried ? 'ANSWERED · TAP TO REOPEN' : 'TAP TO ANSWER'}
                </span>
              ) : null}
            </button>

            {isOpen ? (
              <div className="qc-body">
                {/* Once revealed the attempt is shown read-only in the comparison
                    below; keeping the textarea too would print the same sentence
                    twice. "Try again" brings the editor back. */}
                <label className="qc-write" hidden={isRevealed}>
                  <span className="micro qc-write-label">
                    Your answer — write it before you look
                  </span>
                  <textarea
                    className="qc-input"
                    rows={3}
                    value={draft}
                    placeholder="In your own words…"
                    onChange={(e) => saveDraft(i, e.target.value)}
                  />
                </label>

                {!isRevealed ? (
                  <div className="qc-actions">
                    <button
                      type="button"
                      className="qc-check"
                      onClick={() => setRevealed((s) => ({ ...s, [i]: true }))}
                    >
                      {tried ? 'Compare with the answer' : 'Show the answer anyway'}
                    </button>
                    {!tried ? (
                      <span className="micro qc-hint">
                        You will remember far more if you attempt it first.
                      </span>
                    ) : null}
                    {/* Offered BEFORE the model answer, deliberately: this marks
                        what the student actually thought, which is the only
                        version worth a real mark. After a reveal it would be
                        marking how well they copied. */}
                    {isUsableHandoff({ question: q.q, answer: draft }) ? (
                      <button
                        type="button"
                        className="qc-mark-mine"
                        onClick={() => {
                          const href = stashHandoff({
                            question: q.q,
                            answer: draft,
                            // Send the full content code ("ib-biology-hl").
                            // The canonical IB route passes the catalog slug
                            // ("biology-hl"), which the marker does not know.
                            // Which SHAPE the picker wants — with or without
                            // the level — differs per subject, so that choice
                            // belongs where the options are, not here.
                            subjectCode: subjectCode
                              ? contentSubjectCode(subjectCode)
                              : null,
                            returnPath: returnPath ?? null,
                          })
                          window.location.href = href
                        }}
                      >
                        Get this marked &rarr;
                      </button>
                    ) : null}
                  </div>
                ) : (
                  <div className="qc-compare">
                    {tried ? (
                      <div className="qc-mine">
                        <span className="micro qc-col-label">YOU WROTE</span>
                        <p className="body-2 qc-mine-text">{draft}</p>
                      </div>
                    ) : null}
                    <div className="qc-model">
                      <span className="micro qc-col-label">MODEL ANSWER</span>
                      <div className="qc-a">
                        <CourseRichText content={q.a} variant="prose" />
                      </div>
                    </div>
                    {tried ? (
                      <p className="micro qc-diff-hint">
                        What is in the model answer that yours is missing? That gap is the
                        mark you would have lost.
                      </p>
                    ) : null}
                    <button
                      type="button"
                      className="qc-retry"
                      onClick={() => setRevealed((s) => ({ ...s, [i]: false }))}
                    >
                      {tried ? 'Rewrite my answer' : 'Let me try it myself'}
                    </button>
                  </div>
                )}
              </div>
            ) : null}
          </div>
        )
      })}

      {allAnswered ? (
        <div className="qc-done">
          <span className="qc-done-tag mono">NICE</span>
          <p className="body-2 qc-done-lead">
            You wrote {items.length} answers instead of reading {items.length}. That is
            the part that sticks.
          </p>
          {practiceHref ? (
            <Link className="qc-done-cta" href={practiceHref}>
              {/* Only name the question when the ref is an actual reference
                  ("9702/21 Q3"). On many lessons it is a full sentence, which
                  turns the call to action into a paragraph. */}
              Now do the real thing
              {practiceRef && practiceRef.length <= 24 ? ` — ${practiceRef}` : ''} &rarr;
            </Link>
          ) : null}
        </div>
      ) : null}
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

  // CO-02: arrows / space only when focus is inside this widget — never steal
  // page scroll because the deck is merely on screen.
  useEffect(() => {
    const el = zoneRef.current
    if (!el) return
    const onKey = (e: KeyboardEvent) => {
      const active = document.activeElement
      if (!(active instanceof Node) || !el.contains(active)) return
      if (active instanceof HTMLTextAreaElement || active instanceof HTMLInputElement) return

      if (e.key === 'ArrowLeft') {
        e.preventDefault()
        go(-1)
      } else if (e.key === 'ArrowRight') {
        e.preventDefault()
        go(1)
      } else if (e.key === ' ' || e.key === 'Spacebar') {
        if (active instanceof HTMLButtonElement && active.classList.contains('fcard')) {
          // Native button activation handles flip via click.
          return
        }
        e.preventDefault()
        toggleFlip()
      }
    }
    el.addEventListener('keydown', onKey)
    return () => el.removeEventListener('keydown', onKey)
  }, [go, toggleFlip])

  return (
    <div
      ref={zoneRef}
      className="fc-zone"
      data-screen-label="Lesson — flashcards"
      tabIndex={-1}
    >
      <button
        type="button"
        className={`fcard${flip ? ' flipped' : ''}${busy ? ' fcard--busy' : ''}`}
        onClick={toggleFlip}
        aria-pressed={flip}
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
      </button>
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
  const panelId = useId()
  return (
    <div className={`faq${open ? ' on' : ''}`}>
      <button
        type="button"
        className="faq-q"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((o) => !o)}
      >
        <CourseRichText content={f.q} variant="inline" className="faq-q-text" breakAnywhere={false} />
        <span className="faq-plus" aria-hidden>
          {open ? '−' : '+'}
        </span>
      </button>
      {open ? (
        <div id={panelId} className="faq-a body-2" role="region">
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
  returnPath,
  markHrefOverride,
  markCtaLabel,
}: {
  practice: NonNullable<MarginNotesLesson['practice']>
  lesson: MarginNotesLesson
  big?: boolean
  collapseScheme?: boolean
  index?: number
  total?: number
  /** When set, marking returns the student to this lesson (closes the loop). */
  returnPath?: string | null
  markHrefOverride?: string | null
  markCtaLabel?: string
}) {
  const p = practice
  const markHref =
    markHrefOverride ?? appendMarkReturn(p.href, returnPath, lesson.point)
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
        <Link className="btn-primary" href={markHref}>
          {markCtaLabel ?? 'Do it on paper → mark it'}
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

export function PracticeSection({
  lesson,
  big,
  returnPath,
  markHrefOverride,
  markCtaLabel,
}: {
  lesson: MarginNotesLesson
  big?: boolean
  /** When set, marking returns the student to this lesson (closes the loop). */
  returnPath?: string | null
  markHrefOverride?: string | null
  markCtaLabel?: string
}) {
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
          returnPath={returnPath}
          markHrefOverride={markHrefOverride}
          markCtaLabel={markCtaLabel}
        />
      ))}
    </div>
  )
}

/**
 * End-of-lesson "prove it" exit ticket — the closing action that turns a
 * passive read into a marked attempt. Reuses the lesson's primary practice
 * question and deep-links into the marking engine with a return path so the
 * learn→practice→mark loop lands the student back on this lesson.
 */
export function LessonCheckpoint({
  lesson,
  returnPath,
  markHrefOverride,
  markCtaLabel,
}: {
  lesson: MarginNotesLesson
  returnPath?: string | null
  markHrefOverride?: string | null
  markCtaLabel?: string
}) {
  const primary = lesson.practiceQuestions?.[0] ?? lesson.practice ?? null
  if (!primary) return null

  const markHref =
    markHrefOverride ?? appendMarkReturn(primary.href, returnPath, lesson.point)

  return (
    <div className="checkpoint card" data-screen-label="Lesson — checkpoint">
      <span className="checkpoint-tag mono">Checkpoint</span>
      <h3 className="h3 checkpoint-title serif">Reading it isn&rsquo;t knowing it — prove it.</h3>
      <p className="body-2 checkpoint-lead">
        Before you move on: do <strong>{primary.ref}</strong> on paper, snap a photo, and
        get examiner-style feedback on exactly where you win and lose marks.
      </p>
      <div className="checkpoint-foot">
        <Link className="btn-primary" href={markHref}>
          {markCtaLabel ? `${markCtaLabel} →` : 'Attempt & get marked →'}
        </Link>
        <span className="micro">Takes about a minute · you&rsquo;ll land back on this lesson</span>
      </div>
    </div>
  )
}

const MASTERY_LABEL: Record<MasteryLevel, string> = {
  unattempted: 'Not started',
  sampled: 'Getting started',
  critical: 'Needs work',
  proficient: 'Proficient',
  exam_ready: 'Exam-ready',
}

/**
 * Adaptive band — shows the signed-in student's mastery of THIS lesson's topic
 * (from their marked attempts) and points them at their single weakest topic
 * to study next. Renders nothing for guests or students with no attempts yet.
 */
export function LessonMasteryBand({
  subjectCode,
  topicCode,
  signedIn,
}: {
  subjectCode: string
  topicCode: string
  signedIn?: boolean
}) {
  const { current, weakest } = useLessonMastery(subjectCode, topicCode, Boolean(signedIn))
  // Signed-in users always get the review entry point; standing / study-next
  // fill in once they have marked attempts.
  if (!signedIn) return null

  const hasData = Boolean(current || weakest)

  return (
    <div className="lesson-mastery" data-screen-label="Lesson — your mastery">
      {current ? (
        <div className={`lesson-mastery-standing lm-${current.level}`}>
          <span className="lesson-mastery-dot" aria-hidden />
          <span>
            Your standing on this topic:{' '}
            <strong>{MASTERY_LABEL[current.level]}</strong> · {current.percentage}% over{' '}
            {current.attemptsCount} marked {current.attemptsCount === 1 ? 'attempt' : 'attempts'}
          </span>
        </div>
      ) : null}
      {weakest?.href ? (
        <Link className="lesson-mastery-next" href={weakest.href}>
          Study next: <strong>{weakest.name}</strong> — your weakest topic in this subject →
        </Link>
      ) : null}
      {hasData ? (
        <Link className="lesson-mastery-review" href="/dashboard/review">
          Review all your weak topics →
        </Link>
      ) : (
        <div className="lesson-mastery-standing lm-unattempted">
          <span className="lesson-mastery-dot" aria-hidden />
          <span>
            Get marked on this topic to track your mastery — then it builds your{' '}
            <Link className="lesson-mastery-inline" href="/dashboard/review">
              spaced review list
            </Link>
            .
          </span>
        </div>
      )}
    </div>
  )
}
