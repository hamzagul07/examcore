'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { LazyLiveDiagram } from '@/components/courses/visuals/LazyLiveDiagram'
import type { VaultDiagramTheatre } from '@/lib/max/vault-diagram-showcase'
import {
  getVaultDiagramPlayback,
  sampleVaultPlayback,
} from '@/lib/max/vault-diagram-playback'
import { MaxBadge } from '@/components/max/MaxBadge'
import { MarkSnippet } from '@/components/mark/MarkSnippet'

/**
 * Max Concept Cinema — continuous live diagram motion (params + teaching beats),
 * subject tabs from the student profile, and a title filmstrip (no tiny remounting thumbs).
 */
export function MaxVaultDiagramTheatre({
  theatres,
  focusCode,
}: {
  theatres: VaultDiagramTheatre[]
  focusCode: string | null
}) {
  const initial =
    theatres.find((t) => t.subjectCode === focusCode) ?? theatres[0] ?? null

  const [subjectCode, setSubjectCode] = useState(initial?.subjectCode ?? '')
  const theatre = theatres.find((t) => t.subjectCode === subjectCode) ?? theatres[0]

  useEffect(() => {
    if (focusCode && theatres.some((t) => t.subjectCode === focusCode)) {
      setSubjectCode(focusCode)
    }
  }, [focusCode, theatres])

  const all = useMemo(() => {
    if (!theatre) return []
    const list = [...theatre.gallery]
    if (theatre.signature) list.unshift(theatre.signature)
    return list
  }, [theatre])

  const [activeSlug, setActiveSlug] = useState(
    () => theatre?.signature?.slug ?? theatre?.gallery[0]?.slug ?? ''
  )
  const [progress, setProgress] = useState(0)
  const [playing, setPlaying] = useState(true)
  const progressRef = useRef(0)
  const scrubbingRef = useRef(false)

  useEffect(() => {
    if (!theatre) return
    const next = theatre.signature?.slug ?? theatre.gallery[0]?.slug ?? ''
    setActiveSlug(next)
    progressRef.current = 0
    setProgress(0)
    setPlaying(true)
  }, [theatre?.subjectCode])

  const active = all.find((d) => d.slug === activeSlug) ?? all[0]
  const steps = active?.teachingSteps?.length
    ? active.teachingSteps
    : ['Watch the idea move — drag the scrubber or let it play.']
  const playback = active ? getVaultDiagramPlayback(active.slug) : { durationMs: 10_000 }
  const sample = active
    ? sampleVaultPlayback(active.slug, progress, steps.length)
    : { params: {}, stepIndex: 0 }
  const step = sample.stepIndex

  // Continuous cinematic loop — no remount flash between teaching beats.
  useEffect(() => {
    if (!playing || !active || scrubbingRef.current) return
    if (typeof window === 'undefined') return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setPlaying(false)
      return
    }

    let raf = 0
    let last = performance.now()
    let lastPaint = 0
    const duration = Math.max(4000, playback.durationMs)

    const tick = (now: number) => {
      const dt = now - last
      last = now
      if (!scrubbingRef.current) {
        progressRef.current = (progressRef.current + dt / duration) % 1
        if (now - lastPaint >= 33) {
          lastPaint = now
          setProgress(progressRef.current)
        }
      }
      raf = window.requestAnimationFrame(tick)
    }
    raf = window.requestAnimationFrame(tick)
    return () => window.cancelAnimationFrame(raf)
  }, [playing, active?.slug, playback.durationMs])

  if (!theatre || !active || theatres.length === 0) return null

  const jumpToBeat = (beatIndex: number) => {
    const n = Math.max(1, steps.length)
    const next = (beatIndex + 0.5) / n
    progressRef.current = next
    setProgress(next)
    setPlaying(false)
  }

  return (
    <section className="ms-vault__section">
      <div className="ms-vault__section-head">
        <span className="ec-ink-stamp ec-ink-stamp--inline" aria-hidden>
          DX
        </span>
        <p className="ec-eyebrow mb-0">Max · concept cinema</p>
        <h2 className="m-0 text-lg font-bold text-[var(--ec-text-primary)]">
          Watch the idea move
        </h2>
        <p className="m-0 text-body text-[var(--ec-text-secondary)]">
          Live syllabus diagrams for your subjects — continuous motion you can scrub,
          pause, and open as a full lesson.
        </p>
      </div>

      <div className="ms-vault__theatre ms-vault__theatre--cinema">
        <div className="ms-vault__theatre-subjects" role="tablist" aria-label="Your subjects">
          {theatres.map((t) => {
            const on = t.subjectCode === theatre.subjectCode
            return (
              <button
                key={t.subjectCode}
                type="button"
                role="tab"
                aria-selected={on}
                className={`ms-vault__theatre-subject${on ? ' is-active' : ''}`}
                onClick={() => setSubjectCode(t.subjectCode)}
              >
                <span className="ms-vault__theatre-subject-name">{t.subjectLabel}</span>
                <span className="ms-vault__theatre-subject-meta">
                  {t.catalogCount} live ideas
                </span>
              </button>
            )
          })}
        </div>

        {all.length > 1 ? (
          <div className="ms-vault__theatre-filmstrip" role="listbox" aria-label="Concepts">
            {all.map((d) => {
              const on = d.slug === active.slug
              return (
                <button
                  key={d.slug}
                  type="button"
                  role="option"
                  aria-selected={on}
                  className={`ms-vault__theatre-film${on ? ' is-active' : ''}`}
                  onClick={() => {
                    setActiveSlug(d.slug)
                    progressRef.current = 0
                    setProgress(0)
                    setPlaying(true)
                  }}
                >
                  <span className="ms-vault__theatre-film-topic">{d.topicCode}</span>
                  <span className="ms-vault__theatre-film-title">{d.title}</span>
                  <span className="ms-vault__pill ms-vault__pill--gold">{d.chip}</span>
                </button>
              )
            })}
          </div>
        ) : null}

        <div className="ms-vault__theatre-hero ms-vault__theatre-hero--cinema">
          <div className="ms-vault__theatre-stage-wrap">
            <div className="ms-vault__theatre-badges">
              <MaxBadge label="Max exclusive" />
              <MaxBadge label="Live motion" />
              <span className="ms-vault__pill ms-vault__pill--gold">{active.chip}</span>
            </div>

            <div
              className={`ms-vault__theatre-stage ms-vault__theatre-stage--cinema${
                theatre.subjectCode === '9708' || /econ/i.test(theatre.subjectLabel)
                  ? ' ms-vault__theatre-stage--econ'
                  : ''
              }`}
            >
              <LazyLiveDiagram
                key={active.slug}
                slug={active.slug}
                stepIndex={step}
                params={sample.params}
                captionOverride={steps[step] ?? active.title}
              />
            </div>

            <div className="ms-vault__theatre-scrub">
              <label className="ms-vault__theatre-scrub-label" htmlFor="ms-vault-cinema-scrub">
                Scrub the idea
              </label>
              <input
                id="ms-vault-cinema-scrub"
                type="range"
                min={0}
                max={1000}
                value={Math.round(progress * 1000)}
                className="ms-vault__theatre-scrub-input"
                aria-valuetext={steps[step]}
                onPointerDown={() => {
                  scrubbingRef.current = true
                  setPlaying(false)
                }}
                onPointerUp={() => {
                  scrubbingRef.current = false
                }}
                onChange={(e) => {
                  const next = Number(e.target.value) / 1000
                  progressRef.current = next
                  setProgress(next)
                }}
              />
              <div className="ms-vault__theatre-controls">
                <button
                  type="button"
                  className="ec-btn-ghost text-sm"
                  onClick={() => setPlaying((p) => !p)}
                >
                  {playing ? 'Pause' : 'Play'}
                </button>
                <button
                  type="button"
                  className="ec-btn-ghost text-sm"
                  onClick={() => jumpToBeat(Math.max(0, step - 1))}
                >
                  ← Beat
                </button>
                <button
                  type="button"
                  className="ec-btn-ghost text-sm"
                  onClick={() => jumpToBeat(Math.min(steps.length - 1, step + 1))}
                >
                  Beat →
                </button>
                <Link href={active.lessonHref} className="ec-btn-primary text-sm">
                  Open full lesson
                </Link>
                {active.topicCode ? (
                  <a href="#ms-vault-qbank-title" className="ec-btn-ghost text-sm">
                    Sit {active.topicCode} on your desk →
                  </a>
                ) : null}
              </div>
            </div>
          </div>

          <div className="ms-vault__theatre-copy">
            <p className="ms-overline m-0 text-[var(--ec-c-math)]">
              {theatre.subjectLabel} · {active.topicCode}
            </p>
            <h3 className="m-0 text-xl font-bold text-[var(--ec-text-primary)]">
              {active.title}
            </h3>
            <p className="text-body m-0 text-[var(--ec-text-secondary)]">{active.tagline}</p>

            <ol className="ms-vault__theatre-beats" aria-label="Teaching beats">
              {steps.map((beat, i) => (
                <li
                  key={`${active.slug}-beat-${i}`}
                  className={`ms-vault__theatre-beat${i === step ? ' is-active' : ''}`}
                >
                  <button
                    type="button"
                    className="ms-vault__theatre-beat-btn"
                    onClick={() => jumpToBeat(i)}
                  >
                    <span className="ms-vault__theatre-beat-n">{i + 1}</span>
                    <span>
                      <MarkSnippet text={beat} />
                    </span>
                  </button>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </div>
    </section>
  )
}
