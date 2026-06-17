'use client'

import { useEffect, useState } from 'react'
import { LessonDiagram } from '@/components/diagrams/LessonDiagram'
import type { LessonDiagramMeta } from '@/lib/courses/lesson-diagrams'
import type { ComponentType } from 'react'
import type { LessonDiagramComponentProps } from '@/components/diagrams/diagram-props'

type DiagramEntry = {
  Component: ComponentType<LessonDiagramComponentProps>
  meta: LessonDiagramMeta
}

type Props = {
  slug: string
  stepIndex?: number
  params?: Record<string, number>
  className?: string
  captionOverride?: string
}

/** Loads the lesson diagram registry on demand — keeps GSAP/diagram chunks off the critical path. */
export function LazyLiveDiagram({
  slug,
  stepIndex,
  params,
  className = '',
  captionOverride,
}: Props) {
  const [entry, setEntry] = useState<DiagramEntry | null>(null)

  useEffect(() => {
    let cancelled = false
    void import('@/lib/courses/lesson-diagrams').then((mod) => {
      if (cancelled) return
      setEntry(mod.getLessonDiagram(slug))
    })
    return () => {
      cancelled = true
    }
  }, [slug])

  if (!entry) {
    return (
      <div
        className={`course-step-stage-diagram min-h-[12rem] animate-pulse rounded-xl bg-[var(--ec-bg-soft)] ${className}`.trim()}
        aria-hidden
      />
    )
  }

  return (
    <LessonDiagram
      Component={entry.Component}
      meta={entry.meta}
      className={`course-step-stage-custom-diagram ${className}`.trim()}
      stepIndex={stepIndex}
      params={params}
      lessonSlug={slug}
      captionOverride={captionOverride}
    />
  )
}
