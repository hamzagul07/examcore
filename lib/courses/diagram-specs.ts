import { resolveVisualCatalogSlug } from '@/lib/courses/visual-slug-aliases'
import { GENERATED_SUBJECT_SPECS } from '@/lib/courses/generated/subject-visuals'

export type DiagramParamSpec = {
  id: string
  label: string
  min: number
  max: number
  step: number
  default: number
  unit?: string
}

export type DiagramStepState = {
  /** Diagram layer ids to emphasize — diagram components interpret these. */
  focus: string[]
  caption?: string
  /** Shown above PhET/GeoGebra when steps are synced with an embed. */
  embedHint?: string
}

export type LessonDiagramSpec = {
  params?: DiagramParamSpec[]
  steps: DiagramStepState[]
}

/** Four step-synced captions + embed hints for embed-first topics (no native SVG). */
function embedSpec(
  steps: { caption: string; embedHint: string }[]
): LessonDiagramSpec {
  return {
    steps: steps.map((s, i) => ({
      focus: [`step-${i + 1}`],
      caption: s.caption,
      embedHint: s.embedHint,
    })),
  }
}

/** Demographic transition model — reveal the causal order rate-by-rate. */
const DTM_SPEC: LessonDiagramSpec = {
  steps: [
    {
      focus: ['death', 'stages'],
      caption: 'Death rate falls first — clean water, food security and medicine cut mortality (stage 2).',
    },
    {
      focus: ['birth', 'death', 'stages'],
      caption: 'Birth rate falls later, once children are less of an economic necessity and contraception spreads (stage 3).',
    },
    {
      focus: ['natural-increase', 'birth', 'death'],
      caption: 'The gap between the two rates is natural increase — widest through stages 2–3, which is why population booms.',
    },
    {
      focus: ['population', 'stages'],
      caption: 'Total population surges through the transition, then levels off (or falls) once both rates settle low.',
    },
  ],
}

const SPECS: Record<string, LessonDiagramSpec> = {
  '1-1-population-and-economic-development-patterns': DTM_SPEC,
  '1-2-changing-populations': DTM_SPEC,
  // Step-animation for diagrams that had the layer structure but no spec, so
  // they rendered flat. Cumulative focus — each step adds a layer, keeping the
  // earlier ones bright. These are the DEFAULT_SLUGs, so the mapped IB lessons
  // (abnormal psychology, respiration) inherit the animation too.
  '1-1-1-diagnostic-criteria-for-schizophrenia': {
    steps: [
      { focus: ['step-1'], caption: 'Diagnosis starts from a checklist of agreed, observable symptoms.' },
      { focus: ['step-1', 'step-2'], caption: 'Meeting the DSM-5 / ICD-11 criteria gives a reliable, shared diagnosis.' },
    ],
  },
  '1-1-2-explanations-of-schizophrenia': {
    steps: [
      { focus: ['step-1'], caption: 'Everyone carries some vulnerability — a genetic or early-life predisposition.' },
      { focus: ['step-1', 'step-2'], caption: 'Life stress adds to it; together they can push the total past the disorder threshold.' },
      { focus: ['step-1', 'step-2', 'step-3'], caption: 'Low vulnerability needs high stress to trigger onset — and vice versa.' },
    ],
  },
  '1-1-3-treatment-and-management-of-schizophrenia': {
    steps: [
      { focus: ['step-1'], caption: 'Treatment combines biological, psychological and social approaches.' },
      { focus: ['step-1', 'step-2'], caption: 'Together they support recovery and management better than any single approach.' },
    ],
  },
  '12-2-respiration': {
    steps: [
      { focus: ['step-1'], caption: 'Aerobic respiration oxidises glucose: glucose + O₂ → CO₂ + H₂O + ATP.' },
      { focus: ['step-1', 'step-2'], caption: 'It runs in stages — glycolysis, the link reaction, the Krebs cycle and oxidative phosphorylation.' },
      { focus: ['step-1', 'step-2', 'step-3'], caption: 'Yielding ~32 ATP per glucose, most of it made on the inner mitochondrial membrane.' },
    ],
  },
  '13-3-gravitational-field-of-a-point-mass': {
    params: [
      { id: 'M', label: 'Mass M', min: 1, max: 10, step: 1, default: 5, unit: '×10²⁴ kg' },
      { id: 'r', label: 'Distance r', min: 55, max: 95, step: 5, default: 75, unit: 'km scale' },
    ],
    steps: [
      {
        focus: ['mass'],
        caption: 'A point mass M creates a gravitational field in the space around it.',
        embedHint: 'Set one mass to zero — the other still feels a pull. Mass creates the field.',
      },
      {
        focus: ['field-lines'],
        caption: 'Field lines point toward M; density shows how strong g is at each point.',
        embedHint: 'Turn on “Field” vectors — notice they point inward and get weaker with distance.',
      },
      {
        focus: ['field-strength'],
        caption: 'Field strength g = GM/r² decreases with the square of distance.',
        embedHint: 'Halve the separation — force becomes four times larger (inverse-square law).',
      },
      {
        focus: ['force'],
        caption: 'A test mass m feels F = GmM/r² — Newton’s law of gravitation.',
        embedHint: 'Read off the force magnitude and check F ∝ 1/r² for fixed masses.',
      },
    ],
  },
  '8-4-the-diffraction-grating': {
    params: [
      { id: 'slit', label: 'Slit width a', min: 12, max: 36, step: 2, default: 20, unit: 'μm' },
      { id: 'lambda', label: 'Wavelength λ', min: 400, max: 700, step: 50, default: 550, unit: 'nm' },
    ],
    steps: [
      {
        focus: ['slit'],
        caption: 'A grating is many identical slits — each acts as a secondary source.',
        embedHint: 'Open “Light” mode — each slit behaves like a point source of waves.',
      },
      {
        focus: ['spread'],
        caption: 'Diffraction spreads waves after each slit; narrower slits spread more.',
        embedHint: 'Compare one slit vs two — see how the pattern changes with slit count.',
      },
      {
        focus: ['interference'],
        caption: 'Waves from all slits superpose — path difference sets maxima and minima.',
        embedHint: 'Watch bright fringes where path difference = nλ (constructive interference).',
      },
      {
        focus: ['grating'],
        caption: 'A grating gives sharp, evenly spaced maxima: d sin θ = nλ.',
        embedHint: 'Increase slit count — maxima become sharper (better resolution).',
      },
    ],
  },
  '10-1-practical-circuits': {
    params: [
      { id: 'R1', label: 'R₁', min: 2, max: 12, step: 1, default: 4, unit: 'Ω' },
      { id: 'R2', label: 'R₂', min: 2, max: 12, step: 1, default: 6, unit: 'Ω' },
    ],
    steps: [
      {
        focus: ['supply'],
        caption: 'A power supply provides the e.m.f. that drives charge around the circuit.',
        embedHint: 'Drag out a battery — this is your e.m.f. source (10.1).',
      },
      {
        focus: ['series'],
        caption: 'In series, the same current I flows through every component.',
        embedHint: 'Build a series loop — ammeters in different positions read the same value.',
      },
      {
        focus: ['pd'],
        caption: 'Potential difference (p.d.) is the energy per unit charge across a component.',
        embedHint: 'Place voltmeters across each resistor — p.d.s add up to supply voltage.',
      },
      {
        focus: ['measure'],
        caption: 'Practical work: measure I and V, then calculate R = V/I for each resistor.',
        embedHint: 'Use the multimeter — record I and V, then verify R = V/I.',
      },
    ],
  },
  '15-3-kinetic-theory-of-gases': {
    params: [
      { id: 'T', label: 'Temperature T', min: 200, max: 600, step: 50, default: 300, unit: 'K' },
      { id: 'n', label: 'Amount n', min: 1, max: 5, step: 1, default: 2, unit: 'mol' },
    ],
    steps: [
      {
        focus: ['particles'],
        caption: 'Gas particles move randomly — collisions with walls create pressure.',
        embedHint: 'Watch individual particles — random motion in all directions.',
      },
      {
        focus: ['speed'],
        caption: 'Higher temperature means faster average particle speed.',
        embedHint: 'Heat the gas — particle speed distribution shifts upward.',
      },
      {
        focus: ['pressure'],
        caption: 'More frequent, harder wall collisions raise pressure p.',
        embedHint: 'Read pressure gauge as you change temperature at fixed volume.',
      },
      {
        focus: ['ideal'],
        caption: 'Ideal gas law: pV = nRT links p, V, n, and absolute temperature T.',
        embedHint: 'Fix n and track p vs T — confirm p ∝ T (in kelvin).',
      },
    ],
  },
  '1-7-differentiation': {
    params: [
      { id: 'n', label: 'Power n', min: 1, max: 4, step: 1, default: 2 },
      { id: 'x0', label: 'Point x₀', min: 1, max: 4, step: 0.5, default: 2 },
    ],
    steps: [
      {
        focus: ['curve'],
        caption: 'A function y = f(x) has a gradient that varies along the curve.',
        embedHint: 'Move the point along the curve — watch the x-coordinate change.',
      },
      {
        focus: ['tangent'],
        caption: 'The tangent line at a point shows the instantaneous gradient dy/dx.',
        embedHint: 'Enable the tangent — its slope equals the derivative at that point.',
      },
      {
        focus: ['gradient'],
        caption: 'Where the curve is steep, |dy/dx| is large; at a turning point, dy/dx = 0.',
        embedHint: 'Pause at a maximum — tangent becomes horizontal (gradient zero).',
      },
      {
        focus: ['rule'],
        caption: 'Power rule: if y = xⁿ then dy/dx = nxⁿ⁻¹ (9709 1.7).',
        embedHint: 'Compare the numeric gradient with nxⁿ⁻¹ for a power function.',
      },
    ],
  },
  '8-3-interference': {
    params: [
      { id: 'lambda', label: 'Wavelength λ', min: 400, max: 700, step: 50, default: 550, unit: 'nm' },
    ],
    steps: [
      {
        focus: ['sources'],
        caption: 'Two coherent sources emit waves in phase.',
        embedHint: 'Enable both sources — they must be coherent for a stable fringe pattern.',
      },
      {
        focus: ['path'],
        caption: 'Path difference Δx determines whether waves arrive in phase.',
        embedHint: 'Compare path lengths from each source to a point on the screen.',
      },
      {
        focus: ['bright'],
        caption: 'Constructive: Δx = nλ → bright fringe.',
        embedHint: 'Find points where crest meets crest — bright fringes.',
      },
      {
        focus: ['dark'],
        caption: 'Destructive: Δx = (n + ½)λ → dark fringe.',
        embedHint: 'Find points where crest meets trough — dark fringes.',
      },
    ],
  },
  '17-1-simple-harmonic-oscillations': {
    params: [{ id: 'A', label: 'Amplitude A', min: 0.2, max: 1, step: 0.1, default: 0.6, unit: 'm' }],
    steps: [
      { focus: ['equilibrium'], caption: 'SHM: acceleration always points toward the equilibrium position.' },
      { focus: ['displacement'], caption: 'Displacement x varies sinusoidally with time.' },
      { focus: ['velocity'], caption: 'Velocity is greatest at equilibrium; zero at extremes.' },
      { focus: ['period'], caption: 'Period T is independent of amplitude (ideal spring).' },
    ],
  },
  '4-3-density-and-pressure': {
    params: [
      { id: 'h', label: 'Depth h', min: 1, max: 12, step: 1, default: 5, unit: 'm' },
      { id: 'rho', label: 'Density ρ', min: 800, max: 1200, step: 50, default: 1000, unit: 'kg m⁻³' },
    ],
    steps: [
      {
        focus: ['density'],
        caption: 'Density ρ = m/V — mass per unit volume (kg m⁻³).',
        embedHint: 'Compare block mass in the same volume — denser materials feel heavier.',
      },
      {
        focus: ['pressure'],
        caption: 'Pressure p = F/A — normal force per unit area (Pa = N m⁻²).',
        embedHint: 'Spread the same weight over a wider area — pressure drops.',
      },
      {
        focus: ['depth'],
        caption: 'In a fluid, pressure increases with depth: Δp = ρgh.',
        embedHint: 'Increase depth in the sim — read how gauge pressure grows linearly with h.',
      },
      {
        focus: ['absolute'],
        caption: 'Absolute pressure adds atmospheric pressure: p_total = p_atm + ρgh.',
        embedHint: 'Toggle units and compare gauge vs absolute at the same depth.',
      },
    ],
  },
  '3-5-integration': {
    params: [
      { id: 'a', label: 'Lower limit a', min: 0.5, max: 2.5, step: 0.5, default: 1 },
      { id: 'b', label: 'Upper limit b', min: 2.5, max: 5, step: 0.5, default: 4 },
    ],
    steps: [
      {
        focus: ['curve'],
        caption: 'Integration reverses differentiation — find the antiderivative F(x) with F′(x) = f(x).',
        embedHint: 'Drag the slider — watch how area accumulates as you change the upper limit.',
      },
      {
        focus: ['area'],
        caption: 'A definite integral ∫ₐᵇ f(x) dx equals the signed area under the curve.',
        embedHint: 'Shade the region between x = a and x = b — that area is the integral value.',
      },
      {
        focus: ['limits'],
        caption: 'Evaluate F(b) − F(a) after finding F(x); always substitute limits explicitly.',
        embedHint: 'Move both limits and read how the shaded area changes.',
      },
      {
        focus: ['parts'],
        caption: 'Integration by parts: ∫ u dv = uv − ∫ v du — choose u using LIATE.',
        embedHint: 'Compare area under a product function with the parts formula result.',
      },
    ],
  },
  '18-4-electric-field-of-a-point-charge': {
    params: [
      { id: 'Q', label: 'Charge Q', min: 1, max: 5, step: 1, default: 2, unit: 'nC scale' },
      { id: 'r', label: 'Distance r', min: 60, max: 110, step: 5, default: 95, unit: 'mm scale' },
    ],
    steps: [
      {
        focus: ['charge'],
        caption: 'An isolated point charge creates a radial electric field.',
        embedHint: 'Place a single point charge — field lines radiate from + or into −.',
      },
      {
        focus: ['field-lines'],
        caption: 'Field lines show direction; density indicates field strength.',
        embedHint: 'Toggle field vectors — notice spacing widens with distance.',
      },
      {
        focus: ['formula'],
        caption: 'Coulomb and field: E = kQ/r² for a point charge.',
        embedHint: 'Halve r — field strength should quadruple (inverse-square law).',
      },
      {
        focus: ['direction'],
        caption: 'Positive charge: lines point outward. Force on + test charge is tangent to lines.',
        embedHint: 'Place a test charge and read the force vector direction.',
      },
    ],
  },
  '22-2-photoelectric-effect': {
    params: [{ id: 'f', label: 'Frequency f', min: 400, max: 900, step: 50, default: 600, unit: 'THz scale' }],
    steps: [
      {
        focus: ['photon'],
        caption: 'Light delivers energy in photons: E = hf (quantum model).',
        embedHint: 'Increase photon energy (frequency) — each photon carries more energy.',
      },
      {
        focus: ['surface'],
        caption: 'Electrons are bound by work function Φ — minimum energy to escape the metal.',
        embedHint: 'Read the work function for each metal target.',
      },
      {
        focus: ['electron'],
        caption: 'If hf > Φ, electrons are emitted with KEmax = hf − Φ.',
        embedHint: 'Above threshold frequency, electrons appear — measure their maximum KE.',
      },
      {
        focus: ['formula'],
        caption: 'Brighter light (higher intensity) increases rate, not KEmax — classic exam trap.',
        embedHint: 'Raise intensity only — more electrons, same maximum KE.',
      },
    ],
  },
  '19-3-discharging-a-capacitor': {
    params: [
      { id: 'R', label: 'Resistance R', min: 5, max: 20, step: 1, default: 10, unit: 'kΩ' },
      { id: 'C', label: 'Capacitance C', min: 50, max: 200, step: 10, default: 100, unit: 'μF' },
    ],
    steps: [
      {
        focus: ['capacitor'],
        caption: 'A charged capacitor stores energy; discharge through a resistor.',
        embedHint: 'Charge the capacitor, then connect it through a resistor.',
      },
      {
        focus: ['curve'],
        caption: 'Capacitor p.d. V decays exponentially: V = V₀e^(−t/RC).',
        embedHint: 'Plot voltage vs time — exponential decay, not linear.',
      },
      {
        focus: ['formula'],
        caption: 'Time constant τ = RC — time to fall to ~37% of V₀.',
        embedHint: 'Increase R or C — decay becomes slower (larger τ).',
      },
      {
        focus: ['decay'],
        caption: 'Energy dissipates in the resistor as the capacitor discharges.',
        embedHint: 'Compare heat/light in resistor branch while voltage falls.',
      },
    ],
  },
  '1-4-scalars-and-vectors': {
    params: [
      { id: 'ax', label: '|a| scale', min: 80, max: 160, step: 10, default: 120 },
      { id: 'by', label: 'b_y offset', min: -20, max: 20, step: 5, default: 0 },
    ],
    steps: [
      { focus: ['vector-a'], caption: 'Vectors have magnitude and direction — show both on diagrams.' },
      { focus: ['vector-b'], caption: 'Add nose-to-tail: place the start of b at the tip of a.' },
      { focus: ['resultant'], caption: 'The resultant R closes the triangle from start of a to tip of b.' },
      { focus: ['rule'], caption: 'Resolve into components if direct addition is awkward (especially 2D).' },
    ],
  },
  '3-7-vectors': {
    params: [
      { id: 'ax', label: '|a| scale', min: 80, max: 160, step: 10, default: 120 },
      { id: 'by', label: 'b_y component', min: -30, max: 30, step: 5, default: 0 },
    ],
    steps: [
      {
        focus: ['vector-a'],
        caption: 'Write vectors in component form a = ai + aj or column notation.',
        embedHint: 'Use GeoGebra to draw component vectors on i and j axes.',
      },
      {
        focus: ['vector-b'],
        caption: 'Add component-wise: (a₁+b₁)i + (a₂+b₂)j.',
        embedHint: 'Drag vector b — see how components add independently.',
      },
      {
        focus: ['resultant'],
        caption: 'Resultant magnitude |R| = √(Rx² + Ry²); direction from tan θ = Ry/Rx.',
        embedHint: 'Read length and angle of the resultant vector.',
      },
      {
        focus: ['rule'],
        caption: 'Dot product a·b = |a||b|cos θ — use for angles and projections (9709 3.7).',
        embedHint: 'Compute scalar product and compare with geometric definition.',
      },
    ],
  },
  '1-8-integration': {
    params: [
      { id: 'a', label: 'Lower limit a', min: 0.5, max: 2, step: 0.5, default: 1 },
      { id: 'b', label: 'Upper limit b', min: 2, max: 4.5, step: 0.5, default: 3 },
    ],
    steps: [
      {
        focus: ['curve'],
        caption: 'Integration reverses differentiation on P1 — find F(x) such that F′(x) = f(x).',
        embedHint: 'Watch the antiderivative curve build from the gradient function.',
      },
      {
        focus: ['area'],
        caption: 'Definite integral ∫ₐᵇ f(x) dx equals area under the curve (with sign).',
        embedHint: 'Shade the region — negative regions subtract from total area.',
      },
      {
        focus: ['limits'],
        caption: 'Evaluate F(b) − F(a) — always show substitution of limits for A marks.',
        embedHint: 'Move limits and read the accumulated area value.',
      },
      {
        focus: ['parts'],
        caption: 'Include + C for indefinite integrals; constants disappear in definite limits.',
        embedHint: 'Compare indefinite and definite integral values on the same graph.',
      },
    ],
  },

  // ── 9700 Biology (embed-synced) ────────────────────────────────────────
  '4-2-movement-into-and-out-of-cells': embedSpec([
    {
      caption: 'Passive transport moves substances down a concentration gradient — no ATP required.',
      embedHint: 'Start with a high concentration on one side — watch diffusion until equilibrium.',
    },
    {
      caption: 'Facilitated diffusion uses channel or carrier proteins but still follows the gradient.',
      embedHint: 'Compare diffusion through an open channel vs blocked membrane.',
    },
    {
      caption: 'Osmosis is diffusion of water across a partially permeable membrane.',
      embedHint: 'Change solute concentration — predict which way water moves.',
    },
    {
      caption: 'Active transport and bulk transport (endocytosis/exocytosis) move against the gradient.',
      embedHint: 'Relate concentration changes to energy-requiring transport in exam answers.',
    },
  ]),
  '6-1-structure-of-nucleic-acids-and-replication-of-dna': embedSpec([
    {
      caption: 'DNA is a double helix of antiparallel polynucleotide strands.',
      embedHint: 'Identify the DNA strand and read the base sequence.',
    },
    {
      caption: 'Complementary base pairing (A–T, C–G) holds the two strands together.',
      embedHint: 'Watch transcription copy one strand into mRNA.',
    },
    {
      caption: 'Semi-conservative replication copies both strands before cell division.',
      embedHint: 'Follow replication — each new molecule has one old and one new strand.',
    },
    {
      caption: 'Genes are sections of DNA that code for polypeptides via mRNA.',
      embedHint: 'Complete the expression pathway from gene to protein.',
    },
  ]),
  '17-2-natural-and-artificial-selection': embedSpec([
    {
      caption: 'Populations show variation — heritable differences affect survival.',
      embedHint: 'Observe different phenotypes in the starting population.',
    },
    {
      caption: 'Selection pressure favours individuals with advantageous alleles.',
      embedHint: 'Change the environment (e.g. climate) — see which phenotype survives.',
    },
    {
      caption: 'Survivors reproduce — allele frequencies shift over generations.',
      embedHint: 'Run multiple generations and track the dominant trait.',
    },
    {
      caption: 'Artificial selection applies the same principle in breeding programmes.',
      embedHint: 'Compare natural vs human-directed selection in exam explanations.',
    },
  ]),
  '17-3-evolution': embedSpec([
    {
      caption: 'Evolution is change in allele frequency in a population over time.',
      embedHint: 'Reset and run the simulation — allele ratios change across generations.',
    },
    {
      caption: 'Natural selection is a major mechanism driving evolutionary change.',
      embedHint: 'Link survival advantage to increased representation of alleles.',
    },
    {
      caption: 'Isolation and genetic drift can also alter allele frequencies.',
      embedHint: 'Describe how small populations fix alleles by chance.',
    },
    {
      caption: 'Speciation occurs when populations become reproductively isolated.',
      embedHint: 'Use the sim’s generational data to support a structured A Level answer.',
    },
  ]),

  // ── 9701 Chemistry (embed-synced) ──────────────────────────────────────
  '1-1-particles-in-the-atom-and-atomic-radius': embedSpec([
    {
      caption: 'Atoms contain protons and neutrons in the nucleus, electrons in shells.',
      embedHint: 'Add particles one at a time — read atomic number and mass number.',
    },
    {
      caption: 'Atomic number Z = proton number; mass number A = protons + neutrons.',
      embedHint: 'Build a neutral atom — electrons should equal protons.',
    },
    {
      caption: 'Ions form when electrons are gained or lost — charge = protons − electrons.',
      embedHint: 'Remove or add electrons — watch the charge indicator change.',
    },
    {
      caption: 'Atomic radius decreases across a period (increasing nuclear charge).',
      embedHint: 'Compare neutral atoms of neighbouring elements in the same period.',
    },
  ]),
  '1-2-isotopes': embedSpec([
    {
      caption: 'Isotopes are atoms of the same element with different neutron numbers.',
      embedHint: 'Keep proton count fixed — change neutrons and read the mass number.',
    },
    {
      caption: 'Relative atomic mass is a weighted mean of isotope masses.',
      embedHint: 'Compare isotope abundances and their contribution to Ar.',
    },
    {
      caption: 'Isotopes have identical chemical properties (same electron configuration).',
      embedHint: 'Verify the element symbol stays the same when only neutrons change.',
    },
    {
      caption: 'Some isotopes are radioactive — unstable nuclei emit radiation.',
      embedHint: 'Relate neutron/proton ratio to stability in exam definitions.',
    },
  ]),
  '2-2-the-mole-and-the-avogadro-constant': embedSpec([
    {
      caption: 'One mole contains Avogadro constant (6.02 × 10²³) particles.',
      embedHint: 'Prepare 1 mol dm⁻³ solution — link moles, Mr, and volume.',
    },
    {
      caption: 'n = m / Mr links mass to amount of substance.',
      embedHint: 'Weigh out a known mass — calculate moles using Mr.',
    },
    {
      caption: 'Concentration c = n / V (mol dm⁻³) for solutions.',
      embedHint: 'Dilute the solution — moles stay constant, concentration falls.',
    },
    {
      caption: 'Gas volume at rtp: 1 mol ≈ 24 dm³ (ideal exam approximation).',
      embedHint: 'Connect solution prep to reacting volumes in stoichiometry questions.',
    },
  ]),
  '2-3-formulas': embedSpec([
    {
      caption: 'Molecular formula gives the actual atom count in a molecule.',
      embedHint: 'Build a known molecule — read its molecular formula.',
    },
    {
      caption: 'Empirical formula is the simplest whole-number ratio of atoms.',
      embedHint: 'Compare empirical vs molecular formula for the same compound.',
    },
    {
      caption: 'Coefficients in an equation balance atom counts (conservation of mass).',
      embedHint: 'Assemble products from given reactant atoms.',
    },
    {
      caption: 'Ionic compounds are represented by formula units, not molecules.',
      embedHint: 'Distinguish discrete molecules from giant ionic lattices in answers.',
    },
  ]),
  '3-1-electronegativity-and-bonding': embedSpec([
    {
      caption: 'Electronegativity increases across a period and decreases down a group.',
      embedHint: 'Increase electronegativity difference — see the bond dipole grow.',
    },
    {
      caption: 'Large ΔEN → polar covalent bond; very large ΔEN → ionic character.',
      embedHint: 'Compare non-polar, polar, and highly polar bonds on the same screen.',
    },
    {
      caption: 'Bond polarity affects intermolecular forces and physical properties.',
      embedHint: 'Read the molecular dipole when atoms are arranged asymmetrically.',
    },
    {
      caption: 'Metallic and ionic bonding involve different electron models (9701 3.2–3.3).',
      embedHint: 'Relate electronegativity trends to bond type predictions in exam tables.',
    },
  ]),
  '3-4-covalent-bonding-and-coordinate-dative-covalent-bonding': embedSpec([
    {
      caption: 'Covalent bonds form when atoms share electron pairs.',
      embedHint: 'Build a simple covalent molecule — count shared pairs.',
    },
    {
      caption: 'Each covalent bond = one shared pair (single bond) or multiple pairs (double/triple).',
      embedHint: 'Compare single vs double bond lengths in the model.',
    },
    {
      caption: 'Dative covalent bonds: both electrons come from one atom (e.g. NH₄⁺).',
      embedHint: 'Identify which atom donated the lone pair in a coordinate bond.',
    },
    {
      caption: 'Lewis structures show all valence electrons — dots or crosses per atom.',
      embedHint: 'Draw dot-and-cross diagrams alongside the sim for exam practice.',
    },
  ]),
  '3-5-shapes-of-molecules': embedSpec([
    {
      caption: 'VSEPR: electron pairs repel — arrange to minimise repulsion.',
      embedHint: 'Add bonding pairs only — read the predicted shape (e.g. linear, tetrahedral).',
    },
    {
      caption: 'Lone pairs occupy more space than bonding pairs — compress bond angles.',
      embedHint: 'Add a lone pair — watch the bond angle decrease (e.g. 109.5° → 104.5° in H₂O).',
    },
    {
      caption: 'Common shapes: linear (2 bp), trigonal planar (3 bp), tetrahedral (4 bp).',
      embedHint: 'Cycle through 2, 3, and 4 bonding pairs — name each geometry.',
    },
    {
      caption: 'Bond angle evidence distinguishes shapes in Paper 2 structured questions.',
      embedHint: 'Predict whether a molecule is polar from shape and bond dipoles.',
    },
  ]),
  '4-1-the-gaseous-state-ideal-and-real-gases-and-pv-nrt': embedSpec([
    {
      caption: 'Ideal gas: particles far apart, random motion, elastic collisions.',
      embedHint: 'Observe particle motion — relate speed to temperature (Kelvin).',
    },
    {
      caption: 'Boyle’s law: p ∝ 1/V at constant T (n fixed).',
      embedHint: 'Compress the gas at constant temperature — pressure rises.',
    },
    {
      caption: 'Charles’s law: V ∝ T at constant p; Gay-Lussac: p ∝ T at constant V.',
      embedHint: 'Heat the sample — volume or pressure changes with T (in kelvin).',
    },
    {
      caption: 'Ideal gas equation: pV = nRT (R = 8.31 J mol⁻¹ K⁻¹).',
      embedHint: 'Read p, V, n, T values and verify pV/nT stays constant.',
    },
  ]),
  '7-2-br-nsted-lowry-theory-of-acids-and-bases': embedSpec([
    {
      caption: 'Brønsted-Lowry: acids donate H⁺, bases accept H⁺.',
      embedHint: 'Identify acid and base in the equilibrium — label conjugate pairs.',
    },
    {
      caption: 'Strong acids ionise fully; weak acids establish an equilibrium.',
      embedHint: 'Compare pH of strong vs weak acid at the same concentration.',
    },
    {
      caption: 'Ka measures weak acid strength; pKa = −log Ka.',
      embedHint: 'Watch equilibrium shift when acid is diluted.',
    },
    {
      caption: 'pH = −log[H⁺] — know how to calculate pH of strong acids and weak acids (approx).',
      embedHint: 'Read the pH meter — link to [H⁺] for exam calculations.',
    },
  ]),
  '8-1-rate-of-reaction': embedSpec([
    {
      caption: 'Rate depends on collision frequency and energy of collisions.',
      embedHint: 'Increase reactant amounts — see how product yield changes.',
    },
    {
      caption: 'Limiting reagent determines maximum product (mole ratio from equation).',
      embedHint: 'Set unequal reactant moles — identify which runs out first.',
    },
    {
      caption: 'Surface area, concentration, temperature, and catalysts affect rate.',
      embedHint: 'Compare runs with different starting amounts — link to collision theory.',
    },
    {
      caption: 'Measuring rate: loss of mass, gas volume, or colour change over time.',
      embedHint: 'Use the product table to calculate moles formed per unit time.',
    },
  ]),

  // ── 9702 Physics — additional embed-synced ───────────────────────────
  '3-3-linear-momentum-and-its-conservation': embedSpec([
    {
      caption: 'Momentum p = mv is a vector — direction matters.',
      embedHint: 'Set masses and velocities — read momentum of each object before collision.',
    },
    {
      caption: 'Total momentum is conserved in a closed system (no external impulse).',
      embedHint: 'Run elastic collision — total p before = total p after.',
    },
    {
      caption: 'Inelastic collisions: kinetic energy is not conserved; momentum still is.',
      embedHint: 'Switch to inelastic — objects may stick; momentum still conserved.',
    },
    {
      caption: 'Impulse FΔt = Δp links force-time graphs to momentum change.',
      embedHint: 'Compare collision duration and force for the same momentum change.',
    },
  ]),
  '9-1-electric-current': embedSpec([
    {
      caption: 'Current I = ΔQ/Δt — rate of flow of charge (coulombs per second).',
      embedHint: 'Increase voltage — read current through the resistor.',
    },
    {
      caption: 'Conventional current flows from + to − (opposite to electron flow).',
      embedHint: 'Observe electron drift direction vs conventional current arrow.',
    },
    {
      caption: 'In series, current is the same through each component.',
      embedHint: 'Add a second resistor in series — current is equal everywhere.',
    },
    {
      caption: 'Ammeter in series; never connect an ammeter in parallel.',
      embedHint: 'Measure current at different points — values match in a series loop.',
    },
  ]),
  '9-3-resistance-and-resistivity': embedSpec([
    {
      caption: 'Resistance R = V/I (Ohm’s law) for ohmic conductors at constant temperature.',
      embedHint: 'Plot V against I — gradient equals resistance.',
    },
    {
      caption: 'Resistivity ρ: R = ρL/A — longer wire → higher R; thicker wire → lower R.',
      embedHint: 'Change wire length and cross-section — predict R from ρL/A.',
    },
    {
      caption: 'Metallic resistance increases with temperature (lattice vibration).',
      embedHint: 'Heat the filament — resistance rises, current falls at fixed V.',
    },
    {
      caption: 'Use ρ values and dimensions in Paper 4 multi-step calculations.',
      embedHint: 'Calculate ρ from measured R, L, and A — check SI units (Ω m).',
    },
  ]),
  '11-1-atoms-nuclei-and-radiation': embedSpec([
    {
      caption: 'Rutherford scattering showed most mass is in a tiny, positive nucleus.',
      embedHint: 'Fire alpha particles — most pass through, few deflect sharply.',
    },
    {
      caption: 'Alpha, beta, and gamma differ in ionising power and penetrating ability.',
      embedHint: 'Relate deflection to nuclear charge and empty atomic volume.',
    },
    {
      caption: 'Nuclear notation ᴬ_Z X — mass number A, proton number Z.',
      embedHint: 'Write nuclide symbols for alpha (⁴₂He) and beta particles.',
    },
    {
      caption: 'Radioactive decay is random for individual nuclei but predictable for large samples.',
      embedHint: 'Connect scattering evidence to the nuclear model in structured answers.',
    },
  ]),
  '20-5-electromagnetic-induction': embedSpec([
    {
      caption: 'Magnetic flux Φ = BA cos θ through a coil.',
      embedHint: 'Move the magnet — flux through the coil changes.',
    },
    {
      caption: 'Faraday’s law: induced e.m.f. ∝ rate of change of flux linkage.',
      embedHint: 'Move the magnet faster — larger deflection on the meter.',
    },
    {
      caption: 'Lenz’s law: induced current opposes the change causing it.',
      embedHint: 'Reverse magnet direction — induced current reverses.',
    },
    {
      caption: 'Generators and transformers apply electromagnetic induction (20.5, 21.x).',
      embedHint: 'Relate coil turns and flux change rate to induced e.m.f. magnitude.',
    },
  ]),
  '5-2-gravitational-potential-energy-and-kinetic-energy': embedSpec([
    {
      caption: 'GPE = mgh (near Earth’s surface); KE = ½mv².',
      embedHint: 'Place the skater high on the ramp — read GPE at the top.',
    },
    {
      caption: 'Conservation of mechanical energy: GPE + KE = constant (no friction).',
      embedHint: 'Toggle friction off — total energy bar stays level.',
    },
    {
      caption: 'With friction, mechanical energy dissipates as thermal energy.',
      embedHint: 'Turn friction on — skater stops lower; energy lost to heat.',
    },
    {
      caption: 'Work done = force × displacement in direction of force (link to energy transfer).',
      embedHint: 'Compare speed at bottom from different starting heights (½mv² = mgh).',
    },
  ]),
  '20-4-magnetic-fields-due-to-currents': embedSpec([
    {
      caption: 'Moving charges create magnetic fields (current in a wire).',
      embedHint: 'Switch current on — iron filings or field vectors appear around the wire.',
    },
    {
      caption: 'Right-hand grip rule gives field direction around a straight conductor.',
      embedHint: 'Reverse current — field direction reverses.',
    },
    {
      caption: 'Solenoid: uniform field inside, similar to a bar magnet.',
      embedHint: 'Increase coil turns or current — field strength increases.',
    },
    {
      caption: 'F = BIL sin θ on a conductor in a magnetic field (link to 20.2).',
      embedHint: 'Use field direction and current to predict force on a wire.',
    },
  ]),

  // ── 9709 Mathematics (embed-synced) ────────────────────────────────────
  '1-1-quadratics': embedSpec([
    {
      caption: 'Quadratic y = ax² + bx + c has a parabolic graph (a ≠ 0).',
      embedHint: 'Change a — see the parabola stretch or reflect in the x-axis.',
    },
    {
      caption: 'Completing the square reveals the vertex form y = a(x − h)² + k.',
      embedHint: 'Adjust h and k — vertex moves to (h, k).',
    },
    {
      caption: 'Discriminant b² − 4ac determines the nature of roots.',
      embedHint: 'Set the graph to touch the x-axis once — repeated root (Δ = 0).',
    },
    {
      caption: 'Factorise or use the formula to solve ax² + bx + c = 0 on Paper 1.',
      embedHint: 'Read x-intercepts from the graph — check by substitution.',
    },
  ]),
  '1-5-trigonometry': embedSpec([
    {
      caption: 'sin θ, cos θ, tan θ defined from the unit circle (r = 1).',
      embedHint: 'Move the point — read sin θ (y) and cos θ (x).',
    },
    {
      caption: 'Radians: θ = arc length / radius; 180° = π rad.',
      embedHint: 'Switch to radians — quarter turn = π/2.',
    },
    {
      caption: 'Graphs of sin x and cos x are periodic with period 2π.',
      embedHint: 'Relate circle position to values on the sine/cosine graphs.',
    },
    {
      caption: 'Exact values at 0, π/6, π/4, π/3, π/2 are required on Paper 1.',
      embedHint: 'Verify sin(π/6) = ½ and cos(π/3) = ½ on the diagram.',
    },
  ]),
  '3-3-trigonometry': embedSpec([
    {
      caption: 'P3 trig: identities like sin²θ + cos²θ ≡ 1 and compound-angle formulae.',
      embedHint: 'Use the unit circle to verify identity values at key angles.',
    },
    {
      caption: 'Solve equations like a sin x + b cos x = R sin(x + α).',
      embedHint: 'Read amplitude R from the circle projection.',
    },
    {
      caption: 'Inverse trig functions require careful domain restrictions.',
      embedHint: 'Check principal values when solving sin x = k.',
    },
    {
      caption: 'Radians are mandatory for calculus: d/dx(sin x) = cos x.',
      embedHint: 'Link circle angle to calculus graphs on the same applet.',
    },
  ]),
  '3-9-complex-numbers': {
    params: [
      { id: 're', label: 'Real part x', min: -4, max: 4, step: 1, default: 3 },
      { id: 'im', label: 'Imaginary part y', min: -4, max: 4, step: 1, default: 2 },
    ],
    steps: [
      {
        focus: ['axes'],
        caption: 'Complex number z = x + iy plotted as point (x, y) in the Argand diagram.',
        embedHint: 'Drag z — read real and imaginary parts.',
      },
      {
        focus: ['point'],
        caption: 'Modulus |z| = √(x² + y²); argument arg z = angle from positive real axis.',
        embedHint: 'Read |z| and arg z from the display.',
      },
      {
        focus: ['modulus'],
        caption: 'Polar form: z = r(cos θ + i sin θ) = re^(iθ).',
        embedHint: 'Convert between Cartesian and polar forms on the diagram.',
      },
      {
        focus: ['argument'],
        caption: 'De Moivre’s theorem: (cos θ + i sin θ)ⁿ = cos nθ + i sin nθ.',
        embedHint: 'Multiply z by itself — argument doubles, modulus squares.',
      },
    ],
  },
  '5-5-the-normal-distribution': embedSpec([
    {
      caption: 'X ~ N(μ, σ²) is symmetric about the mean μ.',
      embedHint: 'Move μ — the bell curve shifts left or right.',
    },
    {
      caption: 'Standard deviation σ controls spread — larger σ → wider curve.',
      embedHint: 'Increase σ — more probability in the tails.',
    },
    {
      caption: 'Standardise: Z = (X − μ)/σ ~ N(0, 1) for table lookups.',
      embedHint: 'Mark μ ± σ, μ ± 2σ on the curve (~68%, ~95% rules).',
    },
    {
      caption: 'Normal approximation to binomial when np > 5 and n(1−p) > 5.',
      embedHint: 'Compare bell curve area with probability statements P(X > a).',
    },
  ]),

  '5-1-enthalpy-change-h': embedSpec([
    { caption: 'Enthalpy change ΔH is heat energy transferred at constant pressure.', embedHint: 'Heat the system — watch energy flow and temperature rise.' },
    { caption: 'Exothermic: ΔH negative (system loses energy). Endothermic: ΔH positive.', embedHint: 'Compare heating vs cooling — direction of energy transfer.' },
    { caption: 'Standard conditions: ΔH⦵ refers to 298 K, 100 kPa, 1 mol substance.', embedHint: 'Relate energy bar charts to balanced equation coefficients.' },
    { caption: 'Calorimetry: q = mcΔT links temperature change to energy transferred.', embedHint: 'Use the sim’s energy accounting to explain calorimeter logic.' },
  ]),
  '5-2-hesss-law': embedSpec([
    { caption: 'Hess’s law: total ΔH is independent of the route taken.', embedHint: 'Compare two paths to the same products — total energy change matches.' },
    { caption: 'Enthalpy cycles: reverse a step → sign of ΔH reverses.', embedHint: 'Trace clockwise vs anticlockwise paths on an energy diagram.' },
    { caption: 'Use formation/combustion data tables with careful sign and stoichiometry.', embedHint: 'Sum ΔH values from the sim’s stepwise energy changes.' },
    { caption: 'State the cycle clearly in exams — examiners award diagram marks.', embedHint: 'Sketch an energy cycle alongside the simulation steps.' },
  ]),
  '6-1-redox-processes-electron-transfer-and-changes-in-oxidation-number-oxidation-state': embedSpec([
    { caption: 'Oxidation is electron loss; reduction is electron gain (OIL RIG).', embedHint: 'Balance an equation — atom counts must match both sides.' },
    { caption: 'Oxidation number rules: element = 0; ion = charge; O usually −2, H usually +1.', embedHint: 'Assign oxidation numbers before identifying redox pairs.' },
    { caption: 'Redox reactions involve simultaneous oxidation and reduction.', embedHint: 'Identify which species is oxidised and which is reduced.' },
    { caption: 'Half-equations balance atoms and charge; combine for full ionic equation.', embedHint: 'Use balanced equations to confirm electron transfer counts.' },
  ]),
  '7-1-chemical-equilibria-reversible-reactions-dynamic-equilibrium': embedSpec([
    { caption: 'Reversible reactions proceed in forward and reverse directions.', embedHint: 'Watch the weak acid equilibrium — both directions are active.' },
    { caption: 'Dynamic equilibrium: rates equal, concentrations constant (not equal).', embedHint: 'At equilibrium, forward and reverse rates match — not zero motion.' },
    { caption: 'Le Chatelier: system opposes imposed change (concentration, pressure, temperature).', embedHint: 'Predict shift when concentration or temperature changes.' },
    { caption: 'Kc expression uses equilibrium concentrations; Kc varies with temperature only.', embedHint: 'Write Kc for the equilibrium shown in the simulation.' },
  ]),
  '8-2-effect-of-temperature-on-reaction-rates-and-the-concept-of-activation-energy': embedSpec([
    { caption: 'Particles must collide with energy ≥ activation energy Ea to react.', embedHint: 'Heat the sample — faster particles have more energetic collisions.' },
    { caption: 'Higher temperature → greater fraction of collisions exceed Ea (Boltzmann distribution).', embedHint: 'Compare particle speeds at low vs high temperature.' },
    { caption: 'Rate approximately doubles per 10°C rise for many reactions (rule of thumb).', embedHint: 'Observe how collision frequency and energy both increase with T.' },
    { caption: 'Catalysts provide alternative route with lower Ea — not consumed overall.', embedHint: 'Relate activation energy to the energy barrier in collision theory.' },
  ]),
  '1-3-coordinate-geometry': embedSpec([
    { caption: 'Straight line y = mx + c: gradient m, y-intercept c.', embedHint: 'Adjust slope and intercept — read values from the equation display.' },
    { caption: 'Parallel lines have equal gradients; perpendicular: m₁m₂ = −1.', embedHint: 'Set two lines — check product of gradients for perpendicularity.' },
    { caption: 'Distance between points: √((x₂−x₁)² + (y₂−y₁)²).', embedHint: 'Plot two points — measure horizontal and vertical components.' },
    { caption: 'Midpoint: ((x₁+x₂)/2, (y₁+y₂)/2).', embedHint: 'Find the midpoint on a segment between two plotted points.' },
  ]),
  '1-6-series': embedSpec([
    { caption: 'Binomial expansion: (1 + x)ⁿ for |x| < 1 when n is not a positive integer.', embedHint: 'Build (a + b)² expansions — compare with the standard pattern.' },
    { caption: 'Arithmetic series: u_n = a + (n−1)d; sum S_n = n/2(2a + (n−1)d).', embedHint: 'Generate successive terms with a common difference.' },
    { caption: 'Geometric series: u_n = ar^(n−1); sum S_n = a(1−r^n)/(1−r) for r ≠ 1.', embedHint: 'Multiply each term by r — see the geometric pattern.' },
    { caption: 'Sum to infinity exists when |r| < 1: S_∞ = a/(1−r).', embedHint: 'Set |r| < 1 — partial sums approach a limiting value.' },
  ]),
  '2-2-logarithmic-and-exponential-functions': embedSpec([
    { caption: 'y = a^x and y = log_a(x) are inverse functions — reflection in y = x.', embedHint: 'Plot both — symmetry about the line y = x.' },
    { caption: 'Laws of logs: log(xy) = log x + log y; log(x^n) = n log x.', embedHint: 'Compare log of a product vs sum of logs numerically.' },
    { caption: 'Natural log ln x uses base e ≈ 2.718.', embedHint: 'Compare e^x and ln x as inverse pair.' },
    { caption: 'Exponential models growth/decay: y = Ae^(kx).', embedHint: 'Change k — positive k growth, negative k decay.' },
  ]),
  '5-3-probability': embedSpec([
    { caption: 'P(A) is between 0 and 1; P(not A) = 1 − P(A).', embedHint: 'Adjust event probability — complement updates automatically.' },
    { caption: 'Mutually exclusive: P(A ∪ B) = P(A) + P(B).', embedHint: 'Set overlapping vs disjoint events — compare addition rule.' },
    { caption: 'Independent: P(A ∩ B) = P(A) × P(B).', embedHint: 'Check whether joint probability equals the product.' },
    { caption: 'Tree diagrams organise conditional branches systematically.', embedHint: 'Trace two-stage branches and multiply along paths.' },
  ]),
  '4-4-newtons-laws-of-motion': embedSpec([
    { caption: 'First law: constant velocity unless unbalanced force acts.', embedHint: 'Zero net force — velocity stays constant.' },
    { caption: 'Second law: F = ma (resultant force in direction of acceleration).', embedHint: 'Apply net force — read acceleration from the graph.' },
    { caption: 'Third law: equal and opposite forces on different bodies.', embedHint: 'Identify action/reaction pairs — they act on different objects.' },
    { caption: 'Weight W = mg acts vertically downward near Earth’s surface.', embedHint: 'Compare applied force and friction — net force determines motion.' },
  ]),
  '2-1-demand-and-supply-curves': embedSpec([
    { caption: 'Demand slopes downward — higher price, lower quantity demanded.', embedHint: 'Read the downward demand curve — price vs quantity.' },
    { caption: 'Supply slopes upward — higher price, higher quantity supplied.', embedHint: 'Read the upward supply curve on the same axes.' },
    { caption: 'Equilibrium where Qd = Qs — market clears at equilibrium price.', embedHint: 'Find the intersection — equilibrium P and Q.' },
    { caption: 'Ceteris paribus: one factor changes at a time.', embedHint: 'Use checkboxes — shift one curve and read the new equilibrium.' },
  ]),
  '2-4-the-interaction-of-demand-and-supply': embedSpec([
    { caption: 'Increase in demand → higher equilibrium P and Q.', embedHint: 'Shift demand right — trace new intersection.' },
    { caption: 'Increase in supply → lower equilibrium P, higher Q.', embedHint: 'Shift supply right — price falls, quantity rises.' },
    { caption: 'Simultaneous shifts need careful analysis — direction depends on magnitudes.', embedHint: 'Shift both curves — predict ambiguous cases for exams.' },
    { caption: 'Excess supply (surplus) or excess demand (shortage) off equilibrium.', embedHint: 'Move price above equilibrium — surplus appears.' },
  ]),
  '2-2-price-elasticity-income-elasticity-and-cross-elasticity-of-demand': embedSpec([
    { caption: 'PED = (% ΔQd)/(% ΔP) — elastic if |PED| > 1.', embedHint: 'Compare steep vs flat demand — steep means inelastic.' },
    { caption: 'Elastic demand: quantity responds strongly to price change.', embedHint: 'Large quantity change for small price move → elastic.' },
    { caption: 'YED: normal good YED > 0; inferior good YED < 0.', embedHint: 'Relate income shifts to demand curve movement.' },
    { caption: ' XED > 0 substitutes; XED < 0 complements.', embedHint: 'Predict cross-price effects from curve shifts.' },
  ]),
  '1-1-scarcity-choice-and-opportunity-cost': embedSpec([
    { caption: 'Scarcity forces choice — not all wants can be satisfied.', embedHint: 'Finite resources on the axes — unlimited wants cannot all be met.' },
    { caption: 'Opportunity cost is the next best alternative forgone.', embedHint: 'Move along the PPC — slope shows what you give up.' },
    { caption: 'What to produce? How? For whom? — basic economic questions.', embedHint: 'Compare points inside, on, and outside the frontier.' },
    { caption: 'PPC links scarcity to opportunity cost (see 1.5 for full analysis).', embedHint: 'Efficient points on the curve — inside means unemployed resources.' },
  ]),
  '8-1-1-elasticity': embedSpec([
    { caption: 'PED measures quantity response to a price change.', embedHint: 'Compare steep vs flat demand — steep means inelastic.' },
    { caption: 'Elastic demand (|PED| > 1): quantity responds strongly.', embedHint: 'Price cut raises total revenue when demand is elastic.' },
    { caption: 'Inelastic demand (|PED| < 1): quantity responds weakly.', embedHint: 'Price rise raises total revenue when demand is inelastic.' },
    { caption: 'Apply elasticity to pricing, promotions, and revenue strategy.', embedHint: 'Shift the curve — read new equilibrium P and Q.' },
  ]),
  '10-3-1-the-concept-of-investment-appraisal': embedSpec([
    { caption: 'Capital projects involve large, irreversible spending.', embedHint: 'Identify initial investment outlay in the sim.' },
    { caption: 'Appraisal uses incremental cash flows only.', embedHint: 'Focus on future inflows minus outflows — ignore sunk costs.' },
    { caption: 'Qualitative factors: strategy, brand, risk, CSR.', embedHint: 'Compare quantitative NPV with non-financial factors.' },
    { caption: 'Methods: payback, ARR, NPV, IRR — see 10.3.2–10.3.4.', embedHint: 'Scroll the cash-flow timeline in the sim.' },
  ]),
  '10-3-2-basic-methods-payback-accounting-rate-of-return-arr': embedSpec([
    { caption: 'Payback = time until cumulative cash flow recovers investment.', embedHint: 'Track when cumulative CF crosses zero in the sim.' },
    { caption: 'Simple and intuitive — favours short-term liquidity.', embedHint: 'Compare projects with different payback periods.' },
    { caption: 'ARR = average annual profit ÷ initial investment × 100%.', embedHint: 'Uses accounting profit, not cash flow — limitation.' },
    { caption: 'Ignores time value of money — use NPV for long projects.', embedHint: 'Contrast payback/ARR with discounted methods below.' },
  ]),
  '10-3-3-discounted-cash-flow-method-net-present-value-npv': embedSpec([
    { caption: 'Money today is worth more — future CFs must be discounted.', embedHint: 'Adjust discount rate in the sim — watch NPV change.' },
    { caption: 'Discount factor = 1 / (1 + r)^n for year n.', embedHint: 'Higher r reduces present value of distant cash flows.' },
    { caption: 'NPV = Σ PV of net cash flows − initial investment.', embedHint: 'Read NPV at your required rate of return.' },
    { caption: 'Accept project if NPV > 0; reject if NPV < 0.', embedHint: 'Find IRR where NPV = 0 — compare to cost of capital.' },
  ]),
  '10-3-4-investment-appraisal-decisions': embedSpec([
    { caption: 'Compare methods — NPV preferred for wealth maximisation.', embedHint: 'Run both projects in the sim — which NPV is higher?' },
    { caption: 'Payback useful when liquidity is critical.', embedHint: 'Short payback may win despite lower NPV — explain trade-off.' },
    { caption: 'Qualitative factors may override negative NPV.', embedHint: 'Government policy, market entry, competitive threat.' },
    { caption: 'Sensitivity analysis — test assumptions on r and cash flows.', embedHint: 'Change discount rate — does the decision flip?' },
  ]),
  '5-4-4-break-even-analysis': {
    params: [
      { id: 'fc', label: 'Fixed costs', min: 4000, max: 20000, step: 1000, default: 12000, unit: '$' },
      { id: 'sp', label: 'Selling price', min: 24, max: 72, step: 2, default: 48, unit: '$' },
      { id: 'vc', label: 'Variable cost / unit', min: 8, max: 36, step: 1, default: 18, unit: '$' },
      { id: 'actual', label: 'Actual output', min: 100, max: 800, step: 25, default: 450, unit: 'units' },
    ],
    steps: [
      { focus: ['step-1'], caption: 'Break-even output = fixed costs ÷ contribution per unit.', embedHint: 'Set FC and unit variable cost in the sim — read contribution.' },
      { focus: ['step-2'], caption: 'On the chart, total revenue and total cost lines cross at break-even.', embedHint: 'Watch the TR/TC intersection as you change price.' },
      { focus: ['step-3'], caption: 'Margin of safety = actual output − break-even output.', embedHint: 'Drag quantity past break-even — read the profit region.' },
      { focus: ['step-4'], caption: 'Assumes constant price and linear variable costs.', embedHint: 'Test limits — change price and see how BE shifts.' },
    ],
  },
  '2-2-4-cost-volume-profit-analysis': {
    params: [
      { id: 'fc', label: 'Fixed costs', min: 4000, max: 20000, step: 1000, default: 18000, unit: '$' },
      { id: 'sp', label: 'Selling price', min: 15, max: 40, step: 1, default: 25, unit: '$' },
      { id: 'vc', label: 'Variable cost / unit', min: 4, max: 20, step: 1, default: 10, unit: '$' },
      { id: 'actual', label: 'Budgeted output', min: 800, max: 2000, step: 50, default: 1500, unit: 'units' },
    ],
    steps: [
      { focus: ['step-1'], caption: 'Contribution = selling price − variable cost per unit.', embedHint: 'Adjust price and VC sliders — read contribution per unit.' },
      { focus: ['step-2'], caption: 'Break-even is where total contribution equals fixed costs.', embedHint: 'Find where TR and TC cross on the chart.' },
      { focus: ['step-3'], caption: 'Margin of safety shows how far sales can fall before loss.', embedHint: 'Move output above BE — compare profit vs break-even point.' },
      { focus: ['step-4'], caption: 'CVP supports short-run decisions; check assumptions.', embedHint: 'Change FC — trace the new break-even output.' },
    ],
  },
  '1-6-2-calculation-and-evaluation-of-ratios': {
    params: [
      { id: 'revenue', label: 'Revenue', min: 100000, max: 800000, step: 50000, default: 500000, unit: '$' },
      { id: 'grossProfit', label: 'Gross profit', min: 20000, max: 300000, step: 10000, default: 150000, unit: '$' },
      { id: 'netProfit', label: 'Net profit', min: 5000, max: 120000, step: 5000, default: 40000, unit: '$' },
      { id: 'pbit', label: 'PBIT', min: 10000, max: 150000, step: 5000, default: 55000, unit: '$' },
      { id: 'currentAssets', label: 'Current assets', min: 30000, max: 200000, step: 10000, default: 90000, unit: '$' },
      { id: 'inventory', label: 'Inventory', min: 0, max: 100000, step: 5000, default: 30000, unit: '$' },
      { id: 'currentLiabilities', label: 'Current liabilities', min: 20000, max: 150000, step: 10000, default: 60000, unit: '$' },
      { id: 'capitalEmployed', label: 'Capital employed', min: 150000, max: 800000, step: 25000, default: 400000, unit: '$' },
      { id: 'nonCurrentLiabilities', label: 'Non-current liabilities', min: 0, max: 300000, step: 10000, default: 120000, unit: '$' },
    ],
    steps: [
      { focus: ['step-1'], caption: 'Liquidity: current ratio and acid test from CA, inventory, CL.', embedHint: 'Raise inventory — watch acid test fall while current ratio may stay high.' },
      { focus: ['step-2'], caption: 'Profitability: GP%, NP%, ROCE from profit and capital employed.', embedHint: 'Cut revenue — margins and ROCE change independently.' },
      { focus: ['step-3'], caption: 'Gearing = non-current liabilities ÷ capital employed.', embedHint: 'Increase long-term debt — gearing rises.' },
      { focus: ['step-4'], caption: 'Interpret ratios together for a lender or investor.', embedHint: 'Compare liquidity vs gearing trade-off.' },
    ],
  },
  '10-2-2-profitability-ratios': {
    params: [
      { id: 'revenue', label: 'Revenue', min: 100000, max: 800000, step: 50000, default: 500000, unit: '$' },
      { id: 'grossProfit', label: 'Gross profit', min: 20000, max: 300000, step: 10000, default: 150000, unit: '$' },
      { id: 'netProfit', label: 'Net profit', min: 5000, max: 120000, step: 5000, default: 40000, unit: '$' },
      { id: 'pbit', label: 'PBIT', min: 10000, max: 150000, step: 5000, default: 55000, unit: '$' },
      { id: 'currentAssets', label: 'Current assets', min: 30000, max: 200000, step: 10000, default: 90000, unit: '$' },
      { id: 'inventory', label: 'Inventory', min: 0, max: 100000, step: 5000, default: 30000, unit: '$' },
      { id: 'currentLiabilities', label: 'Current liabilities', min: 20000, max: 150000, step: 10000, default: 60000, unit: '$' },
      { id: 'capitalEmployed', label: 'Capital employed', min: 150000, max: 800000, step: 25000, default: 400000, unit: '$' },
      { id: 'nonCurrentLiabilities', label: 'Non-current liabilities', min: 0, max: 300000, step: 10000, default: 120000, unit: '$' },
    ],
    steps: [
      { focus: ['step-1'], caption: 'Liquidity ratios show short-term bill payment ability.', embedHint: 'Acid test excludes inventory — stricter benchmark.' },
      { focus: ['step-2'], caption: 'GP margin and ROCE measure earning power.', embedHint: 'Link GP% to pricing and COGS control.' },
      { focus: ['step-3'], caption: 'Gearing shows dependence on long-term debt.', embedHint: 'High gearing increases financial risk.' },
      { focus: ['step-4'], caption: 'Evaluate ratios in context — industry and trends matter.', embedHint: 'One ratio alone is never enough.' },
    ],
  },
  '1-5-production-possibility-curves': embedSpec([
    { caption: 'PPC shows maximum output combinations with fixed resources.', embedHint: 'Points on the curve are productively efficient.' },
    { caption: 'Points inside the curve — inefficient (unemployed resources).', embedHint: 'Plot inside — economy could produce more of both goods.' },
    { caption: 'Points outside unreachable with current technology/resources.', embedHint: 'Outside the curve — not currently attainable.' },
    { caption: 'Opportunity cost = what is forgone — slope of PPC shows OC of good X.', embedHint: 'Move along the curve — increasing cost of one good.' },
  ]),
  '6-2-protein-synthesis': embedSpec([
    { caption: 'Transcription copies DNA template to mRNA in the nucleus.', embedHint: 'Watch mRNA build from the DNA template strand.' },
    { caption: 'RNA uses uracil instead of thymine; single-stranded.', embedHint: 'Compare base pairing during transcription.' },
    { caption: 'Translation: ribosome reads mRNA codons; tRNA brings amino acids.', embedHint: 'Follow tRNA anticodons matching mRNA codons.' },
    { caption: 'Polypeptide sequence determined by triplet codon genetic code.', embedHint: 'Complete translation — read the amino acid chain formed.' },
  ]),
  '13-1-photosynthesis-as-an-energy-transfer-process': embedSpec([
    { caption: 'Photosynthesis converts light energy to chemical energy in glucose.', embedHint: 'Relate light input to energy stored in organic molecules.' },
    { caption: 'Chlorophyll absorbs light — action and absorption spectra link to pigments.', embedHint: 'Connect atmospheric CO₂ levels to plant growth inputs.' },
    { caption: 'Light-dependent reactions produce ATP and NADPH.', embedHint: 'Trace energy transfer steps in the chloroplast model.' },
    { caption: 'Calvin cycle fixes CO₂ using ATP and NADPH (light-independent).', embedHint: 'Link CO₂ concentration to the rate of carbon fixation.' },
  ]),

  '14-2-alkenes': embedSpec([
    { caption: 'Alkenes contain a C=C double bond — one σ and one π bond.', embedHint: 'Build ethene — identify the double bond between carbons.' },
    { caption: 'Electrophilic addition: π bond donates electrons to an electrophile.', embedHint: 'Compare saturated alkane vs alkene structure.' },
    { caption: 'Markovnikov rule: H adds to C with more H already (major product).', embedHint: 'Predict major product from unsymmetrical alkene addition.' },
    { caption: 'Test for alkenes: decolourises bromine water (electrophilic addition).', embedHint: 'Relate double bond reactivity to addition vs substitution.' },
  ]),
  '15-1-halogenoalkanes': embedSpec([
    { caption: 'Halogenoalkanes: C–X polar bond — C δ+, X δ−.', embedHint: 'View tetrahedral shape around the C–X bond.' },
    { caption: 'SN2: one step, backside attack, inverted configuration.', embedHint: 'Primary halogenoalkanes favour SN2 (good leaving group I⁻ > Br⁻ > Cl⁻).' },
    { caption: 'SN1: two steps via carbocation — racemisation possible.', embedHint: 'Tertiary halogenoalkanes favour SN1 (stable carbocation).' },
    { caption: 'Elimination competes with substitution — especially with hot ethanolic OH⁻.', embedHint: 'Compare substitution vs elimination conditions in exam answers.' },
  ]),
  '16-1-alcohols': embedSpec([
    { caption: 'Alcohols contain –OH; primary, secondary, tertiary classification.', embedHint: 'Build primary and secondary alcohols — locate the –OH carbon.' },
    { caption: 'Oxidation: primary → aldehyde → carboxylic acid; secondary → ketone.', embedHint: 'Relate structure to oxidation products (K₂Cr₂O₇/H⁺).' },
    { caption: 'Tertiary alcohols resist oxidation without C–C cleavage.', embedHint: 'Explain why tertiary alcohols give no colour change with dichromate.' },
    { caption: 'Esterification: alcohol + carboxylic acid ⇌ ester + water (acid catalyst).', embedHint: 'Identify the ester linkage formed from alcohol and acid.' },
  ]),
  '13-4-isomerism-structural-isomerism-and-stereoisomerism': embedSpec([
    { caption: 'Structural isomers: same molecular formula, different connectivity.', embedHint: 'Build chain vs position isomers with the same atom count.' },
    { caption: 'Functional group isomers: e.g. alcohol vs ether.', embedHint: 'Compare different functional groups with formula CₙH₂ₙ₊₂O.' },
    { caption: 'E/Z (cis/trans) isomerism: restricted rotation about C=C.', embedHint: 'Identify different groups on each C of the double bond.' },
    { caption: 'Optical isomerism: chiral centre (four different groups on C).', embedHint: 'Find a carbon with four distinct substituents — enantiomers exist.' },
  ]),
  '13-3-shapes-of-organic-molecules-and-bonds': embedSpec([
    { caption: 'σ bonds: head-on overlap; free rotation about single bonds.', embedHint: 'Identify single bonds as σ-only overlap.' },
    { caption: 'π bonds: sideways overlap above/below C atoms — no free rotation.', embedHint: 'Locate the π bond in ethene above the σ framework.' },
    { caption: 'Ethene: planar, 120° H–C–H; ethane: tetrahedral, ~109.5°.', embedHint: 'Compare shapes of alkane vs alkene.' },
    { caption: 'Benzene: planar hexagon, delocalised π system (A Level extension).', embedHint: 'Relate bond length intermediate between single and double.' },
  ]),
  '17-1-aldehydes-and-ketones': embedSpec([
    { caption: 'Carbonyl C=O is polar — δ+ on C attracts nucleophiles.', embedHint: 'Identify the C=O dipole in aldehyde vs ketone.' },
    { caption: 'Aldehydes oxidised to carboxylic acids; ketones resist oxidation.', embedHint: 'Use Tollens/Fehling’s — aldehydes give positive test.' },
    { caption: 'Nucleophilic addition: CN⁻, HCN, NaBH₄ add to C=O.', embedHint: 'Track nucleophile attack on δ+ carbon of carbonyl.' },
    { caption: 'Distinguish aldehyde vs ketone using oxidising agents in exams.', embedHint: 'Relate carbonyl structure to reactivity differences.' },
  ]),
  '4-3-aggregate-demand-and-aggregate-supply-analysis': embedSpec([
    { caption: 'AD = C + I + G + (X − M) — downward sloping in P–Y space.', embedHint: 'Identify AD curve and axes (price level vs real GDP).' },
    { caption: 'SRAS slopes upward — higher P encourages greater output in short run.', embedHint: 'Locate SRAS and initial equilibrium.' },
    { caption: 'LRAS vertical at full employment output Yf.', embedHint: 'Mark Yf — long-run equilibrium independent of price level.' },
    { caption: 'Shift AD right → higher P and Y (demand-pull inflation risk).', embedHint: 'Shift AD and read new equilibrium P and Y.' },
  ]),
  '4-4-economic-growth': embedSpec([
    { caption: 'Economic growth: increase in real GDP over time.', embedHint: 'Rightward LRAS shift — higher potential output.' },
    { caption: 'Actual growth may exceed or fall below trend (business cycle).', embedHint: 'Compare equilibrium Y to Yf on the diagram.' },
    { caption: 'Productivity, labour, capital, and technology drive LRAS shifts.', embedHint: 'Link supply-side improvements to outward LRAS.' },
    { caption: 'Sustainable growth avoids inflation and environmental damage.', embedHint: 'Evaluate whether AD growth matches LRAS expansion.' },
  ]),
  '4-5-unemployment': embedSpec([
    { caption: 'Unemployment types: frictional, structural, cyclical, seasonal.', embedHint: 'Recessionary gap — Y below Yf on AD–AS diagram.' },
    { caption: 'Cyclical (demand-deficient) unemployment rises in recessions.', embedHint: 'Leftward AD shift — lower Y and downward pressure on P.' },
    { caption: 'Full employment: unemployment at NAIRU/natural rate — not zero.', embedHint: 'Mark Yf on LRAS — some frictional/structural remains.' },
    { caption: 'Policies: fiscal/monetary to boost AD; supply-side for structural.', embedHint: 'Predict policy shift direction to close recessionary gap.' },
  ]),
  '4-6-price-stability': embedSpec([
    { caption: 'Inflation: sustained rise in general price level.', embedHint: 'Move to higher P on AD–AS — identify inflationary gap.' },
    { caption: 'Demand-pull: AD shifts right; cost-push: SRAS shifts left.', embedHint: 'Compare two inflation sources on the diagram.' },
    { caption: 'CPI measures inflation using a basket of goods and services.', embedHint: 'Link diagram P increase to CPI rise in written analysis.' },
    { caption: 'Deflation: falling P — may increase real debt burden.', embedHint: 'AD falls left — lower P and lower Y (deflationary spiral risk).' },
  ]),
  '4-5-energy-work-and-power': embedSpec([
    { caption: 'Work W = Fs cos θ — force in direction of displacement.', embedHint: 'Apply force on ramp — work equals energy transferred.' },
    { caption: 'Kinetic energy KE = ½mv²; gravitational PE = mgh.', embedHint: 'Read KE and GPE bars on the skate park track.' },
    { caption: 'Power P = W/t = Fv — rate of doing work.', embedHint: 'Compare time to climb two ramps — same work, different power.' },
    { caption: 'Conservation of energy (no friction): KE + GPE = constant.', embedHint: 'Turn friction off — total mechanical energy conserved.' },
  ]),
  '3-2-logic-gates-and-logic-circuits': {
    steps: [
      {
        focus: ['basic-gates'],
        caption: 'Basic gates: NOT, AND, OR — truth tables define outputs.',
        embedHint: 'Toggle inputs — read AND/OR output truth table.',
      },
      {
        focus: ['universal'],
        caption: 'NAND and NOR are universal — build any logic from them.',
        embedHint: 'Combine gates to form a half-adder or SR latch pattern.',
      },
      {
        focus: ['algebra'],
        caption: 'Boolean algebra simplifies circuits: De Morgan’s laws.',
        embedHint: 'Compare equivalent circuits with fewer gates.',
      },
      {
        focus: ['circuit'],
        caption: 'Logic circuits combine gates for arithmetic, memory, control.',
        embedHint: 'Trace inputs through multiple gates to final output.',
      },
    ],
  },

  // ── 9701 batch 4 ───────────────────────────────────────────────────────
  '14-1-alkanes': embedSpec([
    { caption: 'Alkanes: CₙH₂ₙ₊₂ — only C–C and C–H σ bonds; saturated.', embedHint: 'Build methane CH₄ — tetrahedral sp³ carbon.' },
    { caption: 'Free-radical substitution: initiation → propagation → termination.', embedHint: 'Replace one H on ethane — note single substitution product.' },
    { caption: 'Combustion: complete → CO₂ + H₂O; incomplete → CO or C.', embedHint: 'Count C and H in alkane for O₂ needed in balanced equation.' },
    { caption: 'Cracking: long alkane → shorter alkane + alkene (C=C).', embedHint: 'Compare saturated vs unsaturated product structures.' },
  ]),
  '18-1-carboxylic-acids': embedSpec([
    { caption: 'R–COOH: carboxyl group — C=O and –OH on same carbon.', embedHint: 'Build ethanoic acid — locate polar O atoms for H-bonding.' },
    { caption: 'Weak acids: Ka ~ 10⁻⁵ — partial dissociation in water.', embedHint: 'Compare H⁺ donation vs strong mineral acids.' },
    { caption: 'Reactions: with bases (salt + water), alcohols (ester), carbonates (CO₂).', embedHint: 'Identify –COOH before predicting salt formation.' },
    { caption: 'Intermolecular H-bonds → higher b.p. than similar mass alkanes/aldehydes.', embedHint: 'Draw dimer H-bonds between two acid molecules.' },
  ]),
  '18-2-esters': embedSpec([
    { caption: 'Ester: R–COO–R′ from acid + alcohol (conc. H₂SO₄, heat).', embedHint: 'Form ethyl ethanoate — ester linkage –COO–.' },
    { caption: 'Naming: alkyl alkanoate (e.g. methyl methanoate).', embedHint: 'Identify alkyl from alcohol and acid chain from carboxylic acid.' },
    { caption: 'Hydrolysis: acid → reverse esterification; alkali → carboxylate + alcohol.', embedHint: 'Compare reversible acid hydrolysis vs saponification.' },
    { caption: 'Uses: fragrances, solvents, biodiesel (methyl esters).', embedHint: 'Note polar C=O and non-polar R groups in structure.' },
  ]),
  '19-1-primary-amines': embedSpec([
    { caption: 'Primary amine R–NH₂ — one alkyl group on nitrogen.', embedHint: 'Build methylamine — lone pair on N for nucleophilic attack.' },
    { caption: 'Basicity: accept H⁺ forming R–NH₃⁺ — stronger than ammonia if +I alkyl.', embedHint: 'Compare electron donation to lone pair availability.' },
    { caption: 'Preparation: reduction of nitriles or amides; Gabriel synthesis.', embedHint: 'Track N oxidation state through reduction steps.' },
    { caption: 'Reactions: with acids (salts), acyl chlorides (amides), HNO₂ (alcohols from 1°).', embedHint: 'Distinguish 1° vs 2° amine products with nitrous acid.' },
  ]),
  '23-1-lattice-energy-and-born-haber-cycles': embedSpec([
    { caption: 'Lattice energy ΔH_latt: gaseous ions → solid ionic lattice (exothermic).', embedHint: 'More exothermic for smaller, higher-charge ions.' },
    { caption: 'Born–Haber cycle: Hess law links ΔH_f° to atomisation, IE, EA, ΔH_latt.', embedHint: 'Trace each step — all paths to formation enthalpy must balance.' },
    { caption: 'Born–Lande / Kapustinskii: magnitude increases with charge, decreases with radius.', embedHint: 'Compare NaCl vs MgO lattice energy magnitudes.' },
    { caption: 'Discrepancy with experimental ΔH_latt suggests covalent character (Fajan’s rules).', embedHint: 'Polarising cation + polarisable anion → partial covalency.' },
  ]),

  // ── 9708 batch 4 ───────────────────────────────────────────────────────
  '5-2-fiscal-policy': embedSpec([
    { caption: 'Fiscal policy: G and T shift AD — multiplier amplifies ΔY.', embedHint: 'Increase G — trace rightward AD shift.' },
    { caption: 'Expansionary: ↑G or ↓T in recession; contractionary opposite in boom.', embedHint: 'Label output gap before choosing policy direction.' },
    { caption: 'Automatic stabilisers vs discretionary changes.', embedHint: 'Progressive tax and benefits vs new infrastructure spend.' },
    { caption: 'Crowding out: higher G may raise r and dampen private I.', embedHint: 'Compare AD boost vs possible investment offset.' },
  ]),
  '5-3-monetary-policy': embedSpec([
    { caption: 'Central bank sets interest rate target — affects C and I via cost of borrowing.', embedHint: 'Rate cut — trace AD increase through consumption and investment.' },
    { caption: 'Expansionary: lower r to close negative output gap.', embedHint: 'Shift AD right — note possible inflation if near full capacity.' },
    { caption: 'Transmission: exchange rate, asset prices, expectations.', embedHint: 'Lower r → currency depreciation → ↑ net exports on AD.' },
    { caption: 'Limits: liquidity trap, time lags, zero lower bound.', embedHint: 'Flat LM or inelastic investment weakens policy bite.' },
  ]),
  '5-4-supply-side-policy': embedSpec([
    { caption: 'Supply-side: shift LRAS right — productive capacity and efficiency.', embedHint: 'Rightward LRAS — higher Y without demand-pull inflation.' },
    { caption: 'Market-based: tax incentives, deregulation, privatisation.', embedHint: 'Lower marginal tax on enterprise — incentive channel.' },
    { caption: 'Interventionist: education, training, infrastructure.', embedHint: 'Human capital ↑ → productivity per worker rises.' },
    { caption: 'Trade-off: benefits long-run; short-run costs and inequality effects.', embedHint: 'Compare LR growth gain vs transitional unemployment.' },
  ]),
  '6-1-the-reasons-for-international-trade': embedSpec([
    { caption: 'Specialisation: countries produce at lower opportunity cost.', embedHint: 'Compare OC ratios — export good with comparative advantage.' },
    { caption: 'Gains from trade: consumption beyond domestic PPF.', embedHint: 'Post-trade consumption point outside pre-trade frontier.' },
    { caption: 'Terms of trade: export price / import price index.', embedHint: 'Improvement if export prices rise relative to imports.' },
    { caption: 'Limitations: transport costs, protectionism, immobile factors.', embedHint: 'Show trade blocked when cost exceeds gain from specialisation.' },
  ]),

  // ── 9709 batch 4 ───────────────────────────────────────────────────────
  '1-2-functions': embedSpec([
    { caption: 'Function: each input x maps to exactly one output f(x).', embedHint: 'Vertical line test — one y per x on graph.' },
    { caption: 'Domain (inputs) and range (outputs) — restrictions from √(·), ln(·), ÷0.', embedHint: 'Adjust x — note where f(x) is undefined.' },
    { caption: 'Composite f∘g: apply g first, then f.', embedHint: 'Build f(g(x)) — track inner then outer rule.' },
    { caption: 'Inverse f⁻¹ exists only for one-to-one functions; reflection in y = x.', embedHint: 'Swap x and y — domain of f⁻¹ = range of f.' },
  ]),
  '2-1-algebra': embedSpec([
    { caption: 'Polynomial division — factor theorem links roots to (x − a) factors.', embedHint: 'Substitute x = a — zero remainder confirms factor.' },
    { caption: 'Partial fractions: proper rational functions decompose for integration.', embedHint: 'Set up A/(x−a) + B/(x−b) — equate coefficients.' },
    { caption: 'Binomial expansion (1 + x)ⁿ for |x| < 1 when n not integer.', embedHint: 'First terms: 1 + nx + n(n−1)x²/2! + …' },
    { caption: 'Modulus |x|: piecewise definition; solve |f(x)| = k by cases.', embedHint: 'Split at points where argument changes sign.' },
  ]),
  '3-8-differential-equations': embedSpec([
    { caption: 'First order: dy/dx = f(x,y) — slope field shows direction at each point.', embedHint: 'Read slope at (x,y) — sketch solution through initial condition.' },
    { caption: 'Separable: ∫(1/g(y)) dy = ∫f(x) dx + c.', embedHint: 'Separate variables — integrate both sides.' },
    { caption: 'Linear integrating factor e^∫P dx for dy/dx + Py = Q.', embedHint: 'Multiply through by IF — left side becomes d/dx(y·IF).' },
    { caption: 'Modelling: exponential growth/decay, Newton cooling, logistic.', embedHint: 'Match dN/dt = kN to exponential solution N = N₀e^{kt}.' },
  ]),
  '3-4-differentiation': embedSpec([
    { caption: 'P3: product, quotient, chain rules on combined functions.', embedHint: 'Differentiate e^{sin x} — chain rule layer by layer.' },
    { caption: 'Implicit differentiation: d/dx both sides when y not isolated.', embedHint: 'x² + y² = r² → 2x + 2y dy/dx = 0.' },
    { caption: 'Parametric: dy/dx = (dy/dt)/(dx/dt).', embedHint: 'Eliminate parameter or differentiate x(t), y(t) separately.' },
    { caption: 'Related rates: link derivatives via constraint equation.', embedHint: 'Differentiate V = (4/3)πr³ w.r.t. time for dV/dt.' },
  ]),

  // ── 9701 batch 5 ───────────────────────────────────────────────────────
  '9-1-periodicity-of-physical-properties-of-the-elements-in-period-3': embedSpec([
    { caption: 'Atomic radius decreases across Period 3 (nuclear charge ↑).', embedHint: 'Add protons — electrons pulled closer, radius shrinks.' },
    { caption: 'First ionisation energy generally rises — jump at Group 13 and 16.', embedHint: 'Note sub-shell stability at Group 18 (Ne).' },
    { caption: 'Melting point peaks at Group 14 (giant covalent Si).', embedHint: 'Compare metallic Na/Mg/Al vs giant structures.' },
    { caption: 'Electrical conductivity falls from metals to non-metal Si, P, S.', embedHint: 'Relate bonding type to mobile charge carriers.' },
  ]),
  '9-2-periodicity-of-chemical-properties-of-the-elements-in-period-3': embedSpec([
    { caption: 'Na₂O, MgO basic; Al₂O₃ amphoteric; SiO₂, P₄O₁₀, SO₃ acidic oxides.', embedHint: 'Classify oxide + water products as acid or base.' },
    { caption: 'Reaction with water: Na vigorous; Mg slow; Al/Si insoluble oxides.', embedHint: 'Match oxide character to pH of aqueous products.' },
    { caption: 'Chlorides: NaCl neutral; AlCl₃, SiCl₄ hydrolyse to acidic solutions.', embedHint: 'Track cation charge density and hydrolysis.' },
    { caption: 'Max oxidation state rises to Group 15 then falls — inert pair effect later.', embedHint: 'Compare highest oxides across Na → Cl.' },
  ]),
  '10-1-similarities-and-trends-in-the-properties-of-the-group-2-metals-magnesium-to-barium-and-their-compounds':
    embedSpec([
      { caption: 'Reactivity ↑ down Group 2 — easier ionisation, lower ΔH_latt hydration offset.', embedHint: 'Compare reaction vigour with cold water.' },
      { caption: 'M + 2H₂O → M(OH)₂ + H₂; M + dilute HCl → MCl₂ + H₂.', embedHint: 'Balance and state observations for Mg vs Ba.' },
      { caption: 'Thermal stability of carbonates/nitrates ↓ down group (larger cation polarises less).', embedHint: 'Decomposition temperature trend.' },
      { caption: 'Solubility of hydroxides ↑ down group; sulfates ↓ (BaSO₄ insoluble).', embedHint: 'Apply to barium meal and sulfate test.' },
    ]),
  '11-2-the-chemical-properties-of-the-halogen-elements-and-the-hydrogen-halides': embedSpec([
    { caption: 'X₂ + 2e⁻ → 2X⁻ — oxidising power ↓ down group (F₂ most reactive).', embedHint: 'Compare displacement reactions.' },
    { caption: 'H–X bond enthalpy peaks at HF then ↓ — HF anomalously strong H-bonds.', embedHint: 'Relate bond strength to acid strength in water.' },
    { caption: 'HX(aq) acid strength: HF < HCl < HBr < HI.', embedHint: 'Bond enthalpy vs polarity factors.' },
    { caption: 'Disproportionation: Cl₂ + OH⁻ → Cl⁻ + ClO⁻ (+ water) cold dilute.', embedHint: 'Identify oxidation state changes on chlorine.' },
  ]),
  '12-1-nitrogen-and-sulfur': embedSpec([
    { caption: 'N₂ triple bond — inert at room T; Haber process: N₂ + 3H₂ ⇌ 2NH₃.', embedHint: 'High T, pressure, catalyst needed.' },
    { caption: 'NO, NO₂ from lightning/combustion — acid rain and photochemical smog.', embedHint: 'NO₂ + H₂O → HNO₃ + HNO₂ pathway.' },
    { caption: 'SO₂ from fossil fuels → SO₃ → H₂SO₄ in rain.', embedHint: 'Contact process: 2SO₂ + O₂ ⇌ 2SO₃.' },
    { caption: 'Test for NH₃: damp red litmus blue; SO₂: acidified K₂Cr₂O₇ green.', embedHint: 'Link tests to gas properties.' },
  ]),
  '23-2-enthalpies-of-solution-and-hydration': embedSpec([
    { caption: 'ΔH_sol = ΔH_latt + ΣΔH_hyd (Hess cycle for ionic solute).', embedHint: 'Lattice endothermic; hydration exothermic.' },
    { caption: 'More exothermic hydration favours dissolution if |hydration| > |lattice|.', embedHint: 'Compare NaCl vs AgCl solubility energetics.' },
    { caption: 'ΔH_hyd ∝ charge²/r — small highly charged ions hydrate strongly.', embedHint: 'Mg²⁺ vs Na⁺ hydration enthalpy magnitude.' },
    { caption: 'Born–Haber + hydration cycles predict solubility trends.', embedHint: 'Draw full cycle with gaseous ions and aqueous products.' },
  ]),
  '23-4-gibbs-free-energy-change-g': embedSpec([
    { caption: 'ΔG = ΔH − TΔS — spontaneous when ΔG < 0.', embedHint: 'Negative ΔH and positive ΔS both favour spontaneity.' },
    { caption: 'ΔG° = −nFE° for electrochemical cells.', embedHint: 'Link thermodynamics to electrode potentials.' },
    { caption: 'Temperature can reverse feasibility if ΔH and ΔS oppose.', embedHint: 'Find T when ΔG = 0: T = ΔH/ΔS.' },
    { caption: 'ΔG and equilibrium: ΔG° = −RT ln K.', embedHint: 'Large K when ΔG° very negative.' },
  ]),
  '24-1-electrolysis': embedSpec([
    { caption: 'Electrolysis: DC drives non-spontaneous redox at electrodes.', embedHint: 'Trace electron flow from battery to ions.' },
    { caption: 'Cations → cathode (reduction); anions → anode (oxidation).', embedHint: 'Remember OIL RIG at each electrode.' },
    { caption: 'Molten vs aqueous — H⁺/OH⁻ may compete at electrodes.', embedHint: 'Predict products for CuSO₄(aq) vs molten NaCl.' },
    { caption: 'Faraday: mass ∝ charge ∝ current × time.', embedHint: 'Use n = Q/F to find moles of product.' },
  ]),

  // ── 9708 batch 5 ───────────────────────────────────────────────────────
  '6-2-protectionism': embedSpec([
    { caption: 'Tariffs and quotas restrict imports — protect domestic industry.', embedHint: 'Show world price vs domestic price with tariff.' },
    { caption: 'Tariff raises government revenue but causes deadweight loss.', embedHint: 'Shade lost consumer surplus vs producer gain.' },
    { caption: 'Arguments for: infant industry, anti-dumping, national security.', embedHint: 'Evaluate short-run protection vs long-run inefficiency.' },
    { caption: 'WTO aims to reduce barriers — trade creation vs trade diversion.', embedHint: 'Compare free trade vs protected equilibrium quantity.' },
  ]),
  '6-3-current-account-of-the-balance-of-payments': embedSpec([
    { caption: 'Current account = trade in goods + services + primary + secondary income.', embedHint: 'X − M on goods is balance of trade.' },
    { caption: 'Deficit: spending abroad > earnings; surplus opposite.', embedHint: 'Link net exports to AD component (X−M).' },
    { caption: 'Causes: exchange rate, competitiveness, growth differentials.', embedHint: 'Strong currency worsens trade balance.' },
    { caption: 'Sustainability: financing via capital/financial account flows.', embedHint: 'CA + KA + FA balances with errors/omissions.' },
  ]),
  '6-4-exchange-rates': embedSpec([
    { caption: 'Exchange rate: price of one currency in another (e.g. £/$).', embedHint: 'Depreciation → exports cheaper abroad.' },
    { caption: 'Floating: market supply/demand for currency determines rate.', embedHint: 'Shift demand for £ from foreign investors.' },
    { caption: 'Appreciation ↑ import spending power; hurts export competitiveness.', embedHint: 'Trace effect on X, M, and AD.' },
    { caption: 'Managed/fixed: central bank intervention in forex markets.', embedHint: 'Buy/sell reserves to target band.' },
  ]),

  // ── 9709 batch 5 ───────────────────────────────────────────────────────
  '2-3-trigonometry': embedSpec([
    { caption: 'P2 identities: sin²θ + cos²θ = 1; tan θ = sin θ / cos θ.', embedHint: 'Derive from unit circle coordinates.' },
    { caption: 'Solve a sin θ + b cos θ = R sin(θ + α).', embedHint: 'Use R = √(a² + b²) and phase angle.' },
    { caption: 'Double angle: sin 2θ, cos 2θ formulae from compound angles.', embedHint: 'Expand sin(θ + θ) to get 2 sin θ cos θ.' },
    { caption: 'Equations in interval — count solutions using graph symmetry.', embedHint: 'Sketch y = sin x and horizontal line.' },
  ]),
  '2-4-differentiation': embedSpec([
    { caption: 'P2: product and quotient rules; chain rule for composites.', embedHint: 'Differentiate x² sin x — product rule.' },
    { caption: 'Stationary points: f′(x) = 0 — max, min, or point of inflection.', embedHint: 'Second derivative test or sign chart of f′.' },
    { caption: 'Connected rates of change — link dy/dt and dx/dt.', embedHint: 'Differentiate constraint equation w.r.t. time.' },
    { caption: 'Optimisation problems — form equation, differentiate, verify max/min.', embedHint: 'State domain restrictions from context.' },
  ]),
  '3-1-algebra': embedSpec([
    { caption: 'P3 modulus: |f(x)| graphs — reflect negative portions.', embedHint: 'Sketch y = |2x − 3| with vertex at x = 1.5.' },
    { caption: 'Partial fractions with repeated or quadratic factors.', embedHint: 'Ax + B for irreducible quadratic denominator.' },
    { caption: 'Binomial for rational n — validity |x| < 1.', embedHint: 'First three terms of (1 − 2x)^{−½}.' },
    { caption: 'Polynomial roots — factor theorem and complex conjugate pairs.', embedHint: 'If 2 + i is root, so is 2 − i.' },
  ]),
  '4-1-forces-and-equilibrium': embedSpec([
    { caption: 'Force as vector — resolve into perpendicular components.', embedHint: 'Split weight mg into parallel/perpendicular on slope.' },
    { caption: 'Equilibrium: ΣF = 0 (no translation); Στ = 0 (no rotation).', embedHint: 'Set sum of horizontal and vertical components zero.' },
    { caption: 'Limiting friction: F ≤ μR — object on point of sliding.', embedHint: 'Compare driving force to μR on incline.' },
    { caption: 'Free-body diagram — isolate object, show all external forces.', embedHint: 'Normal reaction perpendicular to surface.' },
  ]),
  '5-1-representation-of-data': embedSpec([
    { caption: 'Grouped data: class boundaries, midpoints, frequency density.', embedHint: 'Histogram height = frequency / class width.' },
    { caption: 'Mean of grouped data: Σfx / Σf with midpoints.', embedHint: 'Estimate using class centres.' },
    { caption: 'Median class from cumulative frequency curve.', embedHint: 'n/2 position on ogive.' },
    { caption: 'Measure spread: range, IQR, standard deviation (calculator).', embedHint: 'Compare two distributions by centre and spread.' },
  ]),

  // ── 9701 batch 6 ───────────────────────────────────────────────────────
  '11-3-some-reactions-of-the-halide-ions': embedSpec([
    { caption: 'Halide tests: Cl⁻, Br⁻, I⁻ with Ag⁺ — precipitate colours and NH₃ behaviour.', embedHint: 'AgCl white dissolves in NH₃; AgI yellow insoluble.' },
    { caption: 'Concentrated H₂SO₄ oxidises I⁻ to I₂; H₂S formed from I⁻.', embedHint: 'Compare redox behaviour down halide series.' },
    { caption: 'Halides as reducing agents ↑ down group.', embedHint: 'I⁻ reduces Cu²⁺; Cl⁻ does not.' },
    { caption: 'Displacement: Cl₂ + 2I⁻ → I₂ + 2Cl⁻.', embedHint: 'More reactive halogen displaces less reactive halide.' },
  ]),
  '11-4-the-reactions-of-chlorine': embedSpec([
    { caption: 'Cl₂ + H₂O ⇌ HCl + HOCl — chlorine water is oxidising bleach.', embedHint: 'Disproportionation in water.' },
    { caption: 'Cold dilute NaOH: Cl₂ → Cl⁻ + ClO⁻ (bleach).', embedHint: 'Hot concentrated NaOH gives Cl⁻ + ClO₃⁻.' },
    { caption: 'Chlorination of water: kills bacteria — HOCl disinfectant.', embedHint: 'Environmental benefit vs chlorinated organics risk.' },
    { caption: 'Reaction with hydrocarbons: free-radical substitution (UV).', embedHint: 'Link to alkane chlorination mechanism.' },
  ]),
  '20-1-addition-polymerisation': embedSpec([
    { caption: 'Addition polymer: C=C opens — repeat unit loses double bond.', embedHint: 'Ethene → –[CH₂–CH₂]ₙ– poly(ethene).' },
    { caption: 'Monomer must contain C=C — no by-product formed.', embedHint: 'Contrast with condensation polymerisation.' },
    { caption: 'Disposal/recycling issues — non-biodegradable polyalkenes.', embedHint: 'Environmental chemistry link.' },
    { caption: 'Draw one repeat unit from displayed formula.', embedHint: 'Bracket shows repeating section only once.' },
  ]),
  '21-1-organic-synthesis': embedSpec([
    { caption: 'Multi-step routes: identify reagents for each functional group change.', embedHint: 'Alkene → diol → aldehyde → acid pathway.' },
    { caption: 'Protecting groups and selectivity at A Level extension.', embedHint: 'Primary alcohol oxidised before tertiary if conditions chosen.' },
    { caption: 'Test-tube reactions confirm intermediate functional groups.', embedHint: 'Tollens, Fehling, 2,4-DNPH sequence.' },
    { caption: 'Two-step synthesis from given start material — plan backwards.', embedHint: 'Target molecule → penultimate → … → starting material.' },
  ]),
  '23-3-entropy-change-s': embedSpec([
    { caption: 'Entropy S: measure of disorder — more microstates = higher S.', embedHint: 'Gas > liquid > solid for same substance.' },
    { caption: 'ΔS positive when disorder increases (e.g. solid → gas).', embedHint: 'Melting and boiling have positive ΔS.' },
    { caption: 'ΔS = S(products) − S(reactants) from tables.', embedHint: 'More moles of gas usually increases ΔS.' },
    { caption: 'Combine with ΔH in ΔG = ΔH − TΔS for feasibility.', embedHint: 'Endothermic reactions feasible if ΔS large and T high.' },
  ]),
  '24-2-standard-electrode-potentials-e-standard-cell-potentials-ecell-and-the-nernst-equation': embedSpec([
    { caption: 'E° measures tendency to reduce — higher E° = stronger oxidising agent.', embedHint: 'Read standard hydrogen electrode as 0.00 V reference.' },
    { caption: 'E°cell = E°(cathode) − E°(anode) for spontaneous cell.', embedHint: 'Cathode has higher (less negative) E°.' },
    { caption: 'ΔG° = −nFE°cell — link thermodynamics to electrochemistry.', embedHint: 'F = 96500 C mol⁻¹.' },
    { caption: 'Nernst: E = E° − (RT/nF) ln Q — non-standard concentrations.', embedHint: 'At 298 K use 0.059/n log Q form.' },
  ]),

  // ── 9708 batch 6 ───────────────────────────────────────────────────────
  '7-2-indifference-curves-and-budget-lines': embedSpec([
    { caption: 'Indifference curve: combinations giving equal utility — convex to origin.', embedHint: 'Higher curve = higher utility.' },
    { caption: 'Budget line: income = P_x·X + P_y·Y — slope −P_x/P_y.', embedHint: 'Pivot when one price changes.' },
    { caption: 'Utility max at tangency: MRS = P_x/P_y.', embedHint: 'Equal marginal utility per dollar.' },
    { caption: 'Income/substitution effects from price change (extension).', embedHint: 'Decompose movement along new budget line.' },
  ]),
  '7-3-efficiency-and-market-failure': embedSpec([
    { caption: 'Allocative efficiency: MSB = MSC at social optimum.', embedHint: 'Compare with private equilibrium MSB = MPC.' },
    { caption: 'Productive efficiency: minimum ATC on PPF or LRAC.', embedHint: 'Firm on lowest cost curve.' },
    { caption: 'Market failure: externalities, public goods, merit/demerit goods.', embedHint: 'Quantity ≠ social optimum.' },
    { caption: 'Deadweight loss triangle when market over- or under-produces.', embedHint: 'Shade welfare lost from wrong quantity.' },
  ]),
  '7-4-private-costs-and-benefits-externalities-and-social-costs-and-benefits': embedSpec([
    { caption: 'MPC private cost; MSC = MPC + external cost.', embedHint: 'Negative externality: MSC above MPC.' },
    { caption: 'MPB private benefit; MSB = MPB + external benefit.', embedHint: 'Positive externality: MSB above MPB.' },
    { caption: 'Overproduction when negative externality — MSC > MSB at market Q.', embedHint: 'Pollution example.' },
    { caption: 'Pigouvian tax/subsidy moves Q toward social optimum.', embedHint: 'Tax per unit = external cost at optimum.' },
  ]),
  '7-6-different-market-structures': embedSpec([
    { caption: 'Perfect competition: many firms, homogeneous product, price taker.', embedHint: 'Horizontal demand curve for individual firm.' },
    { caption: 'Monopoly: single seller — downward sloping demand, barriers to entry.', embedHint: 'MR below AR for linear demand.' },
    { caption: 'Oligopoly: interdependence — kinked demand, game theory.', embedHint: 'Few firms dominate market share.' },
    { caption: 'Monopolistic competition: differentiated products, free entry long run.', embedHint: 'Excess capacity at tangency of D and AC.' },
  ]),

  // ── 9709 batch 6 ───────────────────────────────────────────────────────
  '3-2-logarithmic-and-exponential-functions': embedSpec([
    { caption: 'y = e^x and y = ln x are inverse functions — reflection in y = x.', embedHint: 'Domain of ln x is x > 0.' },
    { caption: 'Laws of logarithms: ln(ab) = ln a + ln b; ln(a^n) = n ln a.', embedHint: 'Use to solve a^x = b.' },
    { caption: 'Differentiate e^{f(x)} and ln(f(x)) — chain rule.', embedHint: 'd/dx e^{2x} = 2e^{2x}.' },
    { caption: 'Modelling growth/decay: N = N₀e^{kt}.', embedHint: 'Half-life from k = ln 2 / t_{½}.' },
  ]),
  '3-6-numerical-solution-of-equations': embedSpec([
    { caption: 'Change of sign indicates root in interval [a, b].', embedHint: 'f(a)f(b) < 0 — locate root graphically.' },
    { caption: 'Iteration x_{n+1} = g(x_n) — converges if |g′(x)| < 1 near root.', embedHint: 'Rearrange f(x) = 0 to suitable g(x).' },
    { caption: 'Newton–Raphson: x_{n+1} = x_n − f(x_n)/f′(x_n).', embedHint: 'Fast convergence if good starting value.' },
    { caption: 'Show convergence failure when gradient small or wrong start.', embedHint: 'Sketch cobweb or staircase diagram.' },
  ]),
  '4-2-kinematics-of-motion-in-a-straight-line': embedSpec([
    { caption: 'SUVAT for constant acceleration — pick equation without unknown.', embedHint: 'v² = u² + 2as when t unknown.' },
    { caption: 'Gradient of s–t graph = velocity; gradient of v–t = acceleration.', embedHint: 'Area under v–t = displacement.' },
    { caption: 'Free fall: a = g (≈ 9.8 m s⁻²) unless air resistance ignored.', embedHint: 'Sign convention: choose positive direction.' },
    { caption: 'Calculus link: v = ds/dt, a = dv/dt.', embedHint: 'Integrate a to find v, then s.' },
  ]),
  '4-3-momentum': embedSpec([
    { caption: 'Momentum p = mv — vector quantity conserved in closed system.', embedHint: 'Total p before = total p after collision.' },
    { caption: 'Impulse = change in momentum = FΔt.', embedHint: 'Area under force–time graph.' },
    { caption: 'Elastic: KE conserved; inelastic: KE not conserved.', embedHint: 'Coefficient of restitution e = relative speed after/before.' },
    { caption: 'Explosion problems: internal forces — total p still zero if start at rest.', embedHint: 'm₁v₁ + m₂v₂ = 0 for two fragments.' },
  ]),
  '5-2-permutations-and-combinations': embedSpec([
    { caption: 'nPr = n!/(n−r)! — order matters (arrangements).', embedHint: 'Line up r people from n — first slot n choices.' },
    { caption: 'nCr = n!/((n−r)!r!) — order does not matter (selections).', embedHint: 'Choose committee of r from n.' },
    { caption: 'With repetition or restriction — multiply/adjust factorials.', embedHint: 'Letters in WORD vs MISSISSIPPI.' },
    { caption: 'Binomial probability links to nCr coefficients.', embedHint: 'C(n,r) p^r (1−p)^{n−r} for r successes.' },
  ]),

  // ── 9709 batch 7 ───────────────────────────────────────────────────────
  '1-4-circular-measure': embedSpec([
    { caption: 'Radian: angle subtended when arc length = radius (θ = s/r).', embedHint: '360° = 2π rad — convert using π.' },
    { caption: 'Arc length s = rθ; sector area = ½r²θ (θ in radians).', embedHint: 'Use radians in all calculus trig.' },
    { caption: 'Small angle: sin θ ≈ θ ≈ tan θ for θ in radians.', embedHint: 'Check calculator mode — degrees vs radians.' },
    { caption: 'Angular speed ω = θ/t; v = rω.', embedHint: 'Link linear and angular motion.' },
  ]),
  '2-5-integration': embedSpec([
    { caption: 'P2 integration reverses differentiation — +c for indefinite integrals.', embedHint: '∫x^n dx = x^{n+1}/(n+1) + c, n ≠ −1.' },
    { caption: 'Definite integral: F(b) − F(a) gives signed area.', embedHint: 'Shade regions below axis — subtract area.' },
    { caption: 'Trapezium rule estimates area from strip widths.', embedHint: 'More strips → better accuracy.' },
    { caption: 'Area between curves: ∫(upper − lower) dx.', embedHint: 'Find intersection points as limits.' },
  ]),
  '2-6-numerical-solution-of-equations': embedSpec([
    { caption: 'P2 iteration: rearrange f(x) = 0 to x = g(x).', embedHint: 'Choose g so |g′(x)| < 1 near root.' },
    { caption: 'Sign change in [a,b] locates a root.', embedHint: 'Sketch y = f(x) crossing x-axis.' },
    { caption: 'Failure when iteration diverges — show iterates.', embedHint: 'Cobweb diagram spiralling away.' },
    { caption: 'Compare accuracy after n iterations.', embedHint: 'Stop when consecutive terms agree to required d.p.' },
  ]),
  '5-4-discrete-random-variables': embedSpec([
    { caption: 'Discrete X: list x with P(X = x) — probabilities sum to 1.', embedHint: 'Table format for distribution.' },
    { caption: 'E(X) = Σx P(X = x) — weighted mean.', embedHint: 'Fair die: E = 3.5.' },
    { caption: 'Var(X) = E(X²) − [E(X)]².', embedHint: 'Standard deviation = √Var(X).' },
    { caption: 'Linear transform: E(aX + b) = aE(X) + b.', embedHint: 'Var(aX + b) = a²Var(X) only.' },
  ]),
  '6-1-the-poisson-distribution': embedSpec([
    { caption: 'Poisson models events in fixed interval — mean λ.', embedHint: 'Rare, independent events (e.g. defects per metre).' },
    { caption: 'P(X = r) = e^{−λ} λ^r / r!.', embedHint: 'Use tables or calculator for cumulative probs.' },
    { caption: 'E(X) = Var(X) = λ — unique property.', embedHint: 'If mean ≠ variance, reconsider model.' },
    { caption: 'Poisson approx to binomial when n large, p small, np = λ.', embedHint: 'np < 10 rule of thumb.' },
  ]),

  // ── 9701 batch 7 ───────────────────────────────────────────────────────
  '9-3-chemical-periodicity-of-other-elements': embedSpec([
    { caption: 'Transition metals: variable oxidation states, coloured compounds.', embedHint: 'd-block — partially filled d subshell.' },
    { caption: 'Catalysts: Fe in Haber; V₂O₅ in Contact process.', embedHint: 'Provide alternative reaction pathway.' },
    { caption: 'Compare groups 1, 2, 17 trends with Period 3 patterns.', embedHint: 'Reactivity and bonding across table.' },
    { caption: 'Scandium to zinc — similar atomic radii, different properties.', embedHint: 'General electronic structure [Ar] 3dⁿ 4s².' },
  ]),
  '25-1-acids-and-bases': embedSpec([
    { caption: 'Brønsted–Lowry: acid proton donor, base proton acceptor.', embedHint: 'Conjugate acid–base pairs differ by H⁺.' },
    { caption: 'Ka, pKa, pH — weak acid partial dissociation.', embedHint: 'pH = ½(pKa − log c) for weak monoprotic acid approximation.' },
    { caption: 'Buffer resists pH change — weak acid + conjugate base.', embedHint: 'Henderson–Hasselbalch: pH = pKa + log([A⁻]/[HA]).' },
    { caption: 'Titration curves — equivalence point pH depends on acid/base strength.', embedHint: 'Strong acid + strong base → pH 7 at equivalence.' },
  ]),
  '25-2-partition-coefficients': embedSpec([
    { caption: 'K_pc = [substance in solvent A] / [substance in solvent B] at equilibrium.', embedHint: 'Ratio of concentrations in two immiscible layers.' },
    { caption: 'Non-polar solute prefers non-polar solvent (like dissolves like).', embedHint: 'I₂ more soluble in hexane than water.' },
    { caption: 'Extraction uses repeated partitioning to isolate product.', embedHint: 'Multiple small extractions > one large.' },
    { caption: 'Temperature affects K_pc — state assumptions in questions.', embedHint: 'Usually quoted at 298 K.' },
  ]),
  '26-1-simple-rate-equations-orders-of-reaction-and-rate-constants': embedSpec([
    { caption: 'Rate = k[A]^m[B]^n — orders m, n from experiment only.', embedHint: 'Initial rates method or half-life method.' },
    { caption: 'Overall order = m + n; units of k depend on order.', embedHint: 'First order: k in s⁻¹; second order: dm³ mol⁻¹ s⁻¹.' },
    { caption: 'Half-life constant for first order: t_{½} = ln 2 / k.', embedHint: 'Independent of initial concentration.' },
    { caption: 'Arrhenius: k = Ae^{−Ea/RT} — temperature effect on rate.', embedHint: 'Plot ln k vs 1/T for Ea.' },
  ]),

  // ── 9708 batch 7 ───────────────────────────────────────────────────────
  '8-1-government-policies-to-achieve-efficient-resource-allocation-and-correct-market-failure':
    embedSpec([
      { caption: 'Tax on negative externality — shift MPC up toward MSC.', embedHint: 'Correct overproduction — Pigouvian tax.' },
      { caption: 'Subsidy on positive externality — shift MPB up toward MSB.', embedHint: 'Education, healthcare merit goods.' },
      { caption: 'Regulation, tradable permits, public provision alternatives.', embedHint: 'Compare command vs market-based instruments.' },
      { caption: 'Government failure: imperfect info, bureaucracy, unintended effects.', embedHint: 'Evaluate vs market failure.' },
    ]),
  '8-2-equity-and-redistribution-of-income-and-wealth': embedSpec([
    { caption: 'Equity vs equality — fair opportunity vs equal outcomes.', embedHint: 'Progressive tax takes higher % from rich.' },
    { caption: 'Transfer payments redistribute — benefits, pensions.', embedHint: 'Gini coefficient measures inequality.' },
    { caption: 'Trade-off: equity goals may reduce incentives (efficiency).', embedHint: 'Laffer curve debate on tax rates.' },
    { caption: 'Minimum wage, universal basic income policy debates.', embedHint: 'Labour market intervention effects.' },
  ]),
  '9-1-the-circular-flow-of-income': embedSpec([
    { caption: 'Households ↔ firms: factor services for income; spending on G&S.', embedHint: 'Withdrawals: S, T, M; Injections: I, G, X.' },
    { caption: 'Equilibrium when S + T + M = I + G + X.', embedHint: 'Leakages equal injections.' },
    { caption: 'AD = C + I + G + (X − M) from circular flow.', embedHint: 'Multiplier on injections.' },
    { caption: 'Open economy adds foreign sector — current account link.', embedHint: 'M and X in flow diagram.' },
  ]),
  '9-2-economic-growth-and-sustainability': embedSpec([
    { caption: 'Actual growth: ↑ AD; potential growth: LRAS shifts right.', embedHint: 'Sustainable growth within resource limits.' },
    { caption: 'GDP measures output — nominal vs real (inflation adjusted).', embedHint: 'Real GDP per capita as living standard proxy.' },
    { caption: 'Environmental sustainability — external costs of growth.', embedHint: 'Green GDP and renewable transition.' },
    { caption: 'Supply-side capacity vs demand-pull overheating.', embedHint: 'Long-run trend growth rate.' },
  ]),

  // ── 9709 batch 8 ───────────────────────────────────────────────────────
  '6-2-linear-combinations-of-random-variables': embedSpec([
    { caption: 'E(aX + bY) = aE(X) + bE(Y) always (X, Y independent or not).', embedHint: 'Linearity of expectation.' },
    { caption: 'Var(aX + bY) = a²Var(X) + b²Var(Y) if X, Y independent.', embedHint: 'Add variances — no cross term.' },
    { caption: 'Sum of independent normals is normal.', embedHint: 'Use to combine distributions.' },
    { caption: 'Standardise: Z = (X − μ)/σ for normal problems.', embedHint: 'Use tables for probabilities.' },
  ]),
  '6-3-continuous-random-variables': embedSpec([
    { caption: 'PDF f(x): f(x) ≥ 0 and ∫f(x)dx = 1 over range.', embedHint: 'Probability = area under PDF.' },
    { caption: 'CDF F(x) = P(X ≤ x) — cumulative area.', embedHint: 'P(a < X ≤ b) = F(b) − F(a).' },
    { caption: 'E(X) = ∫x f(x) dx; Var(X) = E(X²) − [E(X)]².', embedHint: 'Integration over defined range only.' },
    { caption: 'Uniform and other standard continuous distributions.', embedHint: 'Sketch PDF — height × width = 1.' },
  ]),
  '6-4-sampling-and-estimation': embedSpec([
    { caption: 'Sample mean X̄ estimator of population μ.', embedHint: 'E(X̄) = μ; Var(X̄) = σ²/n.' },
    { caption: 'Central Limit Theorem — X̄ approx normal for large n.', embedHint: 'Use when population not normal.' },
    { caption: 'Confidence interval: x̄ ± z × σ/√n (known σ).', embedHint: '95% → z = 1.96.' },
    { caption: 'Interpret CI — not probability that μ lies in interval.', embedHint: 'Repeated samples — 95% contain μ.' },
  ]),
  '6-5-hypothesis-tests': embedSpec([
    { caption: 'H₀ null hypothesis; H₁ alternative — one- or two-tailed.', embedHint: 'State both before calculating.' },
    { caption: 'Type I error: reject true H₀; Type II: accept false H₀.', embedHint: 'Significance level α = P(Type I).' },
    { caption: 'Test statistic compared to critical value or p-value.', embedHint: 'p < α → reject H₀.' },
    { caption: 'Z-test for mean with known variance; t-test if σ unknown.', embedHint: 'Use correct distribution.' },
  ]),

  // ── 9708 batch 8 ───────────────────────────────────────────────────────
  '9-3-employment-unemployment': embedSpec([
    { caption: 'Frictional, structural, cyclical unemployment definitions.', embedHint: 'Cyclical linked to recession — output gap.' },
    { caption: 'Labour force survey vs claimant count measures.', embedHint: 'Hidden unemployment and underemployment.' },
    { caption: 'NAIRU — unemployment below which inflation accelerates.', embedHint: 'Short-run Phillips curve trade-off.' },
    { caption: 'AD deficiency → cyclical unemployment on AD–AS.', embedHint: 'Expansionary policy to close gap.' },
  ]),
  '9-4-money-and-banking': embedSpec([
    { caption: 'Functions of money: medium of exchange, store of value, unit of account.', embedHint: 'Liquidity preference.' },
    { caption: 'Commercial banks — fractional reserve, credit creation.', embedHint: 'Deposit multiplier (simplified).' },
    { caption: 'Central bank controls base money and interest rates.', embedHint: 'Lender of last resort.' },
    { caption: 'Quantitative easing when conventional policy exhausted.', embedHint: 'Asset purchases increase money supply.' },
  ]),
  '10-1-government-macroeconomic-policy-objectives': embedSpec([
    { caption: 'Objectives: growth, low inflation, full employment, BOP equilibrium.', embedHint: 'Conflicts between objectives.' },
    { caption: 'Low inflation may require contraction — raises unemployment short run.', embedHint: 'Policy trilemma debates.' },
    { caption: 'Supply-side improves long-run growth without demand inflation.', embedHint: 'LRAS focus for sustainable goals.' },
    { caption: 'Open economy adds exchange rate and BOP targets.', embedHint: 'Fixed vs floating constraints.' },
  ]),
  '10-2-links-between-macroeconomic-problems-and-their-interrelatedness': embedSpec([
    { caption: 'Inflation and unemployment — Phillips curve short run.', embedHint: 'Stagflation breaks simple trade-off.' },
    { caption: 'Growth and environment — sustainability conflict.', embedHint: 'External costs of rapid GDP rise.' },
    { caption: 'BOP deficit and exchange rate — policy spillovers.', embedHint: 'Higher interest rates attract capital inflows.' },
    { caption: 'Crowding out: G↑ may reduce I — growth vs investment quality.', embedHint: 'Show on AD–AS and loanable funds.' },
  ]),
  '10-3-effectiveness-of-policy-options-to-meet-all-macroeconomic-objectives': embedSpec([
    { caption: 'Monetary policy effective in demand management — time lags.', embedHint: 'Liquidity trap limits cuts.' },
    { caption: 'Fiscal policy — multiplier vs crowding out and debt.', embedHint: 'Automatic stabilisers first line.' },
    { caption: 'Supply-side for growth without inflation — long lead time.', embedHint: 'Education, infrastructure.' },
    { caption: 'No single policy achieves all objectives — evaluate mix.', embedHint: 'Context-dependent effectiveness.' },
  ]),

  // ── 9701 batch 8 ───────────────────────────────────────────────────────
  '26-2-homogeneous-and-heterogeneous-catalysts': embedSpec([
    { caption: 'Catalyst lowers Ea — alternative mechanism, not consumed.', embedHint: 'More successful collisions.' },
    { caption: 'Homogeneous: same phase as reactants (e.g. Fe²⁺ in I⁻ oxidation).', embedHint: 'Uniform mixing at molecular level.' },
    { caption: 'Heterogeneous: surface adsorption — Haber Fe, Contact V₂O₅.', embedHint: 'Reactants bind active sites on solid.' },
    { caption: 'Poisoning and sintering reduce heterogeneous activity.', embedHint: 'Industrial catalyst maintenance.' },
  ]),
  '28-1-general-physical-and-chemical-properties-of-the-first-row-of-transition-elements-titanium-to-copper':
    embedSpec([
      { caption: 'Variable oxidation states — similar ionisation energies across row.', embedHint: 'Cr³⁺/Cr⁶⁺, Mn²⁺/Mn⁷⁺ examples.' },
      { caption: 'Coloured ions from d–d transitions in complex ions.', embedHint: 'Partially filled d subshell required.' },
      { caption: 'Catalytic behaviour — d orbitals bind reactants.', embedHint: 'Fe in Haber, V₂O₅ in Contact.' },
      { caption: 'Compare atomic radii and densities across Ti→Cu.', embedHint: '3d contraction effect subtle here.' },
    ]),
  '29-3-shapes-of-aromatic-organic-molecules-and-bonds': embedSpec([
    { caption: 'Benzene C₆H₆ — planar hexagon, 120° bond angles.', embedHint: 'Delocalised π system — not alternating single/double.' },
    { caption: 'σ bonds: C–C and C–H framework; π cloud above/below ring.', embedHint: 'Heat of hydrogenation evidence for stability.' },
    { caption: 'Electrophilic substitution preserves aromaticity.', embedHint: 'E+ attacks π system — nitration, halogenation.' },
    { caption: 'Resonance structures — average bond order 1.5.', embedHint: 'Do not draw isolated C=C in benzene.' },
  ]),
  '29-4-isomerism-optical': embedSpec([
    { caption: 'Chiral centre: carbon with four different groups.', embedHint: 'Asymmetric carbon — no plane of symmetry.' },
    { caption: 'Enantiomers are non-superimposable mirror images.', embedHint: 'Rotate molecule — cannot align all groups.' },
    { caption: 'Optical activity — rotate plane-polarised light.', embedHint: 'Racemic mixture: equal enantiomers — no net rotation.' },
    { caption: 'Biological significance — enzyme stereospecificity.', embedHint: 'One enantiomer active, other inert/harmful.' },
  ]),

  // ── 9701 batch 9 ───────────────────────────────────────────────────────
  '28-2-general-characteristic-chemical-properties-of-the-first-set-of-transition-elements-titanium-to-copper':
    embedSpec([
      { caption: 'Complex ions: central metal ion + ligands (Lewis bases).', embedHint: 'Ligands donate lone pair — coordinate bond.' },
      { caption: 'Ligand substitution: reversible exchange of ligands.', embedHint: '[Cu(H₂O)₆]²⁺ + 4Cl⁻ ⇌ [CuCl₄]²⁻ + 6H₂O.' },
      { caption: 'Redox: variable oxidation states in reactions (MnO₄⁻, Cr₂O₇²⁻).', embedHint: 'Balance half-equations in acid solution.' },
      { caption: 'Catalysis on surface or in solution — d orbitals bind reactants.', embedHint: 'Same examples as 28.1 — Fe, V₂O₅.' },
    ]),
  '28-3-colour-of-complexes': embedSpec([
    { caption: 'Split 3d subshell in ligand field — d–d transitions absorb light.', embedHint: 'Complementary colour observed.' },
    { caption: 'Different ligands → different ΔE → different colours.', embedHint: 'Compare [Cu(H₂O)₆]²⁺ blue vs [CuCl₄]²⁻ yellow-green.' },
    { caption: 'Degenerate d orbitals split into t₂g and e_g (octahedral).', embedHint: 'Electron jumps between split levels.' },
    { caption: 'Colourless: d⁰ or d¹⁰ — no d–d transitions (Sc³⁺, Zn²⁺).', embedHint: 'Check d electron count.' },
    ]),
  '28-4-stereoisomerism-in-transition-element-complexes': embedSpec([
    { caption: 'Octahedral MX₆: cis/trans isomerism with two identical ligands.', embedHint: 'Cis: adjacent; trans: opposite positions.' },
    { caption: 'Square planar and octahedral optical isomerism possible.', embedHint: 'No plane of symmetry in complex.' },
    { caption: 'Bidentate ligands (en) enable optical isomers in [M(en)₃]ⁿ⁺.', embedHint: 'Δ and Λ enantiomers.' },
    { caption: 'Contrast with organic stereoisomerism — chiral at metal centre rare.', embedHint: 'Focus on ligand arrangement.' },
    ]),
  '28-5-stability-constants-kstab': embedSpec([
    { caption: 'Kstab = [MLₙ]/([M][L]ⁿ) for formation of complex.', embedHint: 'Large Kstab → stable complex.' },
    { caption: 'Compare ligand strength — NH₃ vs H₂O vs Cl⁻ as ligands.', embedHint: 'Higher Kstab displaces weaker ligands.' },
    { caption: 'Stepwise formation constants K₁, K₂… overall β.', embedHint: 'Product of stepwise constants.' },
    { caption: 'Predict direction of ligand substitution from Kstab values.', embedHint: 'Add excess stronger ligand — shift equilibrium.' },
    ]),
  '29-1-formulas-functional-groups-and-the-naming-of-organic-compounds': embedSpec([
    { caption: 'IUPAC: longest chain, lowest numbers, suffix for functional group.', embedHint: '-ol, -al, -one, -oic acid, -amine.' },
    { caption: 'Displayed vs skeletal vs general formula.', embedHint: 'CₙH₂ₙ₊₂ alkanes; CₙH₂ₙ alkenes.' },
    { caption: 'Primary/secondary/tertiary for alcohols and amines.', embedHint: 'Count carbons on C–OH or C–NH₂.' },
    { caption: 'Recognise ester, amide, acyl chloride, nitrile groups.', embedHint: '–COOR, –CONH₂, –COCl, –CN.' },
    ]),
  '29-2-characteristic-organic-reactions': embedSpec([
    { caption: 'Nucleophilic substitution: halogenoalkanes — SN1/SN2.', embedHint: 'Primary → SN2; tertiary → SN1.' },
    { caption: 'Electrophilic addition: alkenes — HBr, H₂SO₄/H₂O.', embedHint: 'Markovnikov where relevant.' },
    { caption: 'Nucleophilic addition: carbonyls — CN⁻, HCN.', embedHint: 'Aldehydes more reactive than ketones.' },
    { caption: 'Condensation: esterification, amide formation, polymerisation.', embedHint: 'Small molecule eliminated (H₂O, HCl).' },
    ]),
  '30-1-arenes': embedSpec([
    { caption: 'Electrophilic substitution mechanism — arenium ion intermediate.', embedHint: 'E+ attack preserves aromaticity after deprotonation.' },
    { caption: 'Nitration: HNO₃ + H₂SO₄ → NO₂⁺ electrophile.', embedHint: 'Toluene directs ortho/para.' },
    { caption: 'Halogenation: FeBr₃ catalyst — Br⁺ electrophile.', embedHint: 'No UV needed (vs alkanes).' },
    { caption: 'Friedel–Crafts alkylation/acylation — carbocation or acyl ion.', embedHint: 'AlCl₃ catalyst; watch polyalkylation.' },
    ]),

  // ── 9708 batch 9 ───────────────────────────────────────────────────────
  '11-1-policies-to-correct-disequilibrium-in-the-balance-of-payments': embedSpec([
    { caption: 'Current account deficit: expenditure-switching vs expenditure-reducing.', embedHint: 'Devaluation vs deflationary policy.' },
    { caption: 'Expenditure-switching: lower exchange rate → ↑X, ↓M.', embedHint: 'Marshall–Lerner condition.' },
    { caption: 'Expenditure-reducing: cut AD to reduce import spending.', embedHint: 'Contractionary fiscal/monetary.' },
    { caption: 'Supply-side improves competitiveness long run.', embedHint: 'Productivity ↑ → X more competitive.' },
    ]),
  '11-3-economic-development': embedSpec([
    { caption: 'Development: sustained ↑ living standards, HDI, not just GDP.', embedHint: 'Multidimensional indicators.' },
    { caption: 'Human capital: education and health raise productivity.', embedHint: 'LRAS shift right.' },
    { caption: 'Infrastructure and institutions support growth.', embedHint: 'Property rights, rule of law.' },
    { caption: 'Sustainable development balances growth and environment.', embedHint: 'Renewable investment, external cost internalisation.' },
    ]),
  '11-4-characteristics-of-countries-at-different-levels-of-development': embedSpec([
    { caption: 'LICs: primary sector share high; low GDP per capita.', embedHint: 'High population growth, informal economy.' },
    { caption: 'MICs: industrialising — secondary sector grows.', embedHint: 'Export-led growth possible.' },
    { caption: 'HICs: service-dominated; high HDI.', embedHint: 'Ageing population challenges.' },
    { caption: 'Gini coefficient and Lorenz curve measure inequality.', embedHint: 'Higher Gini → more unequal.' },
    ]),
  '11-5-relationship-between-countries-at-different-levels-of-development': embedSpec([
    { caption: 'Trade: primary product exporters face terms of trade decline.', embedHint: 'Prebisch–Singer hypothesis.' },
    { caption: 'FDI and aid flows between developed and developing.', embedHint: 'Technology transfer vs dependency.' },
    { caption: 'Debt burden limits development spending in LICs.', embedHint: 'Debt relief and restructuring debates.' },
    { caption: 'Fair trade and microfinance as alternative approaches.', embedHint: 'Evaluate effectiveness.' },
    ]),
  '11-6-globalisation': embedSpec([
    { caption: 'Globalisation: integrated markets — trade, finance, migration, ideas.', embedHint: 'Multinational corporations key actors.' },
    { caption: 'Benefits: specialisation, lower prices, technology spread.', embedHint: 'Comparative advantage at global scale.' },
    { caption: 'Costs: job losses in declining industries, cultural homogenisation.', embedHint: 'Race to bottom on regulation.' },
    { caption: 'Winners and losers — evaluate distributional effects.', embedHint: 'Skilled vs unskilled labour in HICs.' },
  ]),

  // ── 9701 batch 10 ───────────────────────────────────────────────────────
  '27-1-similarities-and-trends-in-the-properties-of-the-group-2-metals-magnesium-to-barium-and-their-compounds':
    embedSpec([
      { caption: 'A Level Group 2: solubility SO₄²⁻ ↓, OH⁻ ↑ down group.', embedHint: 'BaSO₄ insoluble — barium meal.' },
      { caption: 'Thermal stability CO₃²⁻ and NO₃⁻ ↓ down group.', embedHint: 'Decomposition temperature trend.' },
      { caption: 'Complex ion formation less central than transition metals.', embedHint: 'Contrast with d-block chemistry.' },
      { caption: 'Link to lattice energy and ionic radius arguments.', embedHint: 'Born–Haber style reasoning at A Level.' },
    ]),
  '31-1-halogen-compounds': embedSpec([
    { caption: 'Halogenoarenes: C–X bond stronger — less reactive than halogenoalkanes.', embedHint: 'Sp² C–X partial double bond character.' },
    { caption: 'SN conditions differ — aryl halides need harsh conditions.', embedHint: 'Compare with primary halogenoalkanes.' },
    { caption: 'Uses: pesticides, refrigerants (historical CFCs).', embedHint: 'Environmental impact of halogenated compounds.' },
    { caption: 'Electrophilic substitution on ring vs nucleophilic sub on side chain.', embedHint: 'Identify halogen position.' },
    ]),
  '32-2-phenol': embedSpec([
    { caption: 'Phenol C₆H₅OH — weak acid, pKa ~ 10.', embedHint: 'More acidic than alcohols, less than carboxylic acids.' },
    { caption: 'Ring activation — ortho/para directing for EAS.', embedHint: 'Nitration, bromination with dilute Br₂.' },
    { caption: 'Reacts with NaOH; weakly with Na₂CO₃ not NaHCO₃.', embedHint: 'Distinguishing tests vs alcohols/acids.' },
    { caption: 'Antiseptic and polymer precursor (bakelite from phenol + methanal).', embedHint: 'Industrial context.' },
    ]),
  '33-3-acyl-chlorides': embedSpec([
    { caption: 'RCOCl — reactive carbonyl derivative; fumes in air (HCl).', embedHint: 'PCl₅ or SOCl₂ on carboxylic acid.' },
    { caption: 'Reactions: with alcohols → esters; with amines → amides; with arenes → ketones.', embedHint: 'Friedel–Crafts acylation.' },
    { caption: 'Mechanism: nucleophilic addition–elimination at C=O.', embedHint: 'HCl by-product.' },
    { caption: 'More reactive than carboxylic acids or esters.', embedHint: 'Use for synthesis routes.' },
    ]),
  '34-4-amino-acids': embedSpec([
    { caption: 'General H₂N–CH(R)–COOH — chiral except glycine (R = H).', embedHint: 'Zwitterion H₃N⁺–CH(R)–COO⁻ in solution.' },
    { caption: 'Isoelectric point pI — zwitterion has zero net charge.', embedHint: 'Electrophoresis separation.' },
    { caption: 'Peptide bond –CO–NH– formed by condensation.', embedHint: 'Primary protein structure.' },
    { caption: '20 common amino acids — R group determines properties.', embedHint: 'Acidic, basic, polar, non-polar side chains.' },
    ]),
  '35-1-condensation-polymerisation': embedSpec([
    { caption: 'Small molecule eliminated (H₂O, HCl) each step.', embedHint: 'Contrast addition polymerisation.' },
    { caption: 'Polyester: dicarboxylic acid + diol → –COO– repeat.', embedHint: 'Terylene from benzene-1,4-dicarboxylic acid + ethane-1,2-diol.' },
    { caption: 'Polyamide: diamine + dicarboxylic acid or amino acid.', embedHint: 'Nylon, proteins.' },
    { caption: 'Draw repeat unit showing ester or amide link.', embedHint: 'Bracket shows one repeat only.' },
    ]),

  // ── 9708 batch 10 ───────────────────────────────────────────────────────
  '7-1-utility': embedSpec([
    { caption: 'Total utility — satisfaction from consumption.', embedHint: 'More goods generally ↑ TU initially.' },
    { caption: 'Marginal utility MU — extra utility from one more unit.', embedHint: 'Law of diminishing MU.' },
    { caption: 'Equi-marginal principle: MU_x/P_x = MU_y/P_y at optimum.', embedHint: 'Consumer allocates budget.' },
    { caption: 'Downward demand from falling MU as quantity rises.', embedHint: 'Link to demand curve.' },
    ]),
  '7-5-types-of-cost-revenue-and-profit-short-run-and-long-run-production': embedSpec([
    { caption: 'Fixed vs variable costs — FC do not vary with output.', embedHint: 'TFC horizontal; TVC slopes up.' },
    { caption: 'MC cuts ATC and AVC at their minimum points.', embedHint: 'U-shaped curves from diminishing returns then scale.' },
    { caption: 'Economies of scale ↓ LRAC; diseconomies ↑ LRAC.', embedHint: 'Minimum efficient scale.' },
    { caption: 'Profit = TR − TC; supernormal in short run possible.', embedHint: 'MR = MC rule for profit max.' },
    ]),
  '7-7-growth-and-survival-of-firms': embedSpec([
    { caption: 'Internal growth: new products, markets (organic).', embedHint: 'Slower but less risky.' },
    { caption: 'External: merger, takeover, joint venture.', embedHint: 'Horizontal, vertical, conglomerate.' },
    { caption: 'Diversification spreads risk across markets.', embedHint: 'Unrelated diversification vs core focus.' },
    { caption: 'Survival: cash flow, contingency planning in downturns.', embedHint: 'Retrenchment, asset sales.' },
    ]),
  '8-3-labour-market-forces-and-government-intervention': embedSpec([
    { caption: 'Demand for labour = derived from product demand (MRP).', embedHint: 'MRP = MP × MR.' },
    { caption: 'Supply: wages, migration, participation rate.', embedHint: 'Backward-bending supply possible at high wages.' },
    { caption: 'Equilibrium wage where D_L = S_L.', embedHint: 'Monopsony vs competitive labour market.' },
    { caption: 'Minimum wage may cause unemployment if set above equilibrium.', embedHint: 'Show surplus labour on diagram.' },
    ]),
  '11-2-exchange-rates': embedSpec([
    { caption: 'A Level: currency unions, managed bands, crawling pegs.', embedHint: 'Eurozone example.' },
    { caption: 'Purchasing power parity long-run tendency.', embedHint: 'Same basket should cost same in PPP terms.' },
    { caption: 'Interest rate differential affects capital flows and currency.', embedHint: 'Carry trade concept.' },
    { caption: 'Impossible trinity: fixed FX, free capital, independent monetary policy.', embedHint: 'Pick two of three.' },
  ]),

  // ── 9618 batch 10 ───────────────────────────────────────────────────────
  '15-2-boolean-algebra-and-logic-circuits': {
    steps: [
      {
        focus: ['algebra'],
        caption: 'Boolean laws: De Morgan, distributive, absorption.',
        embedHint: 'Simplify expressions before building circuits.',
      },
      {
        focus: ['universal'],
        caption: 'Karnaugh maps group 1s for minimal SOP.',
        embedHint: 'Wrap edges on K-map.',
      },
      {
        focus: ['circuit'],
        caption: 'Half and full adder from XOR, AND, OR gates.',
        embedHint: 'Chain full adders for multi-bit sum.',
      },
      {
        focus: ['basic-gates'],
        caption: 'Flip-flops store bits — SR, D type at A Level.',
        embedHint: 'Sequential logic vs combinational.',
      },
    ],
  },

  // ── 9701 batch 11 ───────────────────────────────────────────────────────
  '32-1-alcohols': embedSpec([
    { caption: 'Primary: –CH₂OH; secondary: –CHOH–; tertiary: –COH–.', embedHint: 'Lucas test distinguishes 1°, 2°, 3°.' },
    { caption: 'Oxidation: 1° → aldehyde → acid; 2° → ketone; 3° resistant.', embedHint: 'Acidified dichromate or KMnO₄.' },
    { caption: 'Dehydration with conc H₂SO₄ gives alkene.', embedHint: 'Say which H is eliminated for 2° alcohol.' },
    { caption: 'Esterification with carboxylic acid + acid catalyst.', embedHint: 'Reversible — remove water.' },
  ]),
  '33-1-carboxylic-acids': embedSpec([
    { caption: '–COOH: dimer H-bonds, higher bp than similar alcohol.', embedHint: 'Weak acid — partial dissociation.' },
    { caption: 'With carbonates: CO₂ evolved — test for acid.', embedHint: 'RCOOH + Na₂CO₃ → salt + CO₂ + H₂O.' },
    { caption: 'Reduction with LiAlH₄ gives primary alcohol.', embedHint: 'Not with NaBH₄ for acids at AS.' },
    { caption: 'Acyl chloride route for esters and amides.', embedHint: 'More reactive than acid itself.' },
  ]),
  '33-2-esters': embedSpec([
    { caption: 'Ester link: –COO– from acid + alcohol.', embedHint: 'Conc H₂SO₄ catalyst, reflux.' },
    { caption: 'Hydrolysis: acid → reversible; alkali → salt + alcohol.', embedHint: 'Saponification with NaOH.' },
    { caption: 'Fruit/solvent smells — ethyl ethanoate example.', embedHint: 'Name: alkyl from alcohol, -oate from acid.' },
    { caption: 'Polyesters from diacid + diol.', embedHint: 'Link to 35.1 condensation.' },
  ]),
  '34-1-primary-and-secondary-amines': embedSpec([
    { caption: 'R–NH₂ or R₂NH — lone pair on N is nucleophilic.', embedHint: 'Basicity: alkyl amines > NH₃ > aryl amines.' },
    { caption: 'With halogenoalkane: further alkylation to 2°/3° amine.', embedHint: 'Excess NH₃ favours 1° product.' },
    { caption: 'With acyl chloride → amide + HCl.', embedHint: 'Addition–elimination mechanism.' },
    { caption: 'Salt formation with acids — water-soluble ammonium salts.', embedHint: 'RNH₃⁺Cl⁻.' },
  ]),
  '34-2-phenylamine-and-azo-compounds': embedSpec([
    { caption: 'C₆H₅NH₂: lone pair delocalised — weaker base than alkyl amines.', embedHint: 'Needs Sn/HCl to reduce nitrobenzene.' },
    { caption: 'Diazonium salt at 0–5°C: C₆H₅N₂⁺Cl⁻.', embedHint: 'Decomposes above 10°C.' },
    { caption: 'Coupling with phenol gives orange azo dye.', embedHint: 'Electrophilic substitution on activated ring.' },
    { caption: 'Azo compounds: –N=N– chromophore coloured.', embedHint: 'Used in dyes and indicators.' },
  ]),
  '34-3-amides': embedSpec([
    { caption: '–CONH₂: planar C–N partial double bond.', embedHint: 'Much less basic than amines.' },
    { caption: 'From acyl chloride + NH₃ or amine.', embedHint: 'RCOCl + 2NH₃ → RCONH₂ + NH₄Cl.' },
    { caption: 'Acid hydrolysis → carboxylic acid; alkali → salt.', embedHint: 'Heating under reflux.' },
    { caption: 'Proteins: peptide (amide) links between amino acids.', embedHint: 'Link to 34.4.' },
  ]),
  '35-2-predicting-the-type-of-polymerisation': embedSpec([
    { caption: 'C=C monomer → addition polymerisation.', embedHint: 'Same empirical formula as monomer.' },
    { caption: 'Two functional groups → condensation.', embedHint: 'Small molecule eliminated each step.' },
    { caption: 'Diene + diene cross-link possible.', embedHint: 'Check for two reactive sites.' },
    { caption: 'Draw repeat unit with linkage atoms shown.', embedHint: 'Bracket across one full repeat.' },
  ]),

  // ── 9708 batch 11 ───────────────────────────────────────────────────────
  '7-8-differing-objectives-and-policies-of-firms': embedSpec([
    { caption: 'Profit max: MC = MR; draw on diagram.', embedHint: 'Compare with revenue/sales max where MR = 0.' },
    { caption: 'Satisficing: acceptable profit, not maximum.', embedHint: 'Large firms with separation of ownership.' },
    { caption: 'Growth and market share as alternative objectives.', embedHint: 'Predatory pricing, limit pricing.' },
    { caption: 'Corporate social responsibility vs shareholder value.', embedHint: 'Short-run cost vs long-run reputation.' },
  ]),
  '1-2-economic-methodology': embedSpec([
    { caption: 'Positive: testable statements — what is.', embedHint: '"Unemployment rose 2%" is positive.' },
    { caption: 'Normative: value judgements — what ought to be.', embedHint: '"Govt should raise tax" is normative.' },
    { caption: 'Ceteris paribus: one variable changes, others held constant.', embedHint: 'Essential for demand/supply analysis.' },
    { caption: 'Models simplify reality — assumptions stated.', embedHint: 'PPF assumes fixed resources.' },
  ]),
  '1-3-factors-of-production': embedSpec([
    { caption: 'Land: natural resources; rent as reward.', embedHint: 'Includes minerals, climate.' },
    { caption: 'Labour: human effort; wage as reward.', embedHint: 'Quality matters — human capital.' },
    { caption: 'Capital: man-made aids to production; interest.', embedHint: 'Not money — tools, machinery.' },
    { caption: 'Enterprise: risk-taking; profit as reward.', embedHint: 'Organises other factors.' },
  ]),
  '1-4-resource-allocation-in-different-economic-systems': embedSpec([
    { caption: 'Market: price mechanism allocates resources.', embedHint: 'Consumer sovereignty.' },
    { caption: 'Planned: central authority decides output.', embedHint: 'State ownership common.' },
    { caption: 'Mixed: public + private sectors.', embedHint: 'Most modern economies.' },
    { caption: 'Compare efficiency, equity, and incentives.', embedHint: 'Market failure vs government failure.' },
  ]),
  '2-3-price-elasticity-of-supply': embedSpec([
    { caption: 'PES = %ΔQs / %ΔP.', embedHint: 'Usually positive.' },
    { caption: 'Elastic: spare capacity, mobile factors.', embedHint: 'Long run more elastic.' },
    { caption: 'Inelastic: fixed capacity, perishable cannot store.', embedHint: 'Vertical supply = perfectly inelastic.' },
    { caption: 'Tax incidence depends on PES vs PED.', embedHint: 'Inelastic side bears more tax.' },
  ]),

  // ── 9618 batch 11 ───────────────────────────────────────────────────────
  '15-1-processors-parallel-processing-and-virtual-machines': {
    steps: [
      { focus: ['fde'], caption: 'Fetch–decode–execute cycle per core.', embedHint: 'Pipelining overlaps stages.' },
      { focus: ['multicore'], caption: 'Multi-core: true parallel threads.', embedHint: 'Shared memory vs distributed.' },
      { focus: ['vm'], caption: 'Virtual machine: guest OS on hypervisor.', embedHint: 'Resource isolation and portability.' },
      { focus: ['parallel'], caption: 'Parallel processing: SIMD vs MIMD.', embedHint: 'GPU vs multi-core CPU.' },
    ],
  },

  // ── 9701 batch 12 ───────────────────────────────────────────────────────
  '35-3-degradable-polymers': embedSpec([
    { caption: 'Non-biodegradable polyalkenes persist in landfill.', embedHint: 'Compare with starch-based polymers.' },
    { caption: 'Hydrolysable ester/amide links allow breakdown.', embedHint: 'Enzymes or light catalyse degradation.' },
    { caption: 'Photodegradable: UV breaks C–C backbone.', embedHint: 'Carbonyl groups in chain absorb UV.' },
    { caption: 'Trade-off: strength vs environmental impact.', embedHint: 'Recycling vs compostable packaging.' },
  ]),
  '36-1-organic-synthesis': embedSpec([
    { caption: 'Plan retrosynthesis from target molecule.', embedHint: 'Identify key functional group changes.' },
    { caption: 'Interconvert alcohols, carbonyls, acids, esters.', embedHint: 'List reagents for each step.' },
    { caption: 'Protecting groups if needed at A Level.', embedHint: 'Avoid unwanted side reactions.' },
    { caption: 'Multi-step route: one product feeds next step.', embedHint: 'Purify between steps if asked.' },
  ]),
  '37-1-thin-layer-chromatography': embedSpec([
    { caption: 'Stationary phase: silica; mobile: solvent.', embedHint: 'Polar compounds move less (low Rf).' },
    { caption: 'Rf = distance spot / distance solvent front.', embedHint: '0 ≤ Rf ≤ 1.' },
    { caption: 'Compare with known standards.', embedHint: 'Same solvent and plate type.' },
    { caption: 'UV or iodine visualises colourless spots.', embedHint: 'Amino acids need ninhydrin.' },
  ]),
  '37-2-gas-liquid-chromatography': embedSpec([
    { caption: 'Volatile sample in carrier gas (mobile phase).', embedHint: 'Liquid stationary phase on column.' },
    { caption: 'Retention time identifies components.', embedHint: 'Compare with standards.' },
    { caption: 'More volatile → shorter retention time.', embedHint: 'Temperature affects separation.' },
    { caption: 'Area under peak ∝ amount.', embedHint: 'Quantitative GLC.' },
  ]),
  '37-3-carbon-13-nmr-spectroscopy': embedSpec([
    { caption: 'Each distinct C environment gives one peak.', embedHint: 'Symmetry reduces peak count.' },
    { caption: 'Chemical shift δ in ppm from TMS.', embedHint: 'C=O ~ 160–220 ppm.' },
    { caption: 'No C–H splitting in ¹³C NMR (decoupled).', embedHint: 'Simpler than proton NMR.' },
    { caption: 'Count peaks → deduce carbon environments.', embedHint: 'Match to proposed structure.' },
  ]),
  '37-4-proton-h-nmr-spectroscopy': embedSpec([
    { caption: 'δ ppm: shielding by electron density.', embedHint: 'R–CH₃ ~ 0.9; R–CHO ~ 9.7.' },
    { caption: 'Integration ∝ number of equivalent H.', embedHint: 'Area ratio gives H ratio.' },
    { caption: 'Splitting: n+1 rule for adjacent non-equivalent H.', embedHint: 'Triplet = CH₂ next to CH₃.' },
    { caption: 'D₂O exchange removes –OH/–NH peaks.', embedHint: 'Confirms labile protons.' },
  ]),

  // ── 9708 batch 12 ───────────────────────────────────────────────────────
  '1-6-classification-of-goods-and-services': embedSpec([
    { caption: 'Private goods: rival and excludable.', embedHint: 'Food, clothing examples.' },
    { caption: 'Public goods: non-rival, non-excludable.', embedHint: 'Free-rider problem.' },
    { caption: 'Merit goods: undervalued by consumers.', embedHint: 'Education, healthcare.' },
    { caption: 'Demerit goods: overconsumed — negative externalities.', embedHint: 'Tobacco, alcohol.' },
  ]),
  '2-5-consumer-and-producer-surplus': embedSpec([
    { caption: 'Consumer surplus: area below demand, above price.', embedHint: 'Willingness to pay minus price.' },
    { caption: 'Producer surplus: area above supply, below price.', embedHint: 'Price minus minimum acceptable.' },
    { caption: 'Equilibrium maximises total surplus (no tax).', embedHint: 'Deadweight loss if distorted.' },
    { caption: 'Price ceiling/floor reduces surplus.', embedHint: 'Show triangle loss on diagram.' },
  ]),
  '3-1-reasons-for-government-intervention-in-markets': embedSpec([
    { caption: 'Negative externality: MSC > MPC.', embedHint: 'Overproduction vs social optimum.' },
    { caption: 'Positive externality: MSB > MPB.', embedHint: 'Underprovision of merit goods.' },
    { caption: 'Public goods not supplied by market.', embedHint: 'State provision or funding.' },
    { caption: 'Information failure: asymmetric information.', embedHint: 'Healthcare, financial markets.' },
  ]),
  '3-2-methods-and-effects-of-government-intervention-in-markets': embedSpec([
    { caption: 'Indirect tax shifts supply left — raises price.', embedHint: 'Specific vs ad valorem.' },
    { caption: 'Subsidy shifts supply right — lowers price.', embedHint: 'Used for positive externalities.' },
    { caption: 'Regulation: standards, bans, licences.', embedHint: 'Compliance costs.' },
    { caption: 'Maximum/minimum prices create surplus/shortage.', embedHint: 'Draw with demand and supply.' },
  ]),
  '3-3-addressing-income-and-wealth-inequality': embedSpec([
    { caption: 'Progressive income tax: higher rate on higher income.', embedHint: 'Redistributes after market outcomes.' },
    { caption: 'Transfer payments: benefits, pensions.', embedHint: 'Raise disposable income of poor.' },
    { caption: 'Minimum wage may reduce inequality but risks unemployment.', embedHint: 'Evaluate with diagram.' },
    { caption: 'Wealth tax vs income tax — stock vs flow.', embedHint: 'Capital gains, inheritance.' },
  ]),

  // ── 9618 batch 12 ───────────────────────────────────────────────────────
  '19-1-algorithms': {
    steps: [
      {
        focus: ['linear-search'],
        caption: 'Linear search: check each item in order.',
        embedHint: 'O(n) worst case.',
      },
      {
        focus: ['binary-search'],
        caption: 'Binary search: halve sorted list each step.',
        embedHint: 'O(log n) — must be sorted.',
      },
      {
        focus: ['bubble-sort'],
        caption: 'Bubble sort: compare adjacent pairs.',
        embedHint: 'Simple but slow for large n.',
      },
      {
        focus: ['trace-table'],
        caption: 'Trace table for given algorithm input.',
        embedHint: 'Show variable values each pass.',
      },
    ],
  },

  // ── 9708 batch 13 (100% completion) ─────────────────────────────────────
  '4-1-national-income-statistics': embedSpec([
    { caption: 'GDP: total output of goods and services in a year.', embedHint: 'Expenditure, income, output approaches.' },
    { caption: 'GNI = GDP + net property income from abroad.', embedHint: 'Compare open vs closed economy.' },
    { caption: 'Nominal vs real GDP — adjust for inflation.', embedHint: 'Real uses constant prices.' },
    { caption: 'Per capita divides by population.', embedHint: 'Compare living standards cautiously.' },
  ]),
  '4-2-introduction-to-the-circular-flow-of-income': embedSpec([
    { caption: 'Households supply factors; firms pay factor incomes.', embedHint: 'Wages, rent, interest, profit.' },
    { caption: 'Firms sell goods; households consume (C).', embedHint: 'Closed loop without government.' },
    { caption: 'Injections: I, G, X. Withdrawals: S, T, M.', embedHint: 'Equilibrium when J = W.' },
    { caption: 'Multiplier effect of new investment.', embedHint: 'Initial ΔI causes larger ΔY.' },
  ]),
  '5-1-government-macroeconomic-policy-objectives': embedSpec([
    { caption: 'Low unemployment: high employment.', embedHint: 'Frictional, structural, cyclical.' },
    { caption: 'Price stability: low, stable inflation.', embedHint: 'CPI target e.g. 2%.' },
    { caption: 'Economic growth: rising real GDP.', embedHint: 'Sustainable long-run growth.' },
    { caption: 'Balance of payments equilibrium on current account.', embedHint: 'Trade in goods and services.' },
  ]),
  '6-5-policies-to-correct-imbalances-in-the-current-account-of-the-balance-of-payments': embedSpec([
    { caption: 'Deficit: imports > exports of goods/services.', embedHint: 'Show on current account.' },
    { caption: 'Expenditure-reducing: contractionary fiscal/monetary.', embedHint: 'Lowers overall import spending.' },
    { caption: 'Expenditure-switching: devaluation, tariffs.', embedHint: 'Redirect spending to domestic goods.' },
    { caption: 'Supply-side: improve competitiveness.', embedHint: 'Productivity, education, infrastructure.' },
  ]),

  // ── 9701 batch 13 ───────────────────────────────────────────────────────
  '1-3-electrons-energy-levels-and-atomic-orbitals': embedSpec([
    { caption: 'Shells n = 1, 2, 3…; subshells s, p, d.', embedHint: 'Fill order: 1s 2s 2p 3s 3p…' },
    { caption: 'Orbital: region where electron likely found.', embedHint: 'Max 2 electrons per orbital.' },
    { caption: 'Aufbau builds up electron configuration.', embedHint: 'Cr/Cu exceptions at A Level.' },
    { caption: 'Orbitals shape bonding capacity.', embedHint: 's spherical; p dumbbell.' },
  ]),
  '1-4-ionisation-energy': embedSpec([
    { caption: 'First IE: energy to remove 1 mol outer electrons.', embedHint: 'Gas phase, 1+ ions formed.' },
    { caption: 'IE increases across period — nuclear charge.', embedHint: 'Same shell, more protons.' },
    { caption: 'IE decreases down group — larger radius.', embedHint: 'Outer electron farther from nucleus.' },
    { caption: 'Small drops at Group 2→3 and 5→6.', embedHint: 'Subshell repulsion / new shell.' },
  ]),
  '3-2-ionic-bonding': embedSpec([
    { caption: 'Metal loses e⁻; non-metal gains e⁻.', embedHint: 'Electrostatic attraction.' },
    { caption: 'Giant lattice of alternating ions.', embedHint: 'NaCl 6:6 coordination.' },
    { caption: 'High mp, brittle, conduct when molten/aqueous.', embedHint: 'Ions must move to carry charge.' },
    { caption: 'Lattice energy increases with smaller, higher charge ions.', embedHint: 'Born–Haber at A Level.' },
  ]),
  '3-3-metallic-bonding': embedSpec([
    { caption: 'Positive ion lattice in sea of delocalised e⁻.', embedHint: 'Non-directional bonding.' },
    { caption: 'Conductivity and malleability explained.', embedHint: 'Electrons move; layers slide.' },
    { caption: 'Melting point varies with ion charge/size.', embedHint: 'Compare Group 1 vs transition metals.' },
    { caption: 'Alloys: mixed metals change properties.', embedHint: 'Disrupt regular lattice.' },
  ]),
  '13-1-formulas-functional-groups-and-the-naming-of-organic-compounds': embedSpec([
    { caption: 'Homologous series: same functional group, +CH₂.', embedHint: 'General formula e.g. CₙH₂ₙ₊₂.' },
    { caption: 'Functional groups: –OH, –COOH, –CHO, etc.', embedHint: 'Priority for suffix naming.' },
    { caption: 'IUPAC: longest chain, lowest locants.', embedHint: 'Number from end nearer substituent.' },
    { caption: 'Displayed formula shows every bond.', embedHint: 'Skeletal for rings/chains.' },
  ]),
  '13-2-characteristic-organic-reactions': embedSpec([
    { caption: 'Free-radical substitution: alkanes + halogen.', embedHint: 'UV, chain mechanism.' },
    { caption: 'Electrophilic addition: alkenes + HBr, Br₂.', embedHint: 'Markovnikov for unsymmetrical alkene.' },
    { caption: 'Nucleophilic substitution: halogenoalkanes.', embedHint: 'SN1 vs SN2 depends on structure.' },
    { caption: 'Oxidation: alcohols → carbonyls/acids.', embedHint: 'Reagent and conditions matter.' },
  ]),

  // ── 9701 batch 14 (100% completion) ─────────────────────────────────────
  '2-1-relative-masses-of-atoms-and-molecules': embedSpec([
    { caption: 'Ar from periodic table; Cl = 35.5 average.', embedHint: 'Sum Ar for formula mass.' },
    { caption: 'Mr of molecule = sum of atomic masses.', embedHint: 'H₂O Mr = 18.' },
    { caption: 'Define relative isotopic mass vs Ar.', embedHint: 'Carbon-12 standard.' },
    { caption: 'Use Mr in mole calculations.', embedHint: 'Link to 2.2 mole.' },
  ]),
  '2-4-reacting-masses-and-volumes-of-solutions-and-gases': embedSpec([
    { caption: 'n = m / Mr for each species.', embedHint: 'Use balanced equation ratios.' },
    { caption: 'Gas volume at rtp: 1 mol = 24 dm³.', embedHint: 'V = n × 24.' },
    { caption: 'Concentration c = n / V (mol dm⁻³).', embedHint: 'Titration calculations.' },
    { caption: 'Limiting reagent: runs out first.', embedHint: 'Compare mole ratios needed.' },
  ]),
  '3-6-intermolecular-forces-electronegativity-and-bond-properties': embedSpec([
    { caption: 'Instantaneous dipole — induced dipole (id–id).', embedHint: 'Weakest IMF; all molecules.' },
    { caption: 'Permanent dipole–dipole (pd–pd).', embedHint: 'Polar molecules.' },
    { caption: 'Hydrogen bond: H bonded to N, O, F.', embedHint: 'Strongest IMF; explains water anomalies.' },
    { caption: 'Boiling point trends follow IMF strength.', embedHint: 'Compare similar Mr molecules.' },
  ]),
  '3-7-dot-and-cross-diagrams': embedSpec([
    { caption: 'Only outer shell electrons shown.', embedHint: 'Cross for different atoms.' },
    { caption: 'Ionic: transfer then bracket charges.', embedHint: 'Na⁺ [Cl⁻].' },
    { caption: 'Covalent: shared pairs between atoms.', embedHint: 'Dative: both from one atom.' },
    { caption: 'Expand octet for Period 3 e.g. PCl₅.', embedHint: 'Syllabus examples only.' },
  ]),
  '4-2-bonding-and-structure': embedSpec([
    { caption: 'Giant ionic: high mp, soluble often.', embedHint: 'NaCl lattice.' },
    { caption: 'Giant covalent: very high mp, hard.', embedHint: 'Diamond, SiO₂.' },
    { caption: 'Giant metallic: conductivity, malleable.', embedHint: 'Delocalised electrons.' },
    { caption: 'Simple molecular: low mp, gases/liquids.', embedHint: 'Weak IMF between molecules.' },
  ]),
  '8-3-homogeneous-and-heterogeneous-catalysts': embedSpec([
    { caption: 'Catalyst lowers Ea; not consumed overall.', embedHint: 'Alternative route.' },
    { caption: 'Homogeneous: same phase as reactants.', embedHint: 'Fe²⁺/Fe³⁺ in I⁻/S₂O₈²⁻.' },
    { caption: 'Heterogeneous: different phase — surface adsorption.', embedHint: 'Fe in Haber; V₂O₅ in Contact.' },
    { caption: 'Catalyst does not change ΔH or equilibrium position.', embedHint: 'Speeds both forward and back.' },
  ]),
  '11-1-physical-properties-of-the-group-17-elements': embedSpec([
    { caption: 'Colour intensifies down group: pale → dark.', embedHint: 'F₂ pale yellow; I₂ grey-black.' },
    { caption: 'Boiling point increases down group.', embedHint: 'Stronger id–id forces.' },
    { caption: 'Bond strength decreases: F–F anomalous weak.', embedHint: 'Repulsion in small F₂.' },
    { caption: 'Oxidising power decreases down group.', embedHint: 'Harder to gain e⁻.' },
  ]),
  '19-2-nitriles-and-hydroxynitriles': embedSpec([
    { caption: 'Halogenoalkane + KCN → nitrile (CN⁻ nucleophile).', embedHint: 'Ethanol solvent, reflux.' },
    { caption: 'Nitrile + H⁺/H₂O → carboxylic acid.', embedHint: 'Hydrolysis.' },
    { caption: 'Aldehyde + HCN → hydroxynitrile.', embedHint: 'CN⁻ adds to C=O; product has –OH and –CN.' },
    { caption: 'Hydroxynitrile useful for chain extension.', embedHint: 'Synthetic step to acid/amino acid.' },
  ]),

  // ── 9618 batch 14 (100% completion) ─────────────────────────────────────
  '3-1-computers-and-their-components': {
    steps: [
      {
        focus: ['cpu'],
        caption: 'CPU: ALU + control unit + registers.',
        embedHint: 'Fetch–decode–execute.',
      },
      {
        focus: ['memory'],
        caption: 'RAM volatile; ROM non-volatile.',
        embedHint: 'Primary vs secondary storage.',
      },
      {
        focus: ['storage'],
        caption: 'SSD vs HDD: speed vs capacity/cost.',
        embedHint: 'Secondary storage trade-offs.',
      },
      {
        focus: ['io'],
        caption: 'Input, output, and backing storage devices.',
        embedHint: 'Match device to role.',
      },
    ],
  },
  '4-3-bit-manipulation': {
    steps: [
      {
        focus: ['shift'],
        caption: 'Logical shift left/right — multiply/divide by 2.',
        embedHint: 'Vacant bit filled 0.',
      },
      {
        focus: ['mask'],
        caption: 'AND mask: clear selected bits.',
        embedHint: 'Check if bit set.',
      },
      {
        focus: ['xor'],
        caption: 'OR set bits; XOR toggle.',
        embedHint: 'Used in flags and permissions.',
      },
      {
        focus: ['twos-complement'],
        caption: 'Two\'s complement for signed integers.',
        embedHint: 'Link to 1.1 data representation.',
      },
    ],
  },

  '2-1-networks-including-the-internet': {
    steps: [
      {
        focus: ['lan-wan'],
        caption: 'LAN vs WAN — scale and ownership.',
        embedHint: 'Compare topology for a school vs the internet.',
      },
      {
        focus: ['packet-switch'],
        caption: 'Packet switching splits data into routed packets.',
        embedHint: 'Each packet can take a different path.',
      },
      {
        focus: ['circuit-switch'],
        caption: 'Circuit switching reserves a dedicated path.',
        embedHint: 'Contrast bandwidth use with packet switching.',
      },
      {
        focus: ['tcp-layers'],
        caption: 'TCP/IP layers — application to physical.',
        embedHint: 'Name each layer’s role in an HTTP request.',
      },
    ],
  },
  '16-1-purposes-of-an-operating-system-os': {
    steps: [
      {
        focus: ['process'],
        caption: 'Process management — scheduling CPU time.',
        embedHint: 'Multitasking and priority queues.',
      },
      {
        focus: ['memory'],
        caption: 'Memory management — virtual memory and paging.',
        embedHint: 'Isolate processes from each other.',
      },
      {
        focus: ['drivers'],
        caption: 'Device drivers abstract hardware.',
        embedHint: 'Same API for different printers or disks.',
      },
      {
        focus: ['security'],
        caption: 'Security — user accounts and file permissions.',
        embedHint: 'Protect memory and storage from unauthorised access.',
      },
    ],
  },
  '16-2-translation-software': {
    steps: [
      {
        focus: ['assembler'],
        caption: 'Assembler: one assembly instruction → one machine opcode.',
        embedHint: 'Low-level, hardware-specific.',
      },
      {
        focus: ['compiler'],
        caption: 'Compiler: full source → object code before execution.',
        embedHint: 'Single executable; faster runtime.',
      },
      {
        focus: ['interpreter'],
        caption: 'Interpreter: translate and execute line by line.',
        embedHint: 'Slower runtime; easier debugging.',
      },
      {
        focus: ['linker'],
        caption: 'Linkers/loaders combine object files into one program.',
        embedHint: 'Resolve external library references.',
      },
    ],
  },
  '22-1-infrared-spectroscopy': embedSpec([
    { caption: 'Bonds absorb IR when vibration changes dipole moment.', embedHint: 'O–H, C=O, N–H give characteristic peaks.' },
    { caption: 'Fingerprint region ~1500–400 cm⁻¹ is unique.', embedHint: 'Use tables to identify functional groups.' },
    { caption: 'Wavenumber σ = 1/λ — units cm⁻¹.', embedHint: 'Higher σ means higher energy photons.' },
    { caption: 'Gas cells need short path length; liquids use thin films.', embedHint: 'Avoid total absorption (100% transmittance drop).' },
  ]),
  '22-2-mass-spectrometry': embedSpec([
    { caption: 'Ionisation → acceleration → deflection → detection.', embedHint: 'Magnetic field bends ions by m/z.' },
    { caption: 'Molecular ion peak M⁺ gives relative molecular mass.', embedHint: 'May be small for fragile molecules.' },
    { caption: 'Fragment peaks fingerprint functional groups.', embedHint: 'e.g. m/z 29 for CH₃CH₂⁺.' },
    { caption: 'High-resolution distinguishes C₃H₄ vs C₂H₄N (same nominal mass).', embedHint: 'Exact mass to 4 decimal places.' },
  ]),
  '8-2-diffraction': embedSpec([
    { caption: 'Single slit: waves spread after passing a narrow opening.', embedHint: 'Open “Light” mode — see spreading beyond geometric shadow.' },
    { caption: 'Diffraction maxima when a sin θ ≈ nλ.', embedHint: 'Central maximum is brightest and widest.' },
    { caption: 'Narrower slit → more spreading (sin θ ∝ λ/a).', embedHint: 'Decrease slit width — fringes spread outward.' },
    { caption: 'Contrast with double-slit interference (path difference).', embedHint: 'Diffraction envelope modulates interference pattern.' },
  ]),

  '1-2-1-multimedia-graphics': {
    steps: [
      { focus: ['bitmap'], caption: 'Bitmap stores colour of each pixel — resolution = width × height.', embedHint: 'Higher colour depth increases file size.' },
      { focus: ['vector'], caption: 'Vector graphics store objects as equations/paths.', embedHint: 'Scale without pixelation — logos and diagrams.' },
      { focus: ['compression'], caption: 'Metadata and compression (lossy vs lossless).', embedHint: 'JPEG vs PNG trade-offs for photos vs diagrams.' },
      { focus: ['filesize'], caption: 'Exam: calculate file size from resolution and bit depth.', embedHint: 'Size ≈ pixels × bits per pixel ÷ 8.' },
    ],
  },
  '1-1-data-representation': {
    steps: [
      { focus: ['binary-denary'], caption: 'Denary ↔ binary using place value (powers of 2).', embedHint: 'Convert both directions — show working.' },
      { focus: ['hex'], caption: 'Hexadecimal: one digit = 4 bits — compact notation.', embedHint: 'FF₁₆ = 255₁₀ — link to colour codes and memory dumps.' },
      { focus: ['ascii'], caption: 'Characters stored as numeric codes (ASCII / Unicode).', embedHint: 'A = 65₁₀ = 01000001₂.' },
      { focus: ['twos-complement'], caption: 'Two\'s complement represents signed integers.', embedHint: 'MSB = sign; invert bits + 1 for negative.' },
    ],
  },
  '1-2-2-multimedia-sound': {
    steps: [
      { focus: ['waveform'], caption: 'Analogue sound: amplitude = loudness, frequency = pitch.', embedHint: 'Draw a sine wave — label amplitude and wavelength.' },
      { focus: ['sampling'], caption: 'Sampling rate (Hz) — Nyquist: rate > 2 × max frequency.', embedHint: 'Under-sampling causes aliasing.' },
      { focus: ['bit-depth'], caption: 'Bit depth sets amplitude resolution (quantisation levels).', embedHint: '16-bit → 65 536 levels; higher depth = larger file.' },
      { focus: ['compression'], caption: 'MP3 lossy vs WAV lossless — bitrate trades quality for size.', embedHint: 'Calculate file size: rate × depth × duration.' },
    ],
  },
  '1-3-compression': {
    steps: [
      { focus: ['lossless'], caption: 'Lossless compression — exact reconstruction (ZIP, PNG, FLAC).', embedHint: 'Compare original and compressed sizes.' },
      { focus: ['lossy'], caption: 'Lossy compression discards imperceptible detail (JPEG, MP3).', embedHint: 'Smaller file but quality loss — irreversible.' },
      { focus: ['run-length'], caption: 'Run-length encoding (RLE) for repeated data.', embedHint: 'AAAABBB → 4A3B — good for flat colour images.' },
      { focus: ['exam-size'], caption: 'Exam: calculate compressed vs uncompressed file sizes.', embedHint: 'Apply formula for sound and image data.' },
    ],
  },
  '4-2-assembly-language': {
    steps: [
      { focus: ['mnemonic'], caption: 'Assembly uses mnemonics readable by humans (LDR, ADD, STR).', embedHint: 'One line per instruction — address labels optional.' },
      { focus: ['opcode'], caption: 'Assembler translates each mnemonic to a machine opcode (1:1).', embedHint: 'Contrast with compiler for high-level languages.' },
      { focus: ['registers'], caption: 'Special registers: ACC (accumulator), IX (index), PC (program counter).', embedHint: 'PC auto-increments after fetch.' },
      { focus: ['fde'], caption: 'Fetch–decode–execute cycle runs each instruction.', embedHint: 'Low-level, hardware-specific — direct CPU control.' },
    ],
  },
  '8-3-data-definition-language-ddl-and-data-manipulation-language-dml': {
    steps: [
      { focus: ['ddl'], caption: 'DDL defines structure: CREATE, ALTER, DROP tables.', embedHint: 'CREATE TABLE with column types and constraints.' },
      { focus: ['dml-select'], caption: 'DML queries data: SELECT … FROM … WHERE …', embedHint: 'Filter with WHERE; sort with ORDER BY.' },
      { focus: ['dml-insert'], caption: 'DML modifies data: INSERT, UPDATE, DELETE.', embedHint: 'Always use WHERE on UPDATE/DELETE to target rows.' },
      { focus: ['constraints'], caption: 'PRIMARY KEY, FOREIGN KEY, NOT NULL enforce integrity.', embedHint: 'Link tables with FK → PK referential integrity.' },
    ],
  },
  '6-1-data-security': {
    steps: [
      { focus: ['threats'], caption: 'Threats: malware, phishing, and denial-of-service attacks.', embedHint: 'Match control to threat (firewall, antivirus, encryption).' },
      { focus: ['pharming'], caption: 'Pharming redirects traffic via compromised DNS — even when the user types the correct URL.', embedHint: 'User enters bank.com but DNS returns a fraudulent IP address.' },
      { focus: ['auth'], caption: 'Access levels and authentication (password, 2FA, biometrics).', embedHint: 'Principle of least privilege.' },
      { focus: ['backup', 'physical'], caption: 'Backup strategies and physical security complement logical controls.', embedHint: 'Off-site backup plus locks, CCTV, and secure disposal.' },
    ],
  },
  '7-1-ethics-and-ownership': {
    steps: [
      { focus: ['copyright'], caption: 'Copyright protects expression; patents protect inventions.', embedHint: 'Software licences: proprietary, open source, shareware.' },
      { focus: ['plagiarism'], caption: 'Plagiarism and citing sources in coursework.', embedHint: 'Academic integrity and referencing standards.' },
      { focus: ['conduct'], caption: 'Professional bodies and codes of conduct.', embedHint: 'Duty of care, confidentiality, and competence.' },
      { focus: ['ai-ethics'], caption: 'AI and automation — bias, accountability, job impact.', embedHint: 'Discuss ethical frameworks for new technology.' },
    ],
  },
  '8-1-database-concepts': {
    steps: [
      {
        focus: ['tables'],
        caption: 'Relational model: tables (relations) of rows and columns.',
        embedHint: 'Each row is a record; each column an attribute.',
      },
      {
        focus: ['keys'],
        caption: 'Primary key uniquely identifies a record.',
        embedHint: 'Foreign key links tables — referential integrity.',
      },
      {
        focus: ['normalisation'],
        caption: 'Normalisation reduces redundancy (1NF → 2NF → 3NF).',
        embedHint: 'Split repeating groups into separate tables.',
      },
      {
        focus: ['er-diagram'],
        caption: 'ER diagrams show entities, attributes, relationships.',
        embedHint: 'Cardinality: one-to-one, one-to-many, many-to-many.',
      },
    ],
  },
  '10-1-data-types-and-records': {
    steps: [
      { focus: ['atomic-types'], caption: 'Atomic types: INTEGER, REAL, CHAR, STRING, BOOLEAN, DATE.', embedHint: 'Choose type to match domain and storage.' },
      { focus: ['record'], caption: 'RECORD / STRUCT groups fields under one identifier.', embedHint: 'Dot notation: Student.Name, Student.DOB.' },
      { focus: ['declare'], caption: 'DECLARE and assignment in pseudocode.', embedHint: 'Strong typing catches errors at compile time.' },
      { focus: ['enum'], caption: 'Enumerated types restrict values to a fixed set.', embedHint: 'e.g. DayType = (Mon, Tue, …, Sun).' },
    ],
  },
  '10-2-arrays': {
    steps: [
      { focus: ['array-1d'], caption: '1D array: indexed list of same-type elements.', embedHint: 'Bounds: lower..upper or 0..n−1 depending on language.' },
      { focus: ['array-2d'], caption: '2D array: rows and columns — matrix storage.', embedHint: 'Nested loops for row-major traversal.' },
      { focus: ['search'], caption: 'Linear search vs binary search on sorted data.', embedHint: 'Binary search O(log n) — requires ordered array.' },
      { focus: ['stack-queue'], caption: 'Stack and queue as restricted array access patterns.', embedHint: 'LIFO vs FIFO — link to ADT section.' },
    ],
  },
  '10-3-files': {
    steps: [
      { focus: ['sequential'], caption: 'Sequential file: records read/written in order.', embedHint: 'Efficient for batch processing and logs.' },
      { focus: ['random'], caption: 'Random access by record number or key field.', embedHint: 'Index file maps key → byte offset.' },
      { focus: ['lifecycle'], caption: 'OPEN, READ, WRITE, CLOSE lifecycle.', embedHint: 'Always close files to flush buffers.' },
      { focus: ['exceptions'], caption: 'Exception handling for missing files or EOF.', embedHint: 'Validate existence before reading.' },
    ],
  },
  '11-1-programming-basics': {
    steps: [
      { focus: ['variables'], caption: 'Variables hold values; assignment replaces contents.', embedHint: '← or = depending on pseudocode convention.' },
      { focus: ['io'], caption: 'INPUT and OUTPUT for user interaction.', embedHint: 'Validate input range before processing.' },
      { focus: ['operators'], caption: 'Arithmetic and relational operators.', embedHint: 'MOD, DIV, AND, OR, NOT in Boolean expressions.' },
      { focus: ['comments'], caption: 'Comments document intent — not executed.', embedHint: 'Use meaningful identifiers (CamelCase or snake_case).' },
    ],
  },
  '11-2-constructs': {
    steps: [
      {
        focus: ['if-else'],
        caption: 'Selection: IF … THEN … ELSE … ENDIF.',
        embedHint: 'Nested IF — watch indentation and logic.',
      },
      {
        focus: ['case'],
        caption: 'CASE OF handles multiple discrete options.',
        embedHint: 'Prefer CASE over long IF chains.',
      },
      {
        focus: ['for-loop'],
        caption: 'Count-controlled FOR loop with start, end, step.',
        embedHint: 'Pre-condition: know iteration count.',
      },
      {
        focus: ['while-loop'],
        caption: 'WHILE / REPEAT UNTIL for condition-controlled loops.',
        embedHint: 'Ensure loop variable changes to avoid infinite loops.',
      },
    ],
  },
  '12-1-program-development-life-cycle': {
    steps: [
      { focus: ['analysis'], caption: 'Analysis: requirements specification from client brief.', embedHint: 'Identify inputs, processes, outputs, constraints.' },
      { focus: ['design'], caption: 'Design: structure charts, pseudocode, data dictionary.', embedHint: 'Top-down decomposition into modules.' },
      { focus: ['implementation'], caption: 'Implementation: coding to design — version control.', embedHint: 'Match naming to design documents.' },
      { focus: ['testing'], caption: 'Testing then maintenance — iterative cycles.', embedHint: 'Agile vs waterfall delivery models.' },
    ],
  },
  '12-3-program-testing-and-maintenance': {
    steps: [
      { focus: ['test-data'], caption: 'Test data: normal, boundary, erroneous.', embedHint: 'Boundary values at limits of valid range.' },
      { focus: ['stub'], caption: 'Stub testing isolates modules with dummy code.', embedHint: 'Driver program calls module under test.' },
      { focus: ['alpha-beta'], caption: 'Alpha (dev team) vs beta (selected users) testing.', embedHint: 'Acceptance testing against requirements.' },
      { focus: ['maintenance'], caption: 'Corrective, adaptive, perfective, preventive maintenance.', embedHint: 'Log changes and regression-test after fixes.' },
    ],
  },
  '13-3-floating-point-numbers-representation-and-manipulation': {
    steps: [
      { focus: ['fields'], caption: 'Sign, mantissa, exponent fields in binary.', embedHint: 'Normalise so mantissa starts with 1.xxxx.' },
      { focus: ['bias'], caption: 'Bias exponent storage avoids negative exponents.', embedHint: 'Actual exponent = stored value − bias.' },
      { focus: ['precision'], caption: 'Precision limited by mantissa bits — rounding errors.', embedHint: '0.1 + 0.2 ≠ 0.3 in finite precision.' },
      { focus: ['overflow'], caption: 'Underflow/overflow and special values (0, infinity).', embedHint: 'Compare range vs fixed-point integers.' },
    ],
  },
  '17-1-encryption-encryption-protocols-and-digital-certificates': {
    steps: [
      { focus: ['symmetric'], caption: 'Symmetric key: same secret for encrypt and decrypt.', embedHint: 'Fast bulk encryption — key distribution problem.' },
      { focus: ['asymmetric'], caption: 'Asymmetric (public/private) key pair — RSA outline.', embedHint: 'Public key encrypts; private key decrypts.' },
      { focus: ['hash'], caption: 'Hash functions — one-way, detect tampering.', embedHint: 'SHA family; salt passwords before hashing.' },
      { focus: ['certificate'], caption: 'Digital certificates bind identity to public key (CA).', embedHint: 'HTTPS handshake uses TLS + certificates.' },
    ],
  },
  '18-1-artificial-intelligence-ai': {
    steps: [
      { focus: ['ai-scope'], caption: 'AI: systems performing tasks needing human intelligence.', embedHint: 'Narrow vs general AI — syllabus focuses on narrow.' },
      { focus: ['expert-system'], caption: 'Expert systems: knowledge base + inference engine.', embedHint: 'Rules and facts — forward/backward chaining.' },
      { focus: ['ml'], caption: 'Machine learning: train model on labelled data.', embedHint: 'Supervised vs unsupervised overview.' },
      { focus: ['ethics'], caption: 'Ethics: bias in training data, transparency, jobs.', embedHint: 'Link to 7.1 professional responsibility.' },
    ],
  },
  '20-1-programming-paradigms': {
    steps: [
      { focus: ['level'], caption: 'Low-level: machine/assembly — hardware-specific.', embedHint: 'High-level: portable, readable, abstracted.' },
      { focus: ['procedural'], caption: 'Procedural: sequences, procedures, shared state.', embedHint: 'Top-down design with modules.' },
      { focus: ['oop'], caption: 'Object-oriented: classes, encapsulation, inheritance.', embedHint: 'Polymorphism — same interface, different behaviour.' },
      { focus: ['declarative'], caption: 'Declarative: state what, not how (SQL, Prolog outline).', embedHint: 'Contrast with imperative step-by-step code.' },
    ],
  },

  'paper-5-planning-and-analysis': {
    steps: [
      {
        focus: ['points'],
        caption: 'Plot each point with vertical error bars — absolute uncertainty on the dependent variable.',
      },
      {
        focus: ['lobf'],
        caption: 'Draw the line of best fit (LOBF) — balanced scatter above and below the points.',
      },
      {
        focus: ['wal'],
        caption: 'Draw the worst acceptable line (WAL) — steepest or shallowest through all error bars.',
      },
      {
        focus: ['gradient'],
        caption: 'Use a large triangle on each line; gradient uncertainty Δm = |m_LOBF − m_WAL|.',
      },
    ],
  },

  // ── 9231 Further Maths ───────────────────────────────────────────────────
  '1-4-matrices': embedSpec([
    { caption: 'A 2×2 matrix maps column vectors — each row gives one output component.', embedHint: 'Multiply A by column vector (x, y)ᵀ.' },
    { caption: 'Matrix product AB: rows of A dot columns of B.', embedHint: 'Inner dimensions must match.' },
    { caption: 'Identity I and inverse A⁻¹ when det(A) ≠ 0.', embedHint: 'AA⁻¹ = I — order matters for AB.' },
    { caption: '2D transformations: rotation, reflection, stretch.', embedHint: 'Compose transformations by multiplying matrices.' },
  ]),
  '2-2-matrices': embedSpec([
    { caption: '3×3 matrices extend linear transformations in 3D.', embedHint: 'Same rules as 2×2 — check dimension compatibility.' },
    { caption: 'Determinant det(A) — zero means no inverse.', embedHint: 'Area/volume scale factor for transformation.' },
    { caption: 'Eigenvalues λ solve det(A − λI) = 0.', embedHint: 'Eigenvector direction unchanged by A.' },
    { caption: 'Diagonalisation when A has full set of eigenvectors.', embedHint: 'A = PDP⁻¹ simplifies powers of A.' },
  ]),
}

export const DIAGRAM_SPEC_SLUGS = [...Object.keys(SPECS), ...Object.keys(GENERATED_SUBJECT_SPECS)]

export function resolveDiagramSpec(
  slug: string,
  override?: LessonDiagramSpec | null
): LessonDiagramSpec | null {
  if (override?.steps?.length) return override
  return getLessonDiagramSpec(slug)
}

export function getLessonDiagramSpec(slug: string): LessonDiagramSpec | null {
  if (SPECS[slug]) return SPECS[slug]
  if (GENERATED_SUBJECT_SPECS[slug]) return GENERATED_SUBJECT_SPECS[slug]
  const alias = resolveVisualCatalogSlug(slug)
  if (alias !== slug && SPECS[alias]) return SPECS[alias]
  if (alias !== slug && GENERATED_SUBJECT_SPECS[alias]) return GENERATED_SUBJECT_SPECS[alias]
  return null
}

export function defaultParamValues(spec: LessonDiagramSpec | null): Record<string, number> {
  if (!spec?.params?.length) return {}
  return Object.fromEntries(spec.params.map((p) => [p.id, p.default]))
}

export function clampStepIndex(spec: LessonDiagramSpec | null, stepIndex: number): number {
  if (!spec?.steps.length) return Math.max(0, stepIndex)
  return Math.min(Math.max(0, stepIndex), spec.steps.length - 1)
}

export function stepStateFor(
  spec: LessonDiagramSpec | null,
  stepIndex: number
): DiagramStepState | null {
  if (!spec?.steps.length) return null
  return spec.steps[clampStepIndex(spec, stepIndex)]
}

export function isLayerFocused(
  spec: LessonDiagramSpec | null,
  stepIndex: number,
  layerId: string
): boolean {
  const state = stepStateFor(spec, stepIndex)
  if (!state) return true
  return state.focus.includes(layerId)
}

export function layerOpacity(
  spec: LessonDiagramSpec | null,
  stepIndex: number,
  layerId: string,
  active = 1,
  dimmed = 0.22
): number {
  if (!spec?.steps.length) return active
  return isLayerFocused(spec, stepIndex, layerId) ? active : dimmed
}

/** Highlight when any of the given layer ids is in the active step focus. */
export function layerOpacityAny(
  spec: LessonDiagramSpec | null,
  stepIndex: number,
  layerIds: string[],
  active = 1,
  dimmed = 0.22
): number {
  if (!spec?.steps.length) return active
  const state = stepStateFor(spec, stepIndex)
  if (!state) return active
  return state.focus.some((f) => layerIds.includes(f)) ? active : dimmed
}
