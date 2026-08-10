'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { LazyLiveDiagram } from '@/components/courses/visuals/LazyLiveDiagram'
import type { VaultDiagramTheatre } from '@/lib/max/vault-diagram-showcase'
import { MaxBadge } from '@/components/max/MaxBadge'

/**
 * Max-only syllabus diagram player: subject tabs from the student's profile,
 * autoplay teaching steps, and a gallery of live visuals for that syllabus.
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
  const [step, setStep] = useState(0)
  const [playing, setPlaying] = useState(true)

  // When subject changes, reset to that subject's signature.
  useEffect(() => {
    if (!theatre) return
    const next = theatre.signature?.slug ?? theatre.gallery[0]?.slug ?? ''
    setActiveSlug(next)
    setStep(0)
    setPlaying(true)
  }, [theatre?.subjectCode])

  const active = all.find((d) => d.slug === activeSlug) ?? all[0]
  const steps = active?.teachingSteps?.length
    ? active.teachingSteps
    : ['Watch the diagram move — each step unlocks the idea.']
  const maxStep = Math.max(0, steps.length - 1)

  useEffect(() => {
    if (!playing || !active) return
    const id = window.setInterval(() => {
      setStep((s) => (s >= maxStep ? 0 : s + 1))
    }, 2800)
    return () => window.clearInterval(id)
  }, [playing, active?.slug, maxStep])

  if (!theatre || !active || theatres.length === 0) return null

  return (
    <section className="ms-vault__section">
      <div className="ms-vault__section-head">
        <span className="ec-ink-stamp ec-ink-stamp--inline" aria-hidden>
          DX
        </span>
        <p className="ec-eyebrow mb-0">Max · your subjects</p>
        <h2 className="m-0 text-lg font-bold text-[var(--ec-text-primary)]">
          Syllabus diagram studio
        </h2>
      </div>

      <div className="ms-vault__theatre">
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
                  {t.catalogCount} live diagrams
                </span>
              </button>
            )
          })}
        </div>

        <div className="ms-vault__theatre-hero">
          <div className="ms-vault__theatre-badges">
            <MaxBadge label="Max exclusive" />
            <MaxBadge label="Live SVG" />
            <span className="ms-vault__pill ms-vault__pill--gold">{active.chip}</span>
            <span className="text-caption text-[var(--ec-text-secondary)]">
              Built for {theatre.subjectLabel} — step through until the idea clicks
            </span>
          </div>

          <div className="ms-vault__theatre-stage ms-vault__theatre-stage--xl">
            <LazyLiveDiagram
              key={`${active.slug}:${step}`}
              slug={active.slug}
              stepIndex={step}
              captionOverride={steps[step] ?? active.title}
            />
          </div>

          <div className="ms-vault__theatre-copy">
            <p className="ms-overline m-0 text-[var(--ec-c-math)]">
              {theatre.subjectLabel} · {active.topicCode}
            </p>
            <h3 className="m-0 text-xl font-bold text-[var(--ec-text-primary)]">
              {active.title}
            </h3>
            <p className="text-body m-0 text-[var(--ec-text-secondary)]">{active.tagline}</p>

            <ol className="ms-vault__theatre-beats" aria-label="Teaching steps">
              {steps.map((beat, i) => (
                <li
                  key={`${active.slug}-beat-${i}`}
                  className={`ms-vault__theatre-beat${i === step ? ' is-active' : ''}`}
                >
                  <button
                    type="button"
                    className="ms-vault__theatre-beat-btn"
                    onClick={() => {
                      setPlaying(false)
                      setStep(i)
                    }}
                  >
                    <span className="ms-vault__theatre-beat-n">{i + 1}</span>
                    <span>{beat}</span>
                  </button>
                </li>
              ))}
            </ol>

            <div className="ms-vault__theatre-controls">
              <button
                type="button"
                className="ec-btn-ghost text-sm"
                onClick={() => {
                  setPlaying(false)
                  setStep((s) => Math.max(0, s - 1))
                }}
                disabled={step <= 0}
              >
                ← Back
              </button>
              <button
                type="button"
                className="ec-btn-ghost text-sm"
                onClick={() => setPlaying((p) => !p)}
              >
                {playing ? 'Pause' : 'Autoplay'}
              </button>
              <button
                type="button"
                className="ec-btn-ghost text-sm"
                onClick={() => {
                  setPlaying(false)
                  setStep((s) => Math.min(maxStep, s + 1))
                }}
                disabled={step >= maxStep}
              >
                Next →
              </button>
              <Link href={active.lessonHref} className="ec-btn-primary text-sm">
                Open full lesson
              </Link>
            </div>
          </div>
        </div>

        {all.length > 1 ? (
          <div className="ms-vault__theatre-gallery">
            <p className="ms-overline m-0 mb-2 text-[var(--ec-acc-blue)]">
              {theatre.subjectLabel} syllabus visuals — tap to stage
            </p>
            <ul className="ms-vault__theatre-thumbs">
              {all.map((d) => {
                const on = d.slug === active.slug
                return (
                  <li key={d.slug}>
                    <button
                      type="button"
                      className={`ms-vault__theatre-thumb${on ? ' is-active' : ''}`}
                      onClick={() => {
                        setActiveSlug(d.slug)
                        setStep(0)
                        setPlaying(true)
                      }}
                      aria-pressed={on}
                    >
                      <div className="ms-vault__theatre-thumb-stage" aria-hidden>
                        <LazyLiveDiagram slug={d.slug} captionOverride="" />
                      </div>
                      <span className="ms-vault__theatre-thumb-label">{d.title}</span>
                      <span className="ms-vault__pill ms-vault__pill--gold">{d.chip}</span>
                    </button>
                  </li>
                )
              })}
            </ul>
          </div>
        ) : null}
      </div>
    </section>
  )
}
