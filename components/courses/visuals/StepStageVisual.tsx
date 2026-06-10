'use client'

import { useEffect, useRef } from 'react'
import gsap from 'gsap'
import type { VisualTemplate } from '@/lib/courses/visual-types'
import { TopicDiagram } from '@/components/courses/visuals/TopicDiagram'
import { LessonDiagram } from '@/components/diagrams/LessonDiagram'
import { getLessonDiagram } from '@/lib/courses/lesson-diagrams'
import { getLessonDiagramSpec, stepStateFor } from '@/lib/courses/diagram-specs'
import { CourseRichText } from '@/components/courses/CourseRichText'

const CAPTIONS: Partial<Record<VisualTemplate, { latex?: string; text: string }>> = {
  forces: {
    latex: '$F_{net} = ma$',
    text: 'The net force on a mass causes acceleration.',
  },
  waves: {
    latex: '$v = f\\lambda$',
    text: 'Wave speed links frequency and wavelength.',
  },
  energy: {
    text: 'Heating changes temperature or phase — track Q with $Q = mc\\Delta T$ and $Q = mL$.',
  },
  thermal: {
    latex: '$K = C + 273.15$',
    text: 'Kelvin is absolute; Celsius is relative — same size steps (ΔK = Δ°C).',
  },
}

type Props = {
  template: VisualTemplate
  lessonSlug?: string
  stepIndex?: number
  params?: Record<string, number>
  /** Overrides default caption when step-synced. */
  stepCaption?: string
}

export function StepStageVisual({
  template,
  lessonSlug,
  stepIndex = 0,
  params,
  stepCaption,
}: Props) {
  const custom = lessonSlug ? getLessonDiagram(lessonSlug) : null
  const spec = lessonSlug ? getLessonDiagramSpec(lessonSlug) : null
  const specCaption = stepCaption ?? stepStateFor(spec, stepIndex)?.caption
  const defaultCaption = CAPTIONS[template] ?? {
    text: 'Visual summary of the key ideas in this topic.',
  }
  const diagramRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = diagramRef.current
    if (!el || typeof window === 'undefined') return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    gsap.fromTo(el, { opacity: 0.85 }, { opacity: 1, duration: 0.3, ease: 'power1.out' })
  }, [stepIndex, params])

  const captionText = specCaption ?? custom?.meta.caption ?? defaultCaption.text

  return (
    <div className="course-step-stage-visual">
      <p className="course-step-stage-label">
        {custom ? 'Live diagram' : 'Topic diagram'}
        {spec?.steps.length ? (
          <span className="course-step-stage-step-badge">
            Step {stepIndex + 1}/{spec.steps.length}
          </span>
        ) : null}
      </p>
      <div ref={diagramRef} className="course-step-stage-diagram">
        {custom ? (
          <LessonDiagram
            Component={custom.Component}
            meta={custom.meta}
            className="course-step-stage-custom-diagram"
            stepIndex={stepIndex}
            params={params}
            lessonSlug={lessonSlug}
            captionOverride={specCaption}
          />
        ) : (
          <TopicDiagram template={template} className="course-step-stage-svg" />
        )}
      </div>
      {!custom ? (
        <div className="course-step-stage-caption">
          {defaultCaption.latex ? (
            <div className="course-step-stage-formula">
              <CourseRichText content={defaultCaption.latex} variant="inline" />
            </div>
          ) : null}
          <p className="course-step-stage-caption-text">
            {captionText.includes('$') ? (
              <CourseRichText content={captionText} variant="inline" />
            ) : (
              captionText
            )}
          </p>
        </div>
      ) : null}
    </div>
  )
}
