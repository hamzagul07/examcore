'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
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

  const hasEmbed = !!interactiveEmbed
  const liveDiagram = hasLessonLiveDiagram(lessonSlug)
  const showNativeDiagram = !hasEmbed && liveDiagram
  const hasStage = showNativeDiagram || stepCarousel !== null

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

  if (!hasEmbed && !hasStage) return null

  return (
    <>
      {embedForStep ? (
        <CourseInteractiveEmbed
          embed={embedForStep}
          stepLabel={embedStepLabel}
          className="mb-6"
        />
      ) : null}

      {hasStage ? (
        <div
          className={`course-visual-learning-grid course-visual-stage ${hasEmbed ? 'course-visual-stage--after-embed' : ''}`}
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
              <div className="course-visual-learning-steps-list">
                <VisualStepTimeline
                  title={stepCarousel.title}
                  steps={stepCarousel.steps}
                  activeStep={activeStep}
                  onStepChange={setActiveStep}
                />
                <VisualStepCarousel
                  title={stepCarousel.title}
                  steps={stepCarousel.steps}
                  activeStep={activeStep}
                  onStepChange={setActiveStep}
                />
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </>
  )
}
