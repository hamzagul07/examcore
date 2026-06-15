'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import gsap from 'gsap'
import type { LessonDiagramSpec } from '@/lib/courses/diagram-specs'
import type { PartitionedVisualBlocks } from '@/lib/courses/lesson-layout'
import type { VisualTemplate } from '@/lib/courses/visual-types'
import type { LessonInteractiveEmbed } from '@/lib/courses/types'
import {
  clampStepIndex,
  defaultParamValues,
  resolveDiagramSpec,
  stepStateFor,
} from '@/lib/courses/diagram-specs'
import { CourseInteractiveEmbed } from '@/components/courses/CourseInteractiveEmbed'
import { StepStageVisual } from '@/components/courses/visuals/StepStageVisual'
import { VisualStepTimeline } from '@/components/courses/visuals/VisualStepTimeline'
import { VisualStepCarousel } from '@/components/courses/visuals/VisualStepCarousel'
import { DiagramParamControls } from '@/components/courses/visuals/DiagramParamControls'
import { hasLessonLiveDiagram } from '@/lib/courses/lesson-diagrams'
import { isDualVisualSlug } from '@/lib/courses/placeholder-embeds'

type Props = {
  partitioned: PartitionedVisualBlocks
  template: VisualTemplate
  lessonSlug: string
  diagramSpec?: LessonDiagramSpec | null
  interactiveEmbed?: LessonInteractiveEmbed | null
}

export function VisualStepController({
  partitioned,
  template,
  lessonSlug,
  diagramSpec,
  interactiveEmbed,
}: Props) {
  const { stepCarousel } = partitioned
  const resolvedSpec = useMemo(
    () => resolveDiagramSpec(lessonSlug, diagramSpec),
    [diagramSpec, lessonSlug]
  )

  const [activeStep, setActiveStep] = useState(0)
  const [params, setParams] = useState(() => defaultParamValues(resolvedSpec))
  const diagramRef = useRef<HTMLDivElement>(null)
  const stageRef = useRef<HTMLDivElement>(null)

  const hasEmbed = !!interactiveEmbed
  const liveDiagram = hasLessonLiveDiagram(lessonSlug)
  const dualVisual = isDualVisualSlug(lessonSlug) && hasEmbed
  const showNativeDiagram = liveDiagram && (!hasEmbed || dualVisual)
  const hasStage = showNativeDiagram || stepCarousel !== null
  const stepCount = stepCarousel?.steps.length ?? resolvedSpec?.steps.length ?? 0

  const diagramStep = clampStepIndex(resolvedSpec, activeStep)
  const stepState = stepStateFor(resolvedSpec, diagramStep)
  const embedForStep = useMemo(() => {
    if (!interactiveEmbed) return null
    const hint = stepState?.embedHint ?? interactiveEmbed.hint
    return hint === interactiveEmbed.hint ? interactiveEmbed : { ...interactiveEmbed, hint }
  }, [interactiveEmbed, stepState?.embedHint])

  const embedStepLabel =
    interactiveEmbed && resolvedSpec?.steps.length
      ? `Step ${activeStep + 1} of ${resolvedSpec.steps.length}`
      : undefined

  const goToStep = useCallback(
    (index: number) => {
      if (!stepCount) return
      setActiveStep(Math.max(0, Math.min(stepCount - 1, index)))
    },
    [stepCount]
  )

  useEffect(() => {
    const el = diagramRef.current
    if (!el || typeof window === 'undefined') return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    gsap.fromTo(
      el,
      { opacity: 0.72, scale: 0.985 },
      { opacity: 1, scale: 1, duration: 0.38, ease: 'power2.out' }
    )
  }, [activeStep, diagramStep])

  const handleParamChange = (id: string, value: number) => {
    setParams((prev) => ({ ...prev, [id]: value }))
    const el = diagramRef.current
    if (!el || typeof window === 'undefined') return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    gsap.fromTo(el, { scale: 0.99 }, { scale: 1, duration: 0.2, ease: 'power1.out' })
  }

  const handleStageKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (!stepCarousel || stepCount < 2) return
    if (event.key === 'ArrowLeft') {
      event.preventDefault()
      goToStep(activeStep - 1)
    } else if (event.key === 'ArrowRight') {
      event.preventDefault()
      goToStep(activeStep + 1)
    }
  }

  if (!hasEmbed && !hasStage) return null

  return (
    <>
      {embedForStep ? (
        <CourseInteractiveEmbed
          embed={embedForStep}
          stepLabel={embedStepLabel}
          className={dualVisual ? 'mb-5' : 'mb-6'}
        />
      ) : null}

      {dualVisual ? (
        <p className="course-dual-visual-bridge">
          Step-synced diagram — highlights what to look for in the simulation above.
        </p>
      ) : null}

      {hasStage ? (
        <div
          ref={stageRef}
          tabIndex={stepCarousel && stepCount > 1 ? 0 : undefined}
          role={stepCarousel && stepCount > 1 ? 'group' : undefined}
          aria-label={stepCarousel ? 'Step-synced visual walkthrough' : undefined}
          onKeyDown={handleStageKeyDown}
          className={`course-visual-learning-grid course-visual-stage ${hasEmbed ? 'course-visual-stage--after-embed' : ''} ${dualVisual ? 'course-visual-stage--dual' : ''}`}
        >
          {showNativeDiagram ? (
            <div ref={diagramRef} className="course-visual-learning-diagram">
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
            </div>
          ) : null}

          {stepCarousel ? (
            <div
              className={`course-visual-learning-steps min-w-0 ${!showNativeDiagram ? 'col-span-full' : ''}`}
            >
              {!showNativeDiagram && stepState?.caption ? (
                <p className="course-step-sync-callout mb-4">{stepState.caption}</p>
              ) : null}
              {stepCarousel && stepCount > 1 ? (
                <p className="course-visual-keyboard-hint hidden lg:block">
                  Tip: use ← → arrow keys while this section is focused.
                </p>
              ) : null}
              <div className="course-visual-learning-steps-list">
                <VisualStepTimeline
                  title={stepCarousel.title}
                  steps={stepCarousel.steps}
                  activeStep={activeStep}
                  onStepChange={goToStep}
                  embedded
                />
                <VisualStepCarousel
                  title={stepCarousel.title}
                  steps={stepCarousel.steps}
                  activeStep={activeStep}
                  onStepChange={goToStep}
                  embedded
                />
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </>
  )
}
