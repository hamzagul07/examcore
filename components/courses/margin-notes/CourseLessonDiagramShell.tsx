'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { LessonInteractiveEmbed } from '@/lib/courses/types'
import type { VisualTemplate } from '@/lib/courses/visual-types'
import type { LessonDiagramSpec } from '@/lib/courses/diagram-specs'
import {
  clampStepIndex,
  defaultParamValues,
  resolveDiagramSpec,
  stepStateFor,
} from '@/lib/courses/diagram-specs'
import { isDualVisualSlug } from '@/lib/courses/placeholder-embeds'
import { CourseInteractiveEmbed } from '@/components/courses/CourseInteractiveEmbed'
import { CourseRichText } from '@/components/courses/CourseRichText'
import { StepStageVisual } from '@/components/courses/visuals/StepStageVisual'
import { DiagramParamControls } from '@/components/courses/visuals/DiagramParamControls'
import type { LessonStep } from '@/lib/courses/margin-notes/types'

type Props = {
  lessonSlug: string
  template: VisualTemplate
  diagramSpec?: LessonDiagramSpec | null
  interactiveEmbed?: LessonInteractiveEmbed | null
  steps: LessonStep[]
  step: number
  setStep: (n: number) => void
}

export function CourseLessonDiagramShell({
  lessonSlug,
  template,
  diagramSpec,
  interactiveEmbed,
  steps,
  step,
  setStep,
}: Props) {
  const resolvedSpec = useMemo(
    () => resolveDiagramSpec(lessonSlug, diagramSpec),
    [diagramSpec, lessonSlug]
  )
  const [playing, setPlaying] = useState(false)
  const [params, setParams] = useState(() => defaultParamValues(resolvedSpec))
  const [liveDiagram, setLiveDiagram] = useState(false)
  const diagramRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let cancelled = false
    void import('@/lib/courses/lesson-diagrams').then((mod) => {
      if (!cancelled) setLiveDiagram(mod.hasLessonLiveDiagram(lessonSlug))
    })
    return () => {
      cancelled = true
    }
  }, [lessonSlug])

  const dualVisual = isDualVisualSlug(lessonSlug) && !!interactiveEmbed
  const stepCount = Math.max(steps.length, resolvedSpec?.steps.length ?? 0, 1)
  const activeIndex = Math.max(0, Math.min(stepCount - 1, step - 1))
  const diagramStep = clampStepIndex(resolvedSpec, activeIndex)
  const stepState = stepStateFor(resolvedSpec, diagramStep)
  const currentStep = steps[activeIndex] ?? steps[0]
  const stageCaption = stepState?.caption

  const embedForStep = useMemo(() => {
    if (!interactiveEmbed) return null
    const hint = stepState?.embedHint ?? interactiveEmbed.hint
    return hint === interactiveEmbed.hint ? interactiveEmbed : { ...interactiveEmbed, hint }
  }, [interactiveEmbed, stepState?.embedHint])

  const embedStepLabel =
    interactiveEmbed && resolvedSpec?.steps.length
      ? `Step ${activeIndex + 1} of ${resolvedSpec.steps.length}`
      : undefined

  useEffect(() => {
    if (!playing || stepCount < 2) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setPlaying(false)
      return
    }
    const id = setInterval(() => {
      setStep(step >= stepCount ? 1 : step + 1)
    }, 2600)
    return () => clearInterval(id)
  }, [playing, setStep, step, stepCount])

  const handleParamChange = useCallback((id: string, value: number) => {
    setParams((prev) => ({ ...prev, [id]: value }))
  }, [])

  if (!liveDiagram && !interactiveEmbed) return null

  const providerLabel =
    interactiveEmbed?.provider === 'geogebra'
      ? 'GeoGebra'
      : interactiveEmbed?.provider === 'phet'
        ? 'PhET simulation'
        : 'Live interactive'

  return (
    <div className="diagram-wrap" data-screen-label="Lesson — live diagram">
      <div className="diagram-head">
        <span className="micro diagram-live-label">
          {interactiveEmbed && liveDiagram
            ? 'LIVE DIAGRAM + SIM'
            : interactiveEmbed
              ? providerLabel.toUpperCase()
              : 'LIVE DIAGRAM'}
        </span>
        <span className="diagram-step-label mono">
          STEP {step} / {stepCount}
          {currentStep?.title ? ` · ${currentStep.title}` : ''}
        </span>
        {stepCount > 1 ? (
          <button className="diagram-play" type="button" onClick={() => setPlaying((p) => !p)}>
            {playing ? '❙❙ pause' : '▶ play'}
          </button>
        ) : null}
      </div>

      {embedForStep ? (
        <div className="diagram-embed">
          <CourseInteractiveEmbed embed={embedForStep} stepLabel={embedStepLabel} layout="diagram" />
        </div>
      ) : null}

      {dualVisual || (interactiveEmbed && liveDiagram) ? (
        <p className="diagram-dual-bridge body-2">
          {dualVisual
            ? 'Step-synced diagram — highlights what to look for in the simulation above.'
            : 'Step-synced diagram — use the steps to walk through each layer with the sim.'}
        </p>
      ) : null}

      {liveDiagram ? (
        <div ref={diagramRef} className="diagram-stage">
          <StepStageVisual
            template={template}
            lessonSlug={lessonSlug}
            stepIndex={diagramStep}
            params={params}
            stepCaption={stepState?.caption}
          />
          {resolvedSpec?.params?.length ? (
            <DiagramParamControls
              params={resolvedSpec.params}
              values={params}
              onChange={handleParamChange}
            />
          ) : null}
          {stageCaption ? (
            <p className="diagram-stage-caption body-2">{stageCaption}</p>
          ) : null}
        </div>
      ) : null}

      {stepCount > 1 ? (
        <div className="diagram-dots">
          {Array.from({ length: stepCount }, (_, i) => i + 1).map((n) => (
            <button
              key={n}
              type="button"
              className={`dg-dot${step === n ? ' on' : ''}`}
              aria-label={`Step ${n}`}
              onClick={() => setStep(n)}
            />
          ))}
        </div>
      ) : null}

      {currentStep?.title || currentStep?.body ? (
        <div className="diagram-step-detail">
          {currentStep.title ? (
            <p className="diagram-step-detail-title serif">{currentStep.title}</p>
          ) : null}
          {currentStep.body ? (
            <CourseRichText
              content={currentStep.body}
              variant="prose"
              className="body-2 diagram-step-detail-body"
              breakAnywhere={false}
            />
          ) : null}
        </div>
      ) : null}

      {steps.length > 1 ? (
        <ol className="diagram-step-strip" aria-label="Walkthrough steps">
          {steps.map((s) => (
            <li key={s.n}>
              <button
                type="button"
                className={`diagram-step-pill${step === s.n ? ' on' : ''}`}
                onClick={() => setStep(s.n)}
              >
                <span className="diagram-step-pill-n mono">{s.n}</span>
                <span className="diagram-step-pill-t">{s.title}</span>
              </button>
            </li>
          ))}
        </ol>
      ) : null}
    </div>
  )
}
