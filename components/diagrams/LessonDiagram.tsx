import type { ComponentType } from 'react'
import type { LessonDiagramMeta } from '@/lib/courses/lesson-diagrams'
import type { LessonDiagramComponentProps } from '@/components/diagrams/diagram-props'

export function LessonDiagram({
  Component,
  meta,
  className = '',
  stepIndex,
  params,
  lessonSlug,
  captionOverride,
}: {
  Component: ComponentType<LessonDiagramComponentProps>
  meta: LessonDiagramMeta
  className?: string
  stepIndex?: number
  params?: Record<string, number>
  lessonSlug?: string
  captionOverride?: string
}) {
  const caption = captionOverride ?? meta.caption
  return (
    <figure className={`lesson-diagram ${className}`.trim()}>
      <Component
        className="lesson-diagram-body"
        stepIndex={stepIndex}
        params={params}
        lessonSlug={lessonSlug}
      />
      <figcaption className="lesson-diagram-caption">{caption}</figcaption>
      <p className="lesson-diagram-attribution">
        {meta.attribution.source} · {meta.attribution.license}
      </p>
    </figure>
  )
}
