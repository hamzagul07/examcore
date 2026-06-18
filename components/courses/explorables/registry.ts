'use client'

import { createElement, lazy } from 'react'
import type { ReactNode } from 'react'
import { hasExplorable } from '@/lib/courses/explorables'

/**
 * Props every explorable receives from CourseLessonDiagramShell.
 * `step` is the 0-based active guided beat; `stepCount` the total beats.
 */
export type ExplorableProps = {
  step: number
  stepCount: number
}

// Module-level lazy components (stable references — created once at import,
// never during render). Heavier interactive code stays off the critical path.
const QuadraticExplorer = lazy(() =>
  import('./QuadraticExplorer').then((m) => ({ default: m.QuadraticExplorer }))
)

/**
 * First-class, per-lesson interactive diagrams ("explorables"). Returns a React
 * element for the lesson's bespoke explorable, or null. Rendering known
 * module-level components via a switch (rather than a dynamic component
 * variable) keeps it compatible with the React Compiler.
 *
 * Keep the slugs here in sync with lib/courses/explorables.ts.
 */
export function renderLessonExplorable(slug: string, props: ExplorableProps): ReactNode {
  switch (slug) {
    case '1-1-quadratics':
      return createElement(QuadraticExplorer, props)
    default:
      return null
  }
}

export function hasLessonExplorable(slug: string): boolean {
  return hasExplorable(slug)
}
