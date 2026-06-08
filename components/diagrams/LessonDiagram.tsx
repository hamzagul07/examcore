import type { ComponentType } from 'react'
import type { LessonDiagramMeta } from '@/lib/courses/lesson-diagrams'

export function LessonDiagram({
  Component,
  meta,
  className = '',
}: {
  Component: ComponentType<{ className?: string }>
  meta: LessonDiagramMeta
  className?: string
}) {
  return (
    <figure className={`lesson-diagram ${className}`.trim()}>
      <Component className="lesson-diagram-body" />
      <figcaption className="lesson-diagram-caption">{meta.caption}</figcaption>
      <p className="lesson-diagram-attribution">
        {meta.attribution.source} · {meta.attribution.license}
      </p>
    </figure>
  )
}
