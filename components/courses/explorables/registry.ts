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
const IntegrationExplorer = dynamic(
  () => import('./IntegrationExplorer').then((m) => m.IntegrationExplorer),
  { ssr: false, loading: explorableLoading }
)
const SeriesExplorer = dynamic(
  () => import('./SeriesExplorer').then((m) => m.SeriesExplorer),
  { ssr: false, loading: explorableLoading }
)
const VectorExplorer = dynamic(
  () => import('./VectorExplorer').then((m) => m.VectorExplorer),
  { ssr: false, loading: explorableLoading }
)
const StationaryWaveExplorer = dynamic(
  () => import('./StationaryWaveExplorer').then((m) => m.StationaryWaveExplorer),
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
    case '1-8-integration':
      return createElement(IntegrationExplorer, props)
    case '1-6-series':
      return createElement(SeriesExplorer, props)
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
    case '3-7-vectors':
      return createElement(VectorExplorer, props)
    case '8-1-stationary-waves':
      return createElement(StationaryWaveExplorer, props)
    default:
      return null
  }
}

export function hasLessonExplorable(slug: string): boolean {
  return hasExplorable(slug)
}

/**
 * Guided "beats" for each explorable — the label + caption shown for each step.
 * Lives here (next to the components) so the narration matches the interactive,
 * instead of reusing the lesson's old static-diagram captions. Order must match
 * each component's internal BEATS array.
 */
export type ExplorableBeat = { label: string; caption: string }

const BEATS_BY_SLUG: Record<string, ExplorableBeat[]> = {
  '1-1-quadratics': [
    { label: 'Shape', caption: 'Change a — the parabola stretches, and flips when a is negative.' },
    { label: 'Vertex', caption: 'Drag the vertex: completing the square gives the form a(x−h)²+k with turning point (h, k).' },
    { label: 'Discriminant', caption: 'b²−4ac decides the roots: positive → two, zero → one repeated, negative → none.' },
    { label: 'Roots', caption: 'The roots are where the curve crosses the x-axis — read them off and check by substitution.' },
  ],
  '1-3-coordinate-geometry': [
    { label: 'The line', caption: 'Drag A and B — a unique straight line passes through the two points.' },
    { label: 'Gradient', caption: 'Gradient = rise ÷ run = Δy / Δx (shown as the dashed steps).' },
    { label: 'Midpoint & length', caption: 'The midpoint averages the coordinates; the length is Pythagoras on Δx and Δy.' },
  ],
  '1-4-circular-measure': [
    { label: 'Angle', caption: 'θ is measured in radians — the angle subtended at the centre.' },
    { label: 'Arc length', caption: 'Arc length s = rθ — proportional to both the radius and the angle.' },
    { label: 'Sector area', caption: 'Sector area = ½r²θ — the shaded slice of the circle.' },
  ],
  '1-5-trigonometry': [
    { label: 'Sine', caption: 'sin θ is the height of the point above the x-axis — it traces the sine wave.' },
    { label: 'Cosine', caption: 'cos θ is the horizontal distance — it gives the cosine wave.' },
    { label: 'Tangent', caption: 'tan θ = sin θ ÷ cos θ — undefined where cos θ = 0.' },
  ],
  '1-6-series': [
    { label: 'Terms', caption: 'Each term is the previous one times r: a, ar, ar², …' },
    { label: 'Partial sum', caption: 'Sₙ adds the first n terms — watch the running total build up.' },
    { label: 'Limit', caption: 'When |r| < 1 the partial sums converge on S∞ = a/(1−r); otherwise they diverge.' },
  ],
  '1-7-differentiation': [
    { label: 'Tangent', caption: 'Drag the point: the tangent’s steepness is the gradient f′(x).' },
    { label: 'Secant → tangent', caption: 'Shrink h — the secant through x and x+h sweeps onto the tangent as h → 0.' },
    { label: 'Gradient function', caption: 'f′(x) is positive where f rises, negative where it falls, zero at turning points.' },
  ],
  '1-8-integration': [
    { label: 'The area', caption: 'The definite integral is the area between the curve and the x-axis.' },
    { label: 'Rectangles', caption: 'Approximate that area with n rectangles of width Δx (a Riemann sum).' },
    { label: 'The limit', caption: 'As n → ∞, Δx → 0 and the sum approaches the exact area — that limit is the integral.' },
  ],
  '3-7-vectors': [
    { label: 'Two vectors', caption: 'Drag the tips of a and b drawn from the origin.' },
    { label: 'Resultant', caption: 'a + b runs from the tail of a to the tip of b — the parallelogram diagonal.' },
    { label: 'Components', caption: 'Add component-wise; the magnitude is √(rₓ² + rᵧ²) and the direction is its angle.' },
  ],
  '5-5-the-normal-distribution': [
    { label: 'Shape', caption: 'μ shifts the bell along the axis; σ controls how wide and flat it is.' },
    { label: 'Standardise', caption: 'z = (x − μ) / σ measures how many standard deviations a value is from the mean.' },
    { label: 'Between', caption: 'Drag a and b — the shaded area is P(a < X < b) = Φ(z_b) − Φ(z_a).' },
  ],
  '2-1-equations-of-motion': [
    { label: 'Trajectory', caption: 'Horizontal and vertical motion combine into a parabola; scrub time to fly it.' },
    { label: 'Max height', caption: 'At the peak the vertical velocity is zero: max height = (u sinθ)² / 2g.' },
    { label: 'Range & time', caption: 'Time of flight T = 2u sinθ / g and range = u cosθ × T.' },
  ],
  '7-1-progressive-waves': [
    { label: 'Shape', caption: 'Amplitude sets the height, wavelength λ the distance between crests.' },
    { label: 'Speed', caption: 'The wave travels at v = fλ — scrub time to send it along.' },
    { label: 'Period', caption: 'Each particle repeats every period T = 1/f as the wave passes.' },
  ],
  '8-1-stationary-waves': [
    { label: 'Pattern', caption: 'Two waves interfere to give a fixed pattern — scrub time to see it oscillate in place.' },
    { label: 'Nodes & antinodes', caption: 'Nodes never move; antinodes have maximum amplitude. n loops → n+1 nodes.' },
    { label: 'Harmonics', caption: 'The nth harmonic fits n half-wavelengths in the string: λ = 2L / n.' },
  ],
  '17-1-simple-harmonic-oscillations': [
    { label: 'Displacement', caption: 'x = A cos(ωt) — the mass traces a cosine curve against time.' },
    { label: 'Velocity', caption: 'Velocity is greatest at the centre and zero at the extremes.' },
    { label: 'Acceleration', caption: 'a = −ω²x — always directed back toward equilibrium, largest at the extremes.' },
  ],
}

export function getExplorableBeats(slug: string): ExplorableBeat[] {
  return BEATS_BY_SLUG[slug] ?? []
}
