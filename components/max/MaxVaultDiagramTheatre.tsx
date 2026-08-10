'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { LazyLiveDiagram } from '@/components/courses/visuals/LazyLiveDiagram'
import type { VaultDiagramTheatre } from '@/lib/max/vault-diagram-showcase'
import { MaxBadge } from '@/components/max/MaxBadge'

/**
 * Cinematic Max-only diagram theatre: one signature showpiece + syllabus gallery.
 * Proves MarkScheme has modern interactive visuals — not just weak-topic pads.
 */
export function MaxVaultDiagramTheatre({ theatre }: { theatre: VaultDiagramTheatre }) {
  const all = useMemo(() => {
    const list = [...theatre.gallery]
    if (theatre.signature) list.unshift(theatre.signature)
    return list
  }, [theatre])

  const [activeSlug, setActiveSlug] = useState(
    () => theatre.signature?.slug ?? theatre.gallery[0]?.slug ?? ''
  )
  const [step, setStep] = useState(0)

  const active = all.find((d) => d.slug === activeSlug) ?? all[0]
  if (!active) return null

  return (
    <section className="ms-vault__section">
      <div className="ms-vault__section-head">
        <span className="ec-ink-stamp ec-ink-stamp--inline" aria-hidden>
          DX
        </span>
        <p className="ec-eyebrow mb-0">MarkScheme visuals</p>
        <h2 className="m-0 text-lg font-bold text-[var(--ec-text-primary)]">
          Diagram theatre
        </h2>
      </div>

      <div className="ms-vault__theatre">
        <div className="ms-vault__theatre-hero">
          <div className="ms-vault__theatre-badges">
            <MaxBadge label="Live SVG" />
            <span className="ms-vault__pill ms-vault__pill--gold">{active.chip}</span>
            <span className="text-caption text-[var(--ec-text-secondary)]">
              {theatre.catalogCount}+ interactive diagrams in this subject family
            </span>
          </div>

          <div className="ms-vault__theatre-stage">
            <LazyLiveDiagram
              key={`${active.slug}:${step}`}
              slug={active.slug}
              stepIndex={step}
              captionOverride={active.title}
            />
          </div>

          <div className="ms-vault__theatre-copy">
            <p className="ms-overline m-0 text-[var(--ec-c-math)]">{active.topicCode}</p>
            <h3 className="m-0 text-xl font-bold text-[var(--ec-text-primary)]">
              {active.title}
            </h3>
            <p className="text-body m-0 text-[var(--ec-text-secondary)]">{active.tagline}</p>

            <div className="ms-vault__theatre-controls">
              <button
                type="button"
                className="ec-btn-ghost text-sm"
                onClick={() => setStep((s) => Math.max(0, s - 1))}
                disabled={step <= 0}
              >
                ← Step back
              </button>
              <span className="font-mono text-xs font-bold text-[var(--ec-text-secondary)]">
                Step {step + 1}
              </span>
              <button
                type="button"
                className="ec-btn-ghost text-sm"
                onClick={() => setStep((s) => Math.min(5, s + 1))}
              >
                Step forward →
              </button>
              <Link href={active.lessonHref} className="ec-btn-primary text-sm">
                Open full lesson
              </Link>
            </div>
          </div>
        </div>

        {theatre.gallery.length > 0 ? (
          <div className="ms-vault__theatre-gallery">
            <p className="ms-overline m-0 mb-2 text-[var(--ec-acc-blue)]">
              More from the syllabus — tap to stage
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
