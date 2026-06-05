'use client'

import { useState } from 'react'
import { Network } from 'lucide-react'
import type { VisualTemplate } from '@/lib/courses/visual-types'
import { TopicDiagram } from '@/components/courses/visuals/TopicDiagram'
import { VisualSectionFrame } from '@/components/courses/visuals/VisualSectionFrame'

export function ConceptMapVisual({
  center,
  nodes,
  template,
}: {
  center: string
  nodes: string[]
  template: VisualTemplate
}) {
  const [active, setActive] = useState(0)
  const slice = nodes.slice(0, 6)

  return (
    <VisualSectionFrame
      title="How it all connects"
      hint="The big idea sits in the middle — tap the smaller ideas to see how they link."
      icon={Network}
      accent="violet"
      className="course-concept-map"
    >
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
        <div className="course-concept-map-canvas relative min-h-[280px] overflow-hidden rounded-2xl bg-[var(--ec-surface-muted)] p-6">
          <div className="absolute inset-0 flex items-center justify-center opacity-35">
            <TopicDiagram template={template} className="max-h-[240px]" />
          </div>
          <div className="relative flex h-full min-h-[240px] flex-col items-center justify-center">
            <div className="course-concept-core rounded-2xl bg-[var(--ec-surface-raised)] px-6 py-4 text-center">
              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--ec-brand)]">
                Main topic
              </p>
              <p className="mt-1 max-w-xs text-base font-semibold text-[var(--ec-text-primary)]">
                {center}
              </p>
            </div>
            <div className="mt-6 grid w-full max-w-lg grid-cols-2 gap-2 sm:grid-cols-3">
              {slice.map((node, i) => (
                <button
                  key={node}
                  type="button"
                  onClick={() => setActive(i)}
                  className={`course-concept-node rounded-xl px-3 py-2 text-left text-xs leading-snug transition-colors ${
                    active === i
                      ? 'is-active bg-[color-mix(in_srgb,var(--ec-brand)_12%,var(--ec-surface-raised))] text-[var(--ec-text-primary)]'
                      : 'bg-[var(--ec-surface-raised)]/95 text-[var(--ec-text-secondary)]'
                  }`}
                >
                  {node}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="course-concept-focus rounded-2xl bg-[var(--ec-surface-muted)] p-5">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--ec-text-tertiary)]">
            You selected
          </p>
          <p className="text-base font-medium leading-relaxed text-[var(--ec-text-primary)]">
            {slice[active]}
          </p>
          <p className="mt-4 rounded-lg border border-[var(--ec-border-subtle)] bg-[var(--ec-surface-raised)] px-3 py-2.5 text-sm leading-relaxed text-[var(--ec-text-secondary)]">
            Think about how this links back to <strong>{center}</strong> before you try past-paper
            questions. That connection is what examiners reward.
          </p>
        </div>
      </div>
    </VisualSectionFrame>
  )
}
