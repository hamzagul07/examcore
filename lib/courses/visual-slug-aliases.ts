/**
 * Map pilot lesson slugs to a catalog slug that already has embed + diagram-spec.
 * Used when topic codes differ (9231 vs 9709) or syllabus naming varies (9618).
 */
export const VISUAL_SLUG_ALIASES: Record<string, string> = {
  // ── 9231 Further Maths → 9709 / 9702 catalog ─────────────────────────────
  '1-2-rational-functions-and-graphs': '1-2-functions',
  '1-3-summation-of-series': '1-6-series',
  '1-4-matrices': '1-2-functions',
  '1-5-polar-coordinates': '1-4-circular-measure',
  '1-6-vectors': '3-7-vectors',
  '1-7-proof-by-induction': '1-6-series',
  '2-1-hyperbolic-functions': '3-2-logarithmic-and-exponential-functions',
  '2-2-matrices': '1-2-functions',
  '2-3-differentiation': '1-7-differentiation',
  '2-4-integration': '3-5-integration',
  '2-5-complex-numbers': '3-9-complex-numbers',
  '2-4-differentiation': '1-7-differentiation',
  '3-4-differentiation': '1-7-differentiation',
  '2-5-integration': '1-8-integration',
  '3-8-differential-equations': '3-5-integration',
  '2-6-differential-equations': '3-8-differential-equations',
  '3-1-motion-of-a-projectile': '2-1-equations-of-motion',
  '3-2-equilibrium-of-a-rigid-body': '4-2-equilibrium-of-forces',
  '3-3-circular-motion': '12-1-kinematics-of-uniform-circular-motion',
  '3-4-hookes-law': '17-1-simple-harmonic-oscillations',
  '3-5-linear-motion-under-a-variable-force': '5-2-gravitational-potential-energy-and-kinetic-energy',
  '3-6-momentum': '3-3-linear-momentum-and-its-conservation',
  '4-1-continuous-random-variables': '5-4-discrete-random-variables',
  '4-2-inference-using-normal-and-t-distributions': '5-5-the-normal-distribution',
  '4-3-tests': '6-5-hypothesis-tests',
  '4-4-non-parametric-tests': '6-5-hypothesis-tests',
  '4-5-probability-generating-functions': '6-1-the-poisson-distribution',
  '1-1-roots-of-polynomial-equations': '1-2-functions',

  // ── 9618 slug normalisation ───────────────────────────────────────────────
  '4-1-central-processing-unit-cpu-architecture': '3-1-computers-and-their-components',
  '9-2-algorithms': '19-1-algorithms',
  '19-2-recursion': '19-1-algorithms',
  '11-3-structured-programming': '11-2-constructs',
  '12-2-program-design': '12-1-program-development-life-cycle',
  '13-1-user-defined-data-types': '10-1-data-types-and-records',
  '14-2-circuit-switching-packet-switching': '2-1-networks-including-the-internet',
  '5-2-language-translators': '16-2-translation-software',
  '5-1-operating-systems': '16-1-purposes-of-an-operating-system-os',
  '6-2-data-integrity': '6-1-data-security',
  '8-2-database-management-systems-dbms': '8-1-database-concepts',
  '10-4-introduction-to-abstract-data-types-adt': '10-2-arrays',
  '20-2-file-processing-and-exception-handling': '10-3-files',
  '9-1-computational-thinking-skills': '19-1-algorithms',
  '14-1-protocols': '2-1-networks-including-the-internet',
  '13-2-file-organisation-and-access': '10-3-files',

  // ── 9702 ──────────────────────────────────────────────────────────────────
  '8-2-diffraction': '8-4-the-diffraction-grating',
}

export function resolveVisualCatalogSlug(slug: string): string {
  return VISUAL_SLUG_ALIASES[slug] ?? slug
}
