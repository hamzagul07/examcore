'use client'

import { useEffect, useRef, useState } from 'react'
import gsap from 'gsap'
import type { VisualTemplate } from '@/lib/courses/visual-types'
import { TopicDiagram } from '@/components/courses/visuals/TopicDiagram'
import { LazyLiveDiagram } from '@/components/courses/visuals/LazyLiveDiagram'
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

function DiagramStage({
  template,
  lessonSlug,
  stepIndex,
  params,
}: Pick<Props, 'template' | 'lessonSlug' | 'stepIndex' | 'params'>) {
  const [mode, setMode] = useState<'loading' | 'live' | 'topic'>(() =>
    lessonSlug ? 'loading' : 'topic'
  )

  useEffect(() => {
    if (!lessonSlug) {
      setMode('topic')
      return
    }
    let cancelled = false
    void import('@/lib/courses/lesson-diagrams').then((mod) => {
      if (cancelled) return
      setMode(mod.getLessonDiagram(lessonSlug) ? 'live' : 'topic')
    })
    return () => {
      cancelled = true
    }
  }, [lessonSlug])

  if (mode === 'loading') {
    return (
      <div
        className="course-step-stage-diagram min-h-[12rem] animate-pulse rounded-xl bg-[var(--ec-bg-soft)]"
        aria-hidden
      />
    )
  }

  if (mode === 'live' && lessonSlug) {
    return (
      <LazyLiveDiagram
        slug={lessonSlug}
        stepIndex={stepIndex}
        params={params}
      />
    )
  }

  return <TopicDiagram template={template} className="course-step-stage-svg" />
}

export function StepStageVisual({
  template,
  lessonSlug,
  stepIndex = 0,
  params,
  stepCaption,
}: Props) {
  const spec = lessonSlug ? getLessonDiagramSpec(lessonSlug) : null
  const specCaption = stepCaption ?? stepStateFor(spec, stepIndex)?.caption
  const defaultCaption = CAPTIONS[template] ?? {
    text: 'Visual summary of the key ideas in this topic.',
  }
  const diagramRef = useRef<HTMLDivElement>(null)
  const [isLive, setIsLive] = useState(false)

  useEffect(() => {
    if (!lessonSlug) {
      setIsLive(false)
      return
    }
    let cancelled = false
    void import('@/lib/courses/lesson-diagrams').then((mod) => {
      if (!cancelled) setIsLive(!!mod.getLessonDiagram(lessonSlug))
    })
    return () => {
      cancelled = true
    }
  }, [lessonSlug])

  useEffect(() => {
    const el = diagramRef.current
    if (!el || typeof window === 'undefined') return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    gsap.fromTo(el, { opacity: 0.85 }, { opacity: 1, duration: 0.3, ease: 'power1.out' })
  }, [stepIndex, params])

  const captionText = specCaption ?? defaultCaption.text

  return (
    <div className="course-step-stage-visual">
      <p className="course-step-stage-label">
        {isLive ? 'Live diagram' : 'Topic diagram'}
        {spec?.steps.length ? (
          <span className="course-step-stage-step-badge">
            Step {stepIndex + 1}/{spec.steps.length}
          </span>
        ) : null}
      </p>
      <div ref={diagramRef} className="course-step-stage-diagram">
        <DiagramStage
          template={template}
          lessonSlug={lessonSlug}
          stepIndex={stepIndex}
          params={params}
        />
      </div>
      {!isLive ? (
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
