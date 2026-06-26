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
  '1-1-roots-of-polynomial-equations': '1-1-quadratics',

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

  // ── 2281 O-Level Economics → 9708 catalog visuals ───────────────────────
  '2-3-demand': '2-1-demand-and-supply-curves',
  '2-5-price-determination': '2-4-the-interaction-of-demand-and-supply',
  '2-7-price-elasticity-of-demand': '2-2-price-elasticity-income-elasticity-and-cross-elasticity-of-demand',
  '2-8-price-elasticity-of-supply': '2-3-price-elasticity-of-supply',
  '1-4-production-possibility-curve-diagrams': '1-5-production-possibility-curves',
  '2-10-market-failure': '3-1-reasons-for-government-intervention-in-markets',
  '4-3-fiscal-policy': '5-2-fiscal-policy',
  '4-8-inflation-and-deflation': '4-6-price-stability',
  '1-1-the-nature-of-the-economic-problem': '1-1-scarcity-choice-and-opportunity-cost',
  '1-3-opportunity-cost': '1-1-scarcity-choice-and-opportunity-cost',
  '2-4-supply': '2-1-demand-and-supply-curves',
  '2-11-mixed-economic-system': '1-4-resource-allocation-in-different-economic-systems',
  '4-6-economic-growth': '4-4-economic-growth',
  '4-7-employment-and-unemployment': '4-5-unemployment',
  '5-4-differences-in-economic-development-between-countries':
    '11-4-characteristics-of-countries-at-different-levels-of-development',

  // ── 7115 O-Level Business → 9609 catalog visuals ────────────────────────
  '3-3-marketing-mix': '3-3-1-the-elements-of-the-marketing-mix-the-4ps',
  '4-2-costs-scale-of-production-and-break-even-analysis': '5-4-4-break-even-analysis',
  '2-1-motivating-workers': '2-2-1-motivation-as-a-tool-of-management-and-leadership',
  '5-3-income-statements': '10-1-1-statement-of-profit-or-loss',
  '1-5-business-objectives-and-stakeholder-objectives': '1-5-1-business-stakeholders',
  '3-1-marketing-and-the-market': '3-1-1-the-role-of-marketing-and-its-relationship-with-other-business-activities',
  '1-3-enterprise-business-growth-and-size': '1-3-3-business-growth',
  '4-1-production-of-goods-and-services': '4-1-1-the-transformational-process',
  '5-2-cash-flow-forecasting-and-working-capital': '5-3-1-cash-flow-forecasts',
  '5-4-statement-of-financial-position': '10-1-2-statement-of-financial-position',
  '2-3-recruitment-selection-and-training-of-workers': '2-1-3-recruitment-and-selection',
  '6-3-business-and-the-international-economy': '8-2-3-strategies-for-international-marketing',
}

export function resolveVisualCatalogSlug(slug: string): string {
  return VISUAL_SLUG_ALIASES[slug] ?? slug
}
