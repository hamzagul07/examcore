import type { CourseLesson, LessonInteractiveEmbed } from '@/lib/courses/types'
import { preferNativeDiagramOverPlaceholder } from '@/lib/courses/placeholder-embeds'
import { resolveVisualCatalogSlug } from '@/lib/courses/visual-slug-aliases'

export type InteractiveEmbedProvider = LessonInteractiveEmbed['provider']

/** HTML5 PhET sim — standard embed path. */
export function phetHtml5EmbedUrl(simId: string): string {
  return `https://phet.colorado.edu/sims/html/${simId}/latest/${simId}_en.html`
}

/** Legacy Java sims ported with CheerpJ (e.g. photoelectric). */
export function phetCheerpjEmbedUrl(simId: string): string {
  return `https://phet.colorado.edu/sims/cheerpj/${simId}/latest/${simId}.html`
}

/** @deprecated Use phetHtml5EmbedUrl or phetCheerpjEmbedUrl */
export function phetEmbedUrl(simId: string): string {
  return phetHtml5EmbedUrl(simId)
}

export function phetSimPageUrl(simId: string): string {
  return `https://phet.colorado.edu/en/simulations/${simId}`
}

/**
 * GeoGebra material embed.
 * Note: geogebra.org/material/iframe/id/… returns 410 — use classic app URL.
 */
export function geogebraEmbedUrl(materialId: string): string {
  return `https://www.geogebra.org/classic?material=${materialId}`
}

export function geogebraMaterialPageUrl(materialId: string): string {
  /** Same host as embed — reliably opens the material in GeoGebra Classic. */
  return geogebraEmbedUrl(materialId)
}

const PHET_ATTRIBUTION = {
  source: 'PhET Interactive Simulations, University of Colorado Boulder',
  license: 'CC BY 4.0',
  sourceUrl: 'https://phet.colorado.edu',
} as const

const GEOGEBRA_ATTRIBUTION = {
  source: 'GeoGebra',
  license: 'GeoGebra Terms of Service',
  sourceUrl: 'https://www.geogebra.org',
} as const

function phetEntry(
  simId: string,
  title: string,
  hint: string,
  options?: { cheerpj?: boolean }
): LessonInteractiveEmbed {
  return {
    provider: 'phet',
    title,
    embedUrl: options?.cheerpj ? phetCheerpjEmbedUrl(simId) : phetHtml5EmbedUrl(simId),
    launchUrl: phetSimPageUrl(simId),
    hint,
    aspectRatio: '834 / 504',
    attribution: PHET_ATTRIBUTION,
  }
}

function geogebraEntry(
  materialId: string,
  title: string,
  hint: string
): LessonInteractiveEmbed {
  return {
    provider: 'geogebra',
    title,
    embedUrl: geogebraEmbedUrl(materialId),
    launchUrl: geogebraMaterialPageUrl(materialId),
    hint,
    aspectRatio: '834 / 504',
    attribution: GEOGEBRA_ATTRIBUTION,
  }
}

/**
 * Curated interactive sims for high-traffic pilot topics.
 * Lesson JSON may override via `interactiveEmbed`.
 */
export const INTERACTIVE_EMBED_CATALOG: Record<string, LessonInteractiveEmbed> = {
  '13-3-gravitational-field-of-a-point-mass': phetEntry(
    'gravity-force-lab-basics',
    'Gravitational force lab',
    'Change mass and separation — watch how force follows an inverse-square law (syllabus 13.3).'
  ),
  '8-4-the-diffraction-grating': phetEntry(
    'wave-interference',
    'Wave interference',
    'Switch to “Light” mode and compare slit patterns — see why a grating gives sharp maxima (8.4).'
  ),
  '10-1-practical-circuits': phetEntry(
    'circuit-construction-kit-dc',
    'Circuit construction kit (DC)',
    'Build series and parallel circuits — measure current and potential difference live (10.1).'
  ),
  '15-3-kinetic-theory-of-gases': phetEntry(
    'gas-properties',
    'Gas properties',
    'Heat the gas and watch pressure, volume, and particle speed — kinetic theory in action (15.3).'
  ),
  '1-7-differentiation': geogebraEntry(
    'mNMJ2R85',
    'Tangent and gradient explorer',
    'Move the point along the curve — read the gradient and see the tangent line update (9709 1.7).'
  ),
  '8-3-interference': phetEntry(
    'wave-interference',
    'Wave interference',
    'Use two sources — path difference sets bright and dark fringes (8.3).'
  ),
  '17-1-simple-harmonic-oscillations': phetEntry(
    'masses-and-springs-basics',
    'Masses and springs',
    'Watch displacement, velocity, and energy swap during SHM (17.1).'
  ),
  '18-4-electric-field-of-a-point-charge': phetEntry(
    'charges-and-fields',
    'Charges and fields',
    'Place charges and read field vectors — E ∝ 1/r² for a point charge (18.4).'
  ),
  '2-1-equations-of-motion': phetEntry(
    'forces-and-motion-basics',
    'Forces and motion',
    'Apply forces and watch velocity and position graphs update live (2.1).'
  ),
  '3-5-integration': geogebraEntry(
    'eMd42deT',
    'Integral as area',
    'Adjust limits and watch the signed area under the curve (9709 3.5).'
  ),
  '8-1-stationary-waves': phetEntry(
    'wave-on-a-string',
    'Wave on a string',
    'Fixed ends create nodes and antinodes — compare with progressive waves (8.1).'
  ),
  '19-3-discharging-a-capacitor': phetEntry(
    'capacitor-lab-basics',
    'Capacitor lab',
    'Charge and discharge through a resistor — watch exponential decay (19.3).'
  ),
  '22-2-photoelectric-effect': phetEntry(
    'photoelectric',
    'Photoelectric effect',
    'Increase frequency and intensity — see threshold frequency and photoelectron energy (22.2).',
    { cheerpj: true }
  ),
  '7-2-transverse-and-longitudinal-waves': phetEntry(
    'wave-on-a-string',
    'Wave on a string',
    'Compare particle motion with wave direction — transverse vs longitudinal (7.2).'
  ),
  '1-8-integration': geogebraEntry(
    'eMd42deT',
    'Integral as area',
    'Adjust limits on P1 — signed area under the curve (9709 1.8).'
  ),
  '3-7-vectors': geogebraEntry(
    'WmHhJ2R8',
    'Vector addition explorer',
    'Drag vectors a and b — read components and resultant (9709 3.7).'
  ),

  // ── 9700 Biology (PhET) ──────────────────────────────────────────────
  '4-2-movement-into-and-out-of-cells': phetEntry(
    'concentration',
    'Diffusion and concentration',
    'Watch particles spread from high to low concentration — then relate to passive transport (4.2).'
  ),
  '6-1-structure-of-nucleic-acids-and-replication-of-dna': phetEntry(
    'gene-expression-essentials',
    'Gene expression essentials',
    'Express a gene — see transcription and translation link DNA to protein (6.1).'
  ),
  '17-2-natural-and-artificial-selection': phetEntry(
    'natural-selection',
    'Natural selection',
    'Change the environment — track which fur colours survive and reproduce (17.2).'
  ),
  '17-3-evolution': phetEntry(
    'natural-selection',
    'Natural selection & evolution',
    'Run several generations — allele frequencies shift as selection acts (17.3).'
  ),

  // ── 9701 Chemistry (PhET) ────────────────────────────────────────────
  '1-1-particles-in-the-atom-and-atomic-radius': phetEntry(
    'build-an-atom',
    'Build an atom',
    'Add protons, neutrons, electrons — read atomic number, mass number, and charge (1.1).'
  ),
  '1-2-isotopes': phetEntry(
    'isotopes-and-atomic-mass',
    'Isotopes and atomic mass',
    'Compare isotopes of an element — see how neutron count changes mass but not identity (1.2).'
  ),
  '2-2-the-mole-and-the-avogadro-constant': phetEntry(
    'molarity',
    'Molarity lab',
    'Prepare solutions of known concentration — link moles, volume, and mol dm⁻³ (2.2).'
  ),
  '2-3-formulas': phetEntry(
    'build-a-molecule',
    'Build a molecule',
    'Assemble atoms into molecules — read molecular and empirical formulas (2.3).'
  ),
  '3-1-electronegativity-and-bonding': phetEntry(
    'molecule-polarity',
    'Molecule polarity',
    'Change electronegativity — watch bond dipoles and whether the molecule is polar (3.1).'
  ),
  '3-4-covalent-bonding-and-coordinate-dative-covalent-bonding': phetEntry(
    'build-a-molecule',
    'Build a molecule',
    'Form covalent bonds by sharing electrons — count bonds in the final structure (3.4).'
  ),
  '3-5-shapes-of-molecules': phetEntry(
    'molecule-shapes',
    'Molecule shapes',
    'Add bonding pairs and lone pairs — read the predicted VSEPR geometry (3.5).'
  ),
  '4-1-the-gaseous-state-ideal-and-real-gases-and-pv-nrt': phetEntry(
    'gas-properties',
    'Gas properties',
    'Heat the sample and change volume — track p, V, n, T and test pV = nRT (4.1).'
  ),
  '7-2-br-nsted-lowry-theory-of-acids-and-bases': phetEntry(
    'acid-base-solutions',
    'Acid-base solutions',
    'Compare strong vs weak acids — read pH and conjugate pairs (7.2).'
  ),
  '8-1-rate-of-reaction': phetEntry(
    'reactants-products-and-leftovers',
    'Reactants, products, and leftovers',
    'Limiting reagent scenarios — link stoichiometry to how much product forms (8.1).'
  ),

  // ── 9702 Physics — additional PhET ───────────────────────────────────
  '3-3-linear-momentum-and-its-conservation': phetEntry(
    'collision-lab',
    'Collision lab',
    'Elastic and inelastic collisions — check momentum before and after impact (3.3).'
  ),
  '9-1-electric-current': phetEntry(
    'ohms-law',
    "Ohm's law",
    'Adjust voltage and resistance — read current and power in the circuit (9.1).'
  ),
  '9-3-resistance-and-resistivity': phetEntry(
    'ohms-law',
    "Ohm's law",
    'Change wire length and area — see how R depends on geometry (9.3).'
  ),
  '11-1-atoms-nuclei-and-radiation': phetEntry(
    'rutherford-scattering',
    'Rutherford scattering',
    'Fire alpha particles at gold — most pass through, some deflect (11.1).'
  ),
  '20-5-electromagnetic-induction': phetEntry(
    'faradays-law',
    "Faraday's law",
    'Move a magnet through a coil — induced e.m.f. depends on rate of flux change (20.5).'
  ),
  '5-2-gravitational-potential-energy-and-kinetic-energy': phetEntry(
    'energy-skate-park-basics',
    'Energy skate park',
    'Track KE and GPE on a ramp — mechanical energy swaps but total stays constant (5.2).'
  ),
  '20-4-magnetic-fields-due-to-currents': phetEntry(
    'magnets-and-electromagnets',
    'Magnets and electromagnets',
    'Switch the current — field strength and direction around a solenoid (20.4).'
  ),

  // ── 9709 Mathematics (GeoGebra) ──────────────────────────────────────
  '1-1-quadratics': geogebraEntry(
    'dw8UVau8',
    'Quadratic functions explorer',
    'Move sliders a, h, k — see how y = a(x − h)² + k transforms the parabola (9709 1.1).'
  ),
  '1-5-trigonometry': geogebraEntry(
    'Ccgmq82f',
    'Unit circle trigonometry',
    'Drag the point on the unit circle — read sin θ, cos θ, and tan θ (9709 1.5).'
  ),
  '3-3-trigonometry': geogebraEntry(
    'Ccgmq82f',
    'Unit circle trigonometry',
    'Use radians on the circle — link to P3 identities and equations (9709 3.3).'
  ),
  '3-9-complex-numbers': geogebraEntry(
    'pqmzJ2Rk',
    'Complex number plane',
    'Plot z = a + bi — read modulus and argument in the Argand diagram (9709 3.9).'
  ),
  '5-5-the-normal-distribution': geogebraEntry(
    'qumaztck',
    'Normal distribution',
    'Adjust μ and σ — see how the bell curve shifts and spreads (9709 5.5).'
  ),

  // ── 9701 Chemistry batch 2 ───────────────────────────────────────────
  '5-1-enthalpy-change-h': phetEntry(
    'energy-forms-and-changes',
    'Energy forms and changes',
    'Heat or cool the system — track energy transfer and temperature change (5.1).'
  ),
  '5-2-hesss-law': phetEntry(
    'energy-forms-and-changes',
    'Energy forms and changes',
    'Compare energy paths — Hess’s law sums enthalpy steps to the same overall ΔH (5.2).'
  ),
  '6-1-redox-processes-electron-transfer-and-changes-in-oxidation-number-oxidation-state': phetEntry(
    'balancing-chemical-equations',
    'Balancing chemical equations',
    'Balance redox equations — atom counts confirm conservation of mass and charge (6.1).'
  ),
  '7-1-chemical-equilibria-reversible-reactions-dynamic-equilibrium': phetEntry(
    'acid-base-solutions',
    'Acid-base equilibrium',
    'Weak acid equilibrium — forward and reverse rates equal at dynamic equilibrium (7.1).'
  ),
  '8-2-effect-of-temperature-on-reaction-rates-and-the-concept-of-activation-energy': phetEntry(
    'states-of-matter-basics',
    'States of matter basics',
    'Heat the sample — faster particle motion links to collision energy and rate (8.2).'
  ),

  // ── 9709 Mathematics batch 2 ─────────────────────────────────────────
  '1-3-coordinate-geometry': phetEntry(
    'graphing-lines',
    'Graphing lines',
    'Change gradient and intercept — read equation y = mx + c from the graph (9709 1.3).'
  ),
  '1-6-series': phetEntry(
    'expression-exchange',
    'Expression exchange',
    'Build equivalent expressions — practise binomial expansion patterns (9709 1.6).'
  ),
  '2-2-logarithmic-and-exponential-functions': phetEntry(
    'function-builder',
    'Function builder',
    'Compare y = a^x and y = log_a(x) — inverse function symmetry (9709 2.2).'
  ),
  '5-3-probability': geogebraEntry(
    'm5JhJ2Rk',
    'Probability explorer',
    'Adjust probabilities — see sample space and combined events (9709 5.3).'
  ),
  '4-4-newtons-laws-of-motion': phetEntry(
    'forces-and-motion-basics',
    'Forces and motion',
    'Apply net force — F = ma links to acceleration on the motion graph (9709 4.4).'
  ),

  // ── 9708 Economics (GeoGebra) ──────────────────────────────────────────
  '2-1-demand-and-supply-curves': geogebraEntry(
    'VGWtkPU5',
    'Supply and demand introduction',
    'Shift curves — read equilibrium price and quantity (9708 2.1).'
  ),
  '2-4-the-interaction-of-demand-and-supply': geogebraEntry(
    'SnqQmKsq',
    'Supply and demand shifts',
    'Move demand or supply — track new equilibrium P and Q (9708 2.4).'
  ),
  '2-2-price-elasticity-income-elasticity-and-cross-elasticity-of-demand': geogebraEntry(
    'SnqQmKsq',
    'Elasticity and equilibrium',
    'Steep vs flat demand — relate elasticity to price responsiveness (9708 2.2).'
  ),
  '1-5-production-possibility-curves': geogebraEntry(
    'hxJ5J2Rk',
    'Production possibility frontier',
    'Move along the PPC — opportunity cost and efficiency (9708 1.5).'
  ),

  // ── 9700 Biology batch 2 ─────────────────────────────────────────────
  '6-2-protein-synthesis': phetEntry(
    'gene-expression-essentials',
    'Gene expression essentials',
    'Transcription then translation — link DNA sequence to polypeptide (6.2).'
  ),
  '13-1-photosynthesis-as-an-energy-transfer-process': phetEntry(
    'greenhouse-effect',
    'Greenhouse effect',
    'Light energy and CO₂ — connect atmospheric gases to energy transfer ideas (13.1).'
  ),

  // ── 9701 Organic chemistry ───────────────────────────────────────────
  '14-2-alkenes': phetEntry(
    'build-a-molecule',
    'Build a molecule',
    'Build an alkene — identify the C=C double bond and addition products (14.2).'
  ),
  '15-1-halogenoalkanes': phetEntry(
    'molecule-shapes',
    'Molecule shapes',
    'See tetrahedral C–X geometry — relate to SN1/SN2 mechanisms (15.1).'
  ),
  '16-1-alcohols': phetEntry(
    'build-a-molecule',
    'Build a molecule',
    'Construct ethanol and propan-2-ol — compare primary vs secondary alcohols (16.1).'
  ),
  '13-4-isomerism-structural-isomerism-and-stereoisomerism': phetEntry(
    'molecule-shapes',
    'Molecule shapes',
    'Compare shapes of isomers — optical isomerism needs chiral centres (13.4).'
  ),
  '13-3-shapes-of-organic-molecules-and-bonds': phetEntry(
    'molecule-shapes',
    'Molecule shapes',
    'Identify σ and π bonds — ethene vs ethane geometry (13.3).'
  ),
  '17-1-aldehydes-and-ketones': phetEntry(
    'build-a-molecule',
    'Build a molecule',
    'Compare carbonyl C=O in aldehydes vs ketones (17.1).'
  ),

  // ── 9708 Macroeconomics ────────────────────────────────────────────────
  '4-3-aggregate-demand-and-aggregate-supply-analysis': geogebraEntry(
    'gvkgx8ga',
    'AD–AS model',
    'Shift AD or AS — read effects on real GDP and price level (9708 4.3).'
  ),
  '4-4-economic-growth': geogebraEntry(
    'gvkgx8ga',
    'AD–AS and growth',
    'Rightward LRAS or AD shift — link to economic growth (9708 4.4).'
  ),
  '4-5-unemployment': geogebraEntry(
    'n65waCV4',
    'Macro equilibrium shifts',
    'Recessionary gap — equilibrium below full employment (9708 4.5).'
  ),
  '4-6-price-stability': geogebraEntry(
    'gvkgx8ga',
    'AD–AS and inflation',
    'Demand-pull vs cost-push — trace price level changes (9708 4.6).'
  ),

  // ── 9709 Mechanics batch 2 ─────────────────────────────────────────────
  '4-5-energy-work-and-power': phetEntry(
    'energy-skate-park-basics',
    'Energy skate park',
    'Track KE, GPE, and work done — power = work/time on ramps (9709 4.5).'
  ),

  // ── 9618 Computer Science ──────────────────────────────────────────────
  '3-2-logic-gates-and-logic-circuits': geogebraEntry(
    'kQBWnCFC',
    'Logic gates explorer',
    'Combine AND, OR, NOT gates — build truth tables for circuits (9618 3.2).'
  ),

  // ── 9701 Organic & A Level batch 4 ───────────────────────────────────
  '14-1-alkanes': phetEntry(
    'build-a-molecule',
    'Build a molecule',
    'Build methane and ethane — saturated C–C and C–H σ bonds only (14.1).'
  ),
  '18-1-carboxylic-acids': phetEntry(
    'build-a-molecule',
    'Build a molecule',
    'Identify –COOH group and hydrogen bonding in ethanoic acid (18.1).'
  ),
  '18-2-esters': phetEntry(
    'build-a-molecule',
    'Build a molecule',
    'Form the ester linkage –COO– from acid + alcohol (18.2).'
  ),
  '19-1-primary-amines': phetEntry(
    'build-a-molecule',
    'Build a molecule',
    'Compare –NH₂ on primary amine vs ammonia (19.1).'
  ),
  '23-1-lattice-energy-and-born-haber-cycles': phetEntry(
    'energy-forms-and-changes',
    'Energy forms and changes',
    'Trace exothermic formation steps — Born–Haber cycle energy accounting (23.1).'
  ),

  // ── 9708 Policy & trade ────────────────────────────────────────────────
  '5-2-fiscal-policy': geogebraEntry(
    'gvkgx8ga',
    'Fiscal policy AD–AS',
    'Government spending or tax shift — trace AD movement (9708 5.2).'
  ),
  '5-3-monetary-policy': geogebraEntry(
    'gvkgx8ga',
    'Monetary policy AD–AS',
    'Interest rate effect on AD — consumption and investment channel (9708 5.3).'
  ),
  '5-4-supply-side-policy': geogebraEntry(
    'gvkgx8ga',
    'Supply-side LRAS shift',
    'Rightward LRAS — productivity and incentive effects (9708 5.4).'
  ),
  '6-1-the-reasons-for-international-trade': geogebraEntry(
    'VGWtkPU5',
    'Comparative advantage trade',
    'Specialisation and exchange — lower opportunity cost drives trade (9708 6.1).'
  ),

  // ── 9709 P2/P3 batch 4 ─────────────────────────────────────────────────
  '1-2-functions': phetEntry(
    'function-builder',
    'Function builder',
    'Compose f(g(x)) — domain, range, and inverse ideas (9709 1.2).'
  ),
  '2-1-algebra': phetEntry(
    'expression-exchange',
    'Expression exchange',
    'Equivalent forms — partial fractions and polynomial factorisation (9709 2.1).'
  ),
  '3-8-differential-equations': geogebraEntry(
    'v4kEjJ2R',
    'Slope fields',
    'dy/dx as slope — sketch solution curves through points (9709 3.8).'
  ),
  '3-4-differentiation': geogebraEntry(
    'mNMJ2R85',
    'Tangent and gradient explorer',
    'P3 differentiation — chain/product/quotient on combined functions (9709 3.4).'
  ),

  // ── 9701 Periodicity & A Level batch 5 ─────────────────────────────────
  '9-1-periodicity-of-physical-properties-of-the-elements-in-period-3': phetEntry(
    'build-an-atom',
    'Build an atom',
    'Add protons — see atomic radius and ionisation energy trends across Period 3 (9.1).'
  ),
  '9-2-periodicity-of-chemical-properties-of-the-elements-in-period-3': phetEntry(
    'acid-base-solutions',
    'Acid–base solutions',
    'Oxides of Period 3 elements — acidic, amphoteric, and basic behaviour (9.2).'
  ),
  '10-1-similarities-and-trends-in-the-properties-of-the-group-2-metals-magnesium-to-barium-and-their-compounds':
    phetEntry(
      'reactants-products-and-leftovers',
      'Reactants, products, and leftovers',
      'Group 2 reactions with water and dilute acid — trend in reactivity down the group (10.1).'
    ),
  '11-2-the-chemical-properties-of-the-halogen-elements-and-the-hydrogen-halides': phetEntry(
    'build-a-molecule',
    'Build a molecule',
    'H–X bond polarity and halogen reactivity — F₂ to I₂ (11.2).'
  ),
  '12-1-nitrogen-and-sulfur': phetEntry(
    'build-a-molecule',
    'Build a molecule',
    'NH₃, NO₂, SO₂, H₂SO₄ — oxidation states and environmental chemistry (12.1).'
  ),
  '23-2-enthalpies-of-solution-and-hydration': phetEntry(
    'energy-forms-and-changes',
    'Energy forms and changes',
    'Enthalpy cycles linking lattice energy, hydration, and solution (23.2).'
  ),
  '23-4-gibbs-free-energy-change-g': phetEntry(
    'energy-forms-and-changes',
    'Energy forms and changes',
    'ΔG = ΔH − TΔS — predict feasibility from enthalpy and entropy (23.4).'
  ),
  '24-1-electrolysis': phetEntry(
    'battery-voltage',
    'Battery voltage',
    'Electron flow at electrodes — link to electrolysis and ion discharge (24.1).',
    { cheerpj: true }
  ),

  // ── 9708 International macro batch 5 ─────────────────────────────────
  '6-2-protectionism': geogebraEntry(
    'SnqQmKsq',
    'Trade and tariff effects',
    'Tariff on imports — deadweight loss and consumer surplus change (9708 6.2).'
  ),
  '6-3-current-account-of-the-balance-of-payments': geogebraEntry(
    'gvkgx8ga',
    'Macro flows and AD',
    'Link net exports (X−M) to aggregate demand and the current account (9708 6.3).'
  ),
  '6-4-exchange-rates': geogebraEntry(
    'VGWtkPU5',
    'Exchange rate and trade',
    'Currency depreciation — effect on export competitiveness (9708 6.4).'
  ),

  // ── 9709 P2/P4/P5 batch 5 ──────────────────────────────────────────────
  '2-3-trigonometry': geogebraEntry(
    'Ccgmq82f',
    'Unit circle trigonometry',
    'P2 identities and equations — sin, cos, tan on the unit circle (9709 2.3).'
  ),
  '2-4-differentiation': geogebraEntry(
    'mNMJ2R85',
    'Tangent and gradient explorer',
    'P2 differentiation — stationary points and second derivative test (9709 2.4).'
  ),
  '3-1-algebra': phetEntry(
    'expression-exchange',
    'Expression exchange',
    'P3 algebra — modulus, partial fractions, and polynomial roots (9709 3.1).'
  ),
  '4-1-forces-and-equilibrium': phetEntry(
    'forces-and-motion-basics',
    'Forces and motion',
    'Resolve forces — equilibrium when net force is zero (9709 4.1).'
  ),
  '5-1-representation-of-data': geogebraEntry(
    'm5JhJ2Rk',
    'Data distribution explorer',
    'Histograms, mean, median, and spread — interpret grouped data (9709 5.1).'
  ),

  // ── 9701 Organic & electrochemistry batch 6 ────────────────────────────
  '11-3-some-reactions-of-the-halide-ions': phetEntry(
    'build-a-molecule',
    'Build a molecule',
    'Halide tests — AgCl precipitate, NH₃ complex, and redox with H₂SO₄ (11.3).'
  ),
  '11-4-the-reactions-of-chlorine': phetEntry(
    'acid-base-solutions',
    'Acid–base solutions',
    'Cl₂ + H₂O disproportionation — bleach chemistry and chlorination (11.4).'
  ),
  '20-1-addition-polymerisation': phetEntry(
    'build-a-molecule',
    'Build a molecule',
    'Repeat unit from alkene monomer — C=C opens to form poly(ethene) chain (20.1).'
  ),
  '21-1-organic-synthesis': phetEntry(
    'build-a-molecule',
    'Build a molecule',
    'Multi-step routes — identify functional groups at each conversion (21.1).'
  ),
  '23-3-entropy-change-s': phetEntry(
    'gas-properties',
    'Gas properties',
    'Disorder and particle spread — link microstates to ΔS sign (23.3).'
  ),
  '24-2-standard-electrode-potentials-e-standard-cell-potentials-ecell-and-the-nernst-equation': phetEntry(
    'circuit-construction-kit-dc',
    'Circuit construction kit DC',
    'Cell emf and electron flow — link E°cell to feasible direction (24.2).'
  ),

  // ── 9708 A Level micro batch 6 ─────────────────────────────────────────
  '7-2-indifference-curves-and-budget-lines': geogebraEntry(
    'SnqQmKsq',
    'Budget and choice',
    'Budget line pivot — utility maximisation at tangency (9708 7.2).'
  ),
  '7-3-efficiency-and-market-failure': geogebraEntry(
    'VGWtkPU5',
    'Efficiency and welfare',
    'Deadweight loss when market quantity ≠ socially optimal (9708 7.3).'
  ),
  '7-4-private-costs-and-benefits-externalities-and-social-costs-and-benefits': geogebraEntry(
    'SnqQmKsq',
    'Externalities diagram',
    'MSC > MPC — overproduction and welfare loss from negative externality (9708 7.4).'
  ),
  '7-6-different-market-structures': geogebraEntry(
    'VGWtkPU5',
    'Market structures',
    'Compare demand curves facing firms — perfect competition vs monopoly (9708 7.6).'
  ),

  // ── 9709 P3/P4/P5 batch 6 ──────────────────────────────────────────────
  '3-2-logarithmic-and-exponential-functions': phetEntry(
    'function-builder',
    'Function builder',
    'P3 ln and e^x — inverse graphs and domain restrictions (9709 3.2).'
  ),
  '3-6-numerical-solution-of-equations': geogebraEntry(
    'dw8UVau8',
    'Root-finding graph',
    'Sign change and iteration — locate roots of f(x) = 0 (9709 3.6).'
  ),
  '4-2-kinematics-of-motion-in-a-straight-line': phetEntry(
    'forces-and-motion-basics',
    'Forces and motion',
    'v–t and s–t graphs — SUVAT links from gradient and area (9709 4.2).'
  ),
  '4-3-momentum': phetEntry(
    'collision-lab',
    'Collision lab',
    'Conservation of momentum — elastic and inelastic collisions (9709 4.3).'
  ),
  '5-2-permutations-and-combinations': geogebraEntry(
    'm5JhJ2Rk',
    'Counting outcomes',
    'Sample space size — permutations vs combinations logic (9709 5.2).'
  ),

  // ── 9709 completion batch 7 ────────────────────────────────────────────
  '1-4-circular-measure': geogebraEntry(
    'Ccgmq82f',
    'Radians and the circle',
    'Arc length s = rθ — switch between degrees and radians (9709 1.4).'
  ),
  '2-5-integration': geogebraEntry(
    'eMd42deT',
    'Integral as area',
    'P2 integration — signed area under curves and definite integrals (9709 2.5).'
  ),
  '2-6-numerical-solution-of-equations': geogebraEntry(
    'dw8UVau8',
    'Root-finding graph',
    'P2 iteration — locate roots where f(x) = 0 (9709 2.6).'
  ),
  '5-4-discrete-random-variables': geogebraEntry(
    'm5JhJ2Rk',
    'Discrete distribution',
    'Probability distribution table — E(X) and Var(X) (9709 5.4).'
  ),
  '6-1-the-poisson-distribution': geogebraEntry(
    'm5JhJ2Rk',
    'Poisson probabilities',
    'Rare events — P(X = r) with mean λ (9709 6.1).'
  ),

  // ── 9701 A Level batch 7 ───────────────────────────────────────────────
  '9-3-chemical-periodicity-of-other-elements': phetEntry(
    'build-an-atom',
    'Build an atom',
    'Compare groups across the table — transition metals and trends (9.3).'
  ),
  '25-1-acids-and-bases': phetEntry(
    'acid-base-solutions',
    'Acid–base solutions',
    'Ka, Kb, pH, and buffer behaviour — Brønsted–Lowry at A Level (25.1).'
  ),
  '25-2-partition-coefficients': phetEntry(
    'molecule-polarity',
    'Molecule polarity',
    'Solvent partitioning — polar vs non-polar distribution (25.2).'
  ),
  '26-1-simple-rate-equations-orders-of-reaction-and-rate-constants': phetEntry(
    'reactants-products-and-leftovers',
    'Reactants and rate',
    'Concentration effects on rate — orders from experiment (26.1).'
  ),

  // ── 9708 A Level macro batch 7 ─────────────────────────────────────────
  '8-1-government-policies-to-achieve-efficient-resource-allocation-and-correct-market-failure':
    geogebraEntry(
      'SnqQmKsq',
      'Policy and welfare',
      'Tax/subsidy shifts MSC toward social optimum (9708 8.1).'
    ),
  '8-2-equity-and-redistribution-of-income-and-wealth': geogebraEntry(
    'gvkgx8ga',
    'Income distribution',
    'Progressive tax and transfers — equity vs efficiency trade-off (9708 8.2).'
  ),
  '9-1-the-circular-flow-of-income': geogebraEntry(
    'gvkgx8ga',
    'Circular flow AD',
    'Injections and withdrawals — link to aggregate demand (9708 9.1).'
  ),
  '9-2-economic-growth-and-sustainability': geogebraEntry(
    'gvkgx8ga',
    'LRAS and growth',
    'Rightward LRAS — sustainable growth vs resource limits (9708 9.2).'
  ),

  // ── 9709 S2 completion batch 8 ───────────────────────────────────────────
  '6-2-linear-combinations-of-random-variables': geogebraEntry(
    'm5JhJ2Rk',
    'Linear combinations',
    'E(aX + bY) and Var(aX + bY) — independent X, Y (9709 6.2).'
  ),
  '6-3-continuous-random-variables': geogebraEntry(
    'm5JhJ2Rk',
    'Continuous distribution',
    'PDF, CDF, and probability as area (9709 6.3).'
  ),
  '6-4-sampling-and-estimation': geogebraEntry(
    'm5JhJ2Rk',
    'Sampling distribution',
    'Sample mean distribution and confidence intervals (9709 6.4).'
  ),
  '6-5-hypothesis-tests': geogebraEntry(
    'm5JhJ2Rk',
    'Hypothesis testing',
    'Null vs alternative — critical region and p-values (9709 6.5).'
  ),

  // ── 9708 A Level macro batch 8 ───────────────────────────────────────────
  '9-3-employment-unemployment': geogebraEntry(
    'gvkgx8ga',
    'Labour market AD–AS',
    'Unemployment types — link output gap to macro equilibrium (9708 9.3).'
  ),
  '9-4-money-and-banking': geogebraEntry(
    'gvkgx8ga',
    'Money and AD',
    'Credit creation and interest rate transmission (9708 9.4).'
  ),
  '10-1-government-macroeconomic-policy-objectives': geogebraEntry(
    'gvkgx8ga',
    'Macro objectives',
    'Growth, inflation, employment, BOP — trade-offs on AD–AS (9708 10.1).'
  ),
  '10-2-links-between-macroeconomic-problems-and-their-interrelatedness': geogebraEntry(
    'gvkgx8ga',
    'Interconnected macro problems',
    'Inflation vs unemployment — Phillips curve tension (9708 10.2).'
  ),
  '10-3-effectiveness-of-policy-options-to-meet-all-macroeconomic-objectives': geogebraEntry(
    'gvkgx8ga',
    'Policy trade-offs',
    'Can one policy meet all objectives simultaneously? (9708 10.3).'
  ),

  // ── 9701 A Level batch 8 ─────────────────────────────────────────────────
  '26-2-homogeneous-and-heterogeneous-catalysts': phetEntry(
    'reactants-products-and-leftovers',
    'Catalyst and rate',
    'Same phase vs surface catalysis — alternative pathway (26.2).'
  ),
  '28-1-general-physical-and-chemical-properties-of-the-first-row-of-transition-elements-titanium-to-copper':
    phetEntry(
      'build-an-atom',
      'Build an atom',
      'd-block trends Ti→Cu — variable oxidation states (28.1).'
    ),
  '29-3-shapes-of-aromatic-organic-molecules-and-bonds': phetEntry(
    'build-a-molecule',
    'Build a molecule',
    'Benzene ring — σ framework and π delocalisation (29.3).'
  ),
  '29-4-isomerism-optical': phetEntry(
    'build-a-molecule',
    'Build a molecule',
    'Chiral centre — non-superimposable mirror images (29.4).'
  ),

  // ── 9701 transition & organic A Level batch 9 ────────────────────────────
  '28-2-general-characteristic-chemical-properties-of-the-first-set-of-transition-elements-titanium-to-copper':
    phetEntry(
      'reactants-products-and-leftovers',
      'Transition metal reactions',
      'Redox, complex formation, and ligand exchange Ti→Cu (28.2).'
    ),
  '28-3-colour-of-complexes': phetEntry(
    'build-an-atom',
    'Build an atom',
    'd–d transitions — split d orbitals and complementary colour (28.3).'
  ),
  '28-4-stereoisomerism-in-transition-element-complexes': phetEntry(
    'build-a-molecule',
    'Build a molecule',
    'Cis/trans and optical isomerism in octahedral complexes (28.4).'
  ),
  '28-5-stability-constants-kstab': phetEntry(
    'acid-base-solutions',
    'Complex equilibria',
    'Ligand substitution and Kstab — stable complex formation (28.5).'
  ),
  '29-1-formulas-functional-groups-and-the-naming-of-organic-compounds': phetEntry(
    'build-a-molecule',
    'Build a molecule',
    'Identify functional groups — IUPAC naming practice (29.1).'
  ),
  '29-2-characteristic-organic-reactions': phetEntry(
    'build-a-molecule',
    'Build a molecule',
    'Reaction types by functional group — A Level organic toolkit (29.2).'
  ),
  '30-1-arenes': phetEntry(
    'build-a-molecule',
    'Build a molecule',
    'Electrophilic substitution on benzene — nitration and halogenation (30.1).'
  ),

  // ── 9708 development economics batch 9 ─────────────────────────────────
  '11-1-policies-to-correct-disequilibrium-in-the-balance-of-payments': geogebraEntry(
    'gvkgx8ga',
    'BOP correction policies',
    'Expenditure-switching and reducing policies (9708 11.1).'
  ),
  '11-3-economic-development': geogebraEntry(
    'gvkgx8ga',
    'Development and LRAS',
    'Human capital and infrastructure — long-run growth (9708 11.3).'
  ),
  '11-4-characteristics-of-countries-at-different-levels-of-development': geogebraEntry(
    'SnqQmKsq',
    'Development indicators',
    'Compare HDI, GDP per capita, and structural change (9708 11.4).'
  ),
  '11-5-relationship-between-countries-at-different-levels-of-development': geogebraEntry(
    'VGWtkPU5',
    'Trade and development',
    'Terms of trade and dependency between economies (9708 11.5).'
  ),
  '11-6-globalisation': geogebraEntry(
    'VGWtkPU5',
    'Globalisation flows',
    'Trade, capital, and labour mobility across borders (9708 11.6).'
  ),

  // ── 9701 organic A Level batch 10 ──────────────────────────────────────
  '27-1-similarities-and-trends-in-the-properties-of-the-group-2-metals-magnesium-to-barium-and-their-compounds':
    phetEntry(
      'reactants-products-and-leftovers',
      'Group 2 A Level',
      'A Level Group 2 trends — solubility and thermal decomposition (27.1).'
    ),
  '31-1-halogen-compounds': phetEntry(
    'build-a-molecule',
    'Build a molecule',
    'Halogenoarenes and aryl halides — SN mechanisms at A Level (31.1).'
  ),
  '32-2-phenol': phetEntry(
    'build-a-molecule',
    'Build a molecule',
    'Phenol acidity and electrophilic substitution on the ring (32.2).'
  ),
  '33-3-acyl-chlorides': phetEntry(
    'build-a-molecule',
    'Build a molecule',
    'Acyl chloride reactions — amides, esters, and Friedel–Crafts (33.3).'
  ),
  '34-4-amino-acids': phetEntry(
    'build-a-molecule',
    'Build a molecule',
    'Zwitterions, peptide bonds, and protein structure (34.4).'
  ),
  '35-1-condensation-polymerisation': phetEntry(
    'build-a-molecule',
    'Build a molecule',
    'Polyesters and polyamides — repeat units with linkages (35.1).'
  ),

  // ── 9708 micro & macro batch 10 ────────────────────────────────────────
  '7-1-utility': geogebraEntry(
    'SnqQmKsq',
    'Utility and demand',
    'Marginal utility and downward-sloping demand (9708 7.1).'
  ),
  '7-5-types-of-cost-revenue-and-profit-short-run-and-long-run-production': geogebraEntry(
    'SnqQmKsq',
    'Cost curves',
    'MC, ATC, economies of scale — SR and LR (9708 7.5).'
  ),
  '7-7-growth-and-survival-of-firms': geogebraEntry(
    'VGWtkPU5',
    'Firm growth',
    'Integration and diversification strategies (9708 7.7).'
  ),
  '8-3-labour-market-forces-and-government-intervention': geogebraEntry(
    'gvkgx8ga',
    'Labour market',
    'Wage determination and minimum wage effects (9708 8.3).'
  ),
  '11-2-exchange-rates': geogebraEntry(
    'VGWtkPU5',
    'A Level exchange rates',
    'Managed floats, currency unions, and policy (9708 11.2).'
  ),
  '15-2-boolean-algebra-and-logic-circuits': geogebraEntry(
    'kQBWnCFC',
    'Boolean logic circuits',
    'Karnaugh maps and logic simplification (9618 15.2).'
  ),

  // ── 9701 organic A Level batch 11 ──────────────────────────────────────
  '32-1-alcohols': phetEntry(
    'build-a-molecule',
    'Build a molecule',
    'Primary, secondary, tertiary alcohols and oxidation routes (32.1).'
  ),
  '33-1-carboxylic-acids': phetEntry(
    'build-a-molecule',
    'Build a molecule',
    'Carboxylic acid structure, acidity, and salt formation (33.1).'
  ),
  '33-2-esters': phetEntry(
    'build-a-molecule',
    'Build a molecule',
    'Esterification and hydrolysis under acid or alkali (33.2).'
  ),
  '34-1-primary-and-secondary-amines': phetEntry(
    'build-a-molecule',
    'Build a molecule',
    'Amine basicity and nucleophilic reactions (34.1).'
  ),
  '34-2-phenylamine-and-azo-compounds': phetEntry(
    'build-a-molecule',
    'Build a molecule',
    'Diazonium salts and azo dye coupling (34.2).'
  ),
  '34-3-amides': phetEntry(
    'build-a-molecule',
    'Build a molecule',
    'Amide formation and hydrolysis (34.3).'
  ),
  '35-2-predicting-the-type-of-polymerisation': phetEntry(
    'build-a-molecule',
    'Build a molecule',
    'Addition vs condensation from monomer functional groups (35.2).'
  ),

  // ── 9708 foundations & firm objectives batch 11 ──────────────────────────
  '7-8-differing-objectives-and-policies-of-firms': geogebraEntry(
    'SnqQmKsq',
    'Firm objectives',
    'Profit maximisation vs sales, growth, and satisficing (9708 7.8).'
  ),
  '1-2-economic-methodology': geogebraEntry(
    'SnqQmKsq',
    'Positive vs normative',
    'Ceteris paribus and model assumptions (9708 1.2).'
  ),
  '1-3-factors-of-production': geogebraEntry(
    'SnqQmKsq',
    'Factors of production',
    'Land, labour, capital, enterprise — rewards and mobility (9708 1.3).'
  ),
  '1-4-resource-allocation-in-different-economic-systems': geogebraEntry(
    'VGWtkPU5',
    'Economic systems',
    'Market, planned, and mixed economies (9708 1.4).'
  ),
  '2-3-price-elasticity-of-supply': geogebraEntry(
    'SnqQmKsq',
    'PES',
    'Elastic vs inelastic supply — spare capacity and time (9708 2.3).'
  ),

  // ── 9618 batch 11 ──────────────────────────────────────────────────────
  '15-1-processors-parallel-processing-and-virtual-machines': geogebraEntry(
    'kQBWnCFC',
    'Parallel processing',
    'Pipelining, multi-core, and virtual machines (9618 15.1).'
  ),

  // ── 9701 polymers, synthesis & analytical batch 12 ─────────────────────
  '35-3-degradable-polymers': phetEntry(
    'build-a-molecule',
    'Build a molecule',
    'Biodegradable vs persistent polymers — environmental impact (35.3).'
  ),
  '36-1-organic-synthesis': phetEntry(
    'build-a-molecule',
    'Build a molecule',
    'Multi-step routes and functional group interconversions (36.1).'
  ),
  '37-1-thin-layer-chromatography': phetEntry(
    'build-a-molecule',
    'Build a molecule',
    'Rf values and separation by polarity (37.1).'
  ),
  '37-2-gas-liquid-chromatography': phetEntry(
    'build-a-molecule',
    'Build a molecule',
    'Retention time and stationary/mobile phases (37.2).'
  ),
  '37-3-carbon-13-nmr-spectroscopy': phetEntry(
    'build-a-molecule',
    'Build a molecule',
    '¹³C environments and peak splitting patterns (37.3).'
  ),
  '37-4-proton-h-nmr-spectroscopy': phetEntry(
    'build-a-molecule',
    'Build a molecule',
    'Chemical shift, integration, and splitting (37.4).'
  ),

  // ── 9708 intervention & welfare batch 12 ───────────────────────────────
  '1-6-classification-of-goods-and-services': geogebraEntry(
    'SnqQmKsq',
    'Types of goods',
    'Public, private, merit, and demerit goods (9708 1.6).'
  ),
  '2-5-consumer-and-producer-surplus': geogebraEntry(
    'SnqQmKsq',
    'Consumer surplus',
    'Area between demand curve and price (9708 2.5).'
  ),
  '3-1-reasons-for-government-intervention-in-markets': geogebraEntry(
    'gvkgx8ga',
    'Market failure',
    'Externalities, public goods, and information failure (9708 3.1).'
  ),
  '3-2-methods-and-effects-of-government-intervention-in-markets': geogebraEntry(
    'gvkgx8ga',
    'Government intervention',
    'Taxes, subsidies, regulation, and price controls (9708 3.2).'
  ),
  '3-3-addressing-income-and-wealth-inequality': geogebraEntry(
    'VGWtkPU5',
    'Inequality',
    'Progressive tax, benefits, and minimum wage (9708 3.3).'
  ),

  // ── 9618 batch 12 ──────────────────────────────────────────────────────
  '19-1-algorithms': geogebraEntry(
    'kQBWnCFC',
    'Algorithm design',
    'Searching, sorting, and stepwise logic (9618 19.1).'
  ),

  // ── 9708 macro completion batch 13 ───────────────────────────────────────
  '4-1-national-income-statistics': geogebraEntry(
    'VGWtkPU5',
    'National income',
    'GDP, GNI, and measurement approaches (9708 4.1).'
  ),
  '4-2-introduction-to-the-circular-flow-of-income': geogebraEntry(
    'gvkgx8ga',
    'Circular flow AS',
    'Households, firms, government, and injections/withdrawals (9708 4.2).'
  ),
  '5-1-government-macroeconomic-policy-objectives': geogebraEntry(
    'VGWtkPU5',
    'Macro objectives',
    'Growth, employment, inflation, BOP balance (9708 5.1).'
  ),
  '6-5-policies-to-correct-imbalances-in-the-current-account-of-the-balance-of-payments': geogebraEntry(
    'VGWtkPU5',
    'BOP correction AS',
    'Expenditure-reducing and switching policies (9708 6.5).'
  ),

  // ── 9701 atomic structure & bonding batch 13 ─────────────────────────────
  '1-3-electrons-energy-levels-and-atomic-orbitals': phetEntry(
    'build-an-atom',
    'Build an Atom',
    'Shells, subshells, and orbital filling (9701 1.3).'
  ),
  '1-4-ionisation-energy': phetEntry(
    'build-an-atom',
    'Build an Atom',
    'First IE trends across periods and groups (9701 1.4).'
  ),
  '3-2-ionic-bonding': phetEntry(
    'build-an-atom',
    'Build an Atom',
    'Electron transfer and giant ionic lattices (9701 3.2).'
  ),
  '3-3-metallic-bonding': phetEntry(
    'build-an-atom',
    'Build an Atom',
    'Delocalised electrons and metallic properties (9701 3.3).'
  ),
  '13-1-formulas-functional-groups-and-the-naming-of-organic-compounds': phetEntry(
    'build-a-molecule',
    'Build a molecule',
    'IUPAC naming and functional group recognition (9701 13.1).'
  ),
  '13-2-characteristic-organic-reactions': phetEntry(
    'build-a-molecule',
    'Build a molecule',
    'Substitution, addition, and elimination patterns (9701 13.2).'
  ),

  // ── 9701 AS completion batch 14 ────────────────────────────────────────
  '2-1-relative-masses-of-atoms-and-molecules': phetEntry(
    'balancing-chemical-equations',
    'Balancing Chemical Equations',
    'Relative atomic mass and formula mass (9701 2.1).'
  ),
  '2-4-reacting-masses-and-volumes-of-solutions-and-gases': phetEntry(
    'reactants-products-and-leftovers',
    'Reactants, Products and Leftovers',
    'Mole ratios, gas volumes, and solution calculations (9701 2.4).'
  ),
  '3-6-intermolecular-forces-electronegativity-and-bond-properties': phetEntry(
    'molecule-polarity',
    'Molecule Polarity',
    'Hydrogen bonding, dipole–dipole, and van der Waals (9701 3.6).'
  ),
  '3-7-dot-and-cross-diagrams': phetEntry(
    'build-an-atom',
    'Build an Atom',
    'Dot-and-cross diagrams for ionic and covalent species (9701 3.7).'
  ),
  '4-2-bonding-and-structure': phetEntry(
    'states-of-matter-basics',
    'States of Matter',
    'Giant vs simple structures and properties (9701 4.2).'
  ),
  '8-3-homogeneous-and-heterogeneous-catalysts': phetEntry(
    'reactants-products-and-leftovers',
    'Catalysts',
    'Homogeneous and heterogeneous catalysis (9701 8.3).'
  ),
  '11-1-physical-properties-of-the-group-17-elements': phetEntry(
    'build-an-atom',
    'Build an Atom',
    'Halogen trends — colour, volatility, and bond strength (9701 11.1).'
  ),
  '19-2-nitriles-and-hydroxynitriles': phetEntry(
    'build-a-molecule',
    'Build a molecule',
    'Nitrile formation and hydroxynitrile addition (9701 19.2).'
  ),

  // ── 9618 completion batch 14 ─────────────────────────────────────────────
  '3-1-computers-and-their-components': geogebraEntry(
    'kQBWnCFC',
    'Computer components',
    'CPU, memory, storage, and I/O devices (9618 3.1).'
  ),
  '4-3-bit-manipulation': geogebraEntry(
    'kQBWnCFC',
    'Bit manipulation',
    'Binary shifts, masks, and logical operations (9618 4.3).'
  ),

  // ── 9618 / 9701 / 9702 pilot completion ─────────────────────────────────
  '2-1-networks-including-the-internet': geogebraEntry(
    'kQBWnCFC',
    'Networks and packet flow',
    'Trace how packets route between nodes — compare with circuit switching (9618 2.1).'
  ),
  '16-1-purposes-of-an-operating-system-os': geogebraEntry(
    'kQBWnCFC',
    'Operating system roles',
    'Resource management: CPU scheduling, memory, and I/O abstraction (9618 16.1).'
  ),
  '16-2-translation-software': geogebraEntry(
    'kQBWnCFC',
    'Translators and execution',
    'Compare compiler, interpreter, and assembler pipelines (9618 16.2).'
  ),
  '22-1-infrared-spectroscopy': phetEntry(
    'molecule-polarity',
    'Molecular vibrations',
    'Polar bonds absorb IR — link wavenumber to functional groups (9701 22.1).'
  ),
  '22-2-mass-spectrometry': phetEntry(
    'build-an-atom',
    'Isotopes and mass number',
    'Relate isotope patterns to molecular fragments and m/z (9701 22.2).'
  ),
  '8-2-diffraction': phetEntry(
    'wave-interference',
    'Single-slit diffraction',
    'Spreading through a narrow slit — compare with double-slit interference (9702 8.2).'
  ),

  // ── 9618 completion batch 15 ─────────────────────────────────────────────
  '1-2-1-multimedia-graphics': geogebraEntry(
    'kQBWnCFC',
    'Bitmap and vector graphics',
    'Compare resolution, colour depth, and file size for raster vs vector images (9618 1.2.1).'
  ),
  '1-2-2-multimedia-sound': phetEntry(
    'sound-waves',
    'Sound waves',
    'Sampling rate, bit depth, and compression — link waveform to file size (9618 1.2.2).'
  ),
  '6-1-data-security': geogebraEntry(
    'kQBWnCFC',
    'Data security controls',
    'Access rights, authentication, and backup strategies (9618 6.1).'
  ),
  '7-1-ethics-and-ownership': geogebraEntry(
    'kQBWnCFC',
    'Ethics and IP',
    'Copyright, licensing, and professional conduct in software (9618 7.1).'
  ),
  '8-1-database-concepts': geogebraEntry(
    'kQBWnCFC',
    'Relational database model',
    'Tables, keys, and entity–relationship design (9618 8.1).'
  ),
  '10-1-data-types-and-records': geogebraEntry(
    'kQBWnCFC',
    'Data types and records',
    'INTEGER, REAL, CHAR, BOOLEAN — composite record structures (9618 10.1).'
  ),
  '10-2-arrays': geogebraEntry(
    'kQBWnCFC',
    'Arrays and lists',
    'Index, bounds, and 1D vs 2D array traversal (9618 10.2).'
  ),
  '10-3-files': geogebraEntry(
    'kQBWnCFC',
    'File handling',
    'Sequential vs random access; read, write, and append operations (9618 10.3).'
  ),
  '11-1-programming-basics': geogebraEntry(
    'kQBWnCFC',
    'Programming fundamentals',
    'Variables, assignment, and basic I/O in pseudocode (9618 11.1).'
  ),
  '11-2-constructs': geogebraEntry(
    'kQBWnCFC',
    'Selection and iteration',
    'IF/CASE, FOR/WHILE/REPEAT — trace control flow (9618 11.2).'
  ),
  '12-1-program-development-life-cycle': geogebraEntry(
    'kQBWnCFC',
    'SDLC stages',
    'Analysis → design → coding → testing → maintenance (9618 12.1).'
  ),
  '12-3-program-testing-and-maintenance': geogebraEntry(
    'kQBWnCFC',
    'Testing and maintenance',
    'Alpha/beta testing, stub drivers, and corrective vs adaptive maintenance (9618 12.3).'
  ),
  '13-3-floating-point-numbers-representation-and-manipulation': geogebraEntry(
    'kQBWnCFC',
    'Floating-point representation',
    'Mantissa, exponent, normalisation, and rounding errors (9618 13.3).'
  ),
  '17-1-encryption-encryption-protocols-and-digital-certificates': geogebraEntry(
    'kQBWnCFC',
    'Encryption and certificates',
    'Symmetric vs asymmetric keys, hashing, and PKI (9618 17.1).'
  ),
  '18-1-artificial-intelligence-ai': geogebraEntry(
    'kQBWnCFC',
    'AI concepts',
    'Expert systems, machine learning overview, and inference (9618 18.1).'
  ),
  '20-1-programming-paradigms': geogebraEntry(
    'kQBWnCFC',
    'Programming paradigms',
    'Low-level vs high-level, procedural, OOP, and declarative styles (9618 20.1).'
  ),
}

export function getCatalogInteractiveEmbed(slug: string): LessonInteractiveEmbed | undefined {
  if (INTERACTIVE_EMBED_CATALOG[slug]) return INTERACTIVE_EMBED_CATALOG[slug]
  const alias = resolveVisualCatalogSlug(slug)
  if (alias !== slug) return INTERACTIVE_EMBED_CATALOG[alias]
  return undefined
}

export function resolveLessonInteractiveEmbed(
  lesson: CourseLesson
): LessonInteractiveEmbed | null {
  if (lesson.interactiveEmbed?.embedUrl) {
    return (
      preferNativeDiagramOverPlaceholder(lesson.slug, lesson.interactiveEmbed) ?? null
    )
  }
  const inline = lesson.sections.find((s) => s.type === 'interactive')
  if (inline?.type === 'interactive') {
    return preferNativeDiagramOverPlaceholder(lesson.slug, inline.embed) ?? null
  }
  const catalog =
    INTERACTIVE_EMBED_CATALOG[lesson.slug] ?? getCatalogInteractiveEmbed(lesson.slug)
  return preferNativeDiagramOverPlaceholder(lesson.slug, catalog) ?? null
}

export function isCheerpjEmbedUrl(url: string): boolean {
  return url.includes('/sims/cheerpj/')
}

/** When to show a “still loading” hint (ms). CheerpJ Java sims need longer. */
export function embedSlowLoadHintMs(url: string): number {
  return isCheerpjEmbedUrl(url) ? 5_000 : 8_000
}

export function resolveEmbedLaunchUrl(embed: LessonInteractiveEmbed): string | null {
  if (embed.launchUrl) return embed.launchUrl
  if (embed.provider === 'phet') {
    const cheerpj = embed.embedUrl.match(/\/sims\/cheerpj\/([^/]+)\//)
    if (cheerpj) return phetSimPageUrl(cheerpj[1])
    const html5 = embed.embedUrl.match(/\/sims\/html\/([^/]+)\//)
    if (html5) return phetSimPageUrl(html5[1])
  }
  if (embed.provider === 'geogebra') {
    const material = embed.embedUrl.match(/[?&]material=([^&]+)/)
    if (material) return geogebraMaterialPageUrl(material[1])
  }
  return embed.attribution.sourceUrl ?? null
}

export function lessonHasInteractiveEmbed(lesson: CourseLesson): boolean {
  return resolveLessonInteractiveEmbed(lesson) !== null
}
