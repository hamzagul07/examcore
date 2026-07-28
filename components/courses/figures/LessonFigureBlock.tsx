'use client'

import dynamic from 'next/dynamic'
import type { ComponentType } from 'react'
import type { FigureKind, LessonFigure } from '@/lib/courses/figures'

/**
 * Renders a data-authored lesson figure.
 *
 * Every renderer is `ssr: false` and code-split. These libraries are large
 * (mermaid ~500 kB, vega ~800 kB) and none of them produce output a crawler can
 * read, so keeping them off the server stream costs nothing and keeps the lesson
 * payload flat for the ~85% of lessons that use no figures at all.
 */

const figureLoading = () => <div className="lesson-figure-loading" aria-hidden />

const RENDERERS: Record<FigureKind, ComponentType<{ figure: never }>> = {
  mermaid: dynamic(() => import('./MermaidFigure').then((m) => m.MermaidFigure), {
    ssr: false,
    loading: figureLoading,
  }),
  chart: dynamic(() => import('./ChartFigure').then((m) => m.ChartFigure), {
    ssr: false,
    loading: figureLoading,
  }),
  molecule: dynamic(() => import('./MoleculeFigure').then((m) => m.MoleculeFigure), {
    ssr: false,
    loading: figureLoading,
  }),
  notation: dynamic(() => import('./NotationFigure').then((m) => m.NotationFigure), {
    ssr: false,
    loading: figureLoading,
  }),
} as Record<FigureKind, ComponentType<{ figure: never }>>

export function LessonFigureBlock({ figure }: { figure: LessonFigure }) {
  const Renderer = RENDERERS[figure.kind]
  if (!Renderer) return null

  return (
    <figure className="lesson-figure" data-figure-kind={figure.kind}>
      <figcaption className="lesson-figure-title">{figure.title}</figcaption>
      <div className="lesson-figure-body">
        <Renderer figure={figure as never} />
      </div>
      {figure.caption ? <p className="lesson-figure-caption">{figure.caption}</p> : null}
    </figure>
  )
}
