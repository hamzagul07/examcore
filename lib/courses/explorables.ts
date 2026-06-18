/**
 * Source-of-truth list of lesson slugs that have a bespoke interactive
 * "explorable" (a first-class, hand-built interactive diagram). Pure module (no
 * React) so both the server-side lesson adapter and the client registry can
 * agree on which lessons render an explorable.
 *
 * Keep this in sync with the component map in
 * components/courses/explorables/registry.ts.
 */
export const EXPLORABLE_SLUGS: ReadonlySet<string> = new Set<string>([
  '1-1-quadratics',
  '1-3-coordinate-geometry',
  '1-4-circular-measure',
  '1-5-trigonometry',
  '1-7-differentiation',
  '5-5-the-normal-distribution',
  // Physics (9702)
  '2-1-equations-of-motion',
  '7-1-progressive-waves',
  '17-1-simple-harmonic-oscillations',
])

export function hasExplorable(slug: string): boolean {
  return EXPLORABLE_SLUGS.has(slug)
}
