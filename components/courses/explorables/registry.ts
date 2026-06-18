'use client'

import { createElement } from 'react'
import type { ReactNode } from 'react'
import dynamic from 'next/dynamic'
import { hasExplorable } from '@/lib/courses/explorables'

/**
 * Props every explorable receives from CourseLessonDiagramShell.
 * `step` is the 0-based active guided beat; `stepCount` the total beats.
 */
export type ExplorableProps = {
  step: number
  stepCount: number
}

// Client-only, code-split components. Explorables are Pro-gated + purely
// interactive, so they have no SSR value — rendering them client-only (ssr:false)
// keeps their heavier deps (framer-motion, KaTeX) off the server stream entirely
// and prevents any SSR-time stalls. Module-level = stable references.
const explorableLoading = () =>
  createElement('div', { className: 'diagram-explorable-loading', 'aria-hidden': true })

const QuadraticExplorer = dynamic(
  () => import('./QuadraticExplorer').then((m) => m.QuadraticExplorer),
  { ssr: false, loading: explorableLoading }
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
