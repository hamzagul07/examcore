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
const TrigExplorer = dynamic(
  () => import('./TrigExplorer').then((m) => m.TrigExplorer),
  { ssr: false, loading: explorableLoading }
)
const DiffExplorer = dynamic(
  () => import('./DiffExplorer').then((m) => m.DiffExplorer),
  { ssr: false, loading: explorableLoading }
)
const NormalExplorer = dynamic(
  () => import('./NormalExplorer').then((m) => m.NormalExplorer),
  { ssr: false, loading: explorableLoading }
)
const CircularMeasureExplorer = dynamic(
  () => import('./CircularMeasureExplorer').then((m) => m.CircularMeasureExplorer),
  { ssr: false, loading: explorableLoading }
)
const ProjectileExplorer = dynamic(
  () => import('./ProjectileExplorer').then((m) => m.ProjectileExplorer),
  { ssr: false, loading: explorableLoading }
)
const SHMExplorer = dynamic(
  () => import('./SHMExplorer').then((m) => m.SHMExplorer),
  { ssr: false, loading: explorableLoading }
)
const WaveExplorer = dynamic(
  () => import('./WaveExplorer').then((m) => m.WaveExplorer),
  { ssr: false, loading: explorableLoading }
)
const CoordGeometryExplorer = dynamic(
  () => import('./CoordGeometryExplorer').then((m) => m.CoordGeometryExplorer),
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
    case '1-5-trigonometry':
      return createElement(TrigExplorer, props)
    case '1-7-differentiation':
      return createElement(DiffExplorer, props)
    case '5-5-the-normal-distribution':
      return createElement(NormalExplorer, props)
    case '1-4-circular-measure':
      return createElement(CircularMeasureExplorer, props)
    case '2-1-equations-of-motion':
      return createElement(ProjectileExplorer, props)
    case '17-1-simple-harmonic-oscillations':
      return createElement(SHMExplorer, props)
    case '7-1-progressive-waves':
      return createElement(WaveExplorer, props)
    case '1-3-coordinate-geometry':
      return createElement(CoordGeometryExplorer, props)
    default:
      return null
  }
}

export function hasLessonExplorable(slug: string): boolean {
  return hasExplorable(slug)
}
