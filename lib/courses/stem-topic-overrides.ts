import type { CourseLesson } from '@/lib/courses/types'

/** Detailed pilot content overrides keyed by `subjectCode:topicCode`. */
export const STEM_TOPIC_OVERRIDES: Record<string, Partial<CourseLesson>> = {
  // ── Reference: 9701 Organic naming ─────────────────────────────────────
  '9701:13.1': {
    status: 'pilot',
    summary:
      '9701 AS pilot — IUPAC naming, functional groups, homologous series, and displayed/skeletal formulas.',
    learningObjectives: [
      'Identify alkyl, alkenyl, halogeno, hydroxyl, and carbonyl functional groups.',
      'Apply IUPAC rules: longest chain, lowest locants, correct suffix/prefix.',
      'Draw displayed and skeletal formulas from names and vice versa.',
      'State general formulas of common homologous series.',
    ],
    simpleExplanation: {
      title: 'Organic naming decoder ring',
      summary:
        'Every organic name encodes a carbon skeleton plus a functional group. Learn the decoder rules once and you can translate between name, structure, and formula in both directions.',
      analogy:
        'IUPAC naming is like a postal address: the street number (locant) must be as small as possible, the street name is the longest carbon chain, and the apartment type (suffix/prefix) tells you the functional group.',
      steps: [
        'Find the longest continuous carbon chain — this gives the parent name.',
        'Number the chain so substituents get the lowest set of locants.',
        'Identify the highest-priority functional group for the suffix (-ane, -ene, -ol, -al, -one, -oic acid).',
        'Add prefixes for substituents (chloro-, methyl-, etc.) in alphabetical order.',
      ],
    },
    flashcards: [
      { front: 'IUPAC suffix for alkane?', back: '-ane' },
      { front: 'IUPAC suffix for alkene?', back: '-ene (double bond locant included)' },
      { front: 'IUPAC suffix for alcohol?', back: '-ol' },
      { front: 'IUPAC suffix for aldehyde?', back: '-al (CHO at chain end)' },
      { front: 'IUPAC suffix for ketone?', back: '-one' },
      { front: 'IUPAC suffix for carboxylic acid?', back: '-oic acid' },
      { front: 'General formula of alkanes?', back: 'CₙH₂ₙ₊₂' },
      { front: 'General formula of alkenes?', back: 'CₙH₂ₙ' },
      { front: 'Priority: alcohol vs alkene at same carbon?', back: 'Alcohol (-ol) suffix; alkene as prefix if needed' },
      { front: 'What is a homologous series?', back: 'Same functional group, successive members differ by CH₂' },
    ],
    sections: [
      {
        type: 'intro',
        content:
          '**Organic naming** (13.1) unlocks every later organic topic in 9701. Cambridge tests **name ↔ structure**, **functional group recognition**, and **general formulas** — often as the first marks in a longer synthesis question.',
      },
      { type: 'heading', content: 'Functional groups and homologous series' },
      {
        type: 'text',
        content:
          'A **functional group** is the reactive part of a molecule. Members of a **homologous series** share the same functional group and show gradual physical property trends (e.g. boiling point increases with chain length due to stronger van der Waals forces).',
      },
      { type: 'heading', content: 'IUPAC naming rules' },
      {
        type: 'text',
        content:
          'Select the **longest carbon chain** containing the principal functional group. **Number** from the end giving substituents the lowest numbers. When double bonds and substituents compete, the double bond usually receives the lower number unless a higher-priority group dictates otherwise.',
      },
      { type: 'formula', content: 'Examples:\nCH₃CH₂CH₂OH → propan-1-ol\nCH₃CH=CHCH₃ → but-2-ene\nCH₃CH₂COOH → propanoic acid' },
      { type: 'heading', content: 'Displayed and skeletal formulas' },
      {
        type: 'keyPoints',
        items: [
          'Displayed: show every atom and bond — best for mechanisms.',
          'Skeletal: zig-zag lines, vertices = carbon — fastest in exams.',
          'Do not draw implicit H on skeletal unless clarifying stereochemistry.',
          'Common mistake: forgetting the "1" in propan-1-ol when needed for clarity.',
        ],
      },
      {
        type: 'workedExample',
        question: 'Name the compound with formula CH₃CH(CH₃)CH₂CH₂OH.',
        solution:
          'Longest chain with -OH: 4 carbons → butanol.\n-OH at carbon 1 → **butan-1-ol**.\nMethyl branch on carbon 3 → **3-methylbutan-1-ol**.',
      },
      {
        type: 'workedExample',
        question: 'Draw the skeletal formula of pent-2-ene.',
        solution:
          'Five-carbon chain with C=C between C2 and C3.\nSkeletal: zig-zag of 5 vertices; double bond between 2nd and 3rd carbon.\nVerify: molecular formula C₅H₁₀ matches alkene general formula.',
      },
      { type: 'examTip', content: 'State the **full IUPAC name** unless the question gives a structural diagram. Check alphabetical order of prefixes (bromo before methyl).' },
      { type: 'practice', label: 'Mark an organic naming question', href: '/mark?subject=9701&topic=13.1' },
      {
        type: 'resources',
        items: [
          { label: '9701 course index', href: '/courses/9701' },
          { label: '9701 past papers', href: '/subjects/9701' },
        ],
      },
    ],
    faq: [
      { q: 'When do I use "1" in the locant for alcohols?', a: 'When needed to avoid ambiguity in longer chains or when multiple -OH groups exist. For simple chains like propanol, propan-1-ol is acceptable and clearer.' },
      { q: 'How do I choose the parent chain?', a: 'It must include the highest-priority functional group and be the longest such chain — not necessarily the longest chain in the entire drawing.' },
    ],
  },

  // ── Reference: 9709 Differentiation ────────────────────────────────────
  '9709:1.7': {
    status: 'pilot',
    summary: '9709 P1 pilot — power rule, tangents, stationary points, and increasing/decreasing functions.',
    simpleExplanation: {
      title: 'Slope of a curve at a point',
      summary:
        'Differentiation finds the gradient of a curve at any point. That gradient is the rate of change of y with respect to x — the foundation of optimisation and kinematics in later papers.',
      analogy:
        'If a hill is your curve, the derivative at a point is the steepness of the ground under your feet — positive uphill, negative downhill, zero on a flat summit or valley floor.',
      steps: [
        'Differentiate term by term using the power rule.',
        'Substitute x to find the gradient at a point on the curve.',
        'Set dy/dx = 0 and solve to locate stationary points.',
        'Use the second derivative or sign table to classify maxima and minima.',
      ],
    },
    flashcards: [
      { front: 'Power rule for y = xⁿ', back: 'dy/dx = n xⁿ⁻¹' },
      { front: 'Derivative of a constant', back: '0' },
      { front: 'Stationary point condition', back: 'dy/dx = 0' },
      { front: 'dy/dx > 0 means', back: 'Function is increasing' },
      { front: 'dy/dx < 0 means', back: 'Function is decreasing' },
      { front: 'd²y/dx² > 0 at a stationary point', back: 'Local minimum' },
      { front: 'd²y/dx² < 0 at a stationary point', back: 'Local maximum' },
      { front: 'Gradient of tangent at x = a', back: 'Value of dy/dx when x = a' },
      { front: 'Derivative of k·f(x)', back: 'k · f′(x)' },
      { front: 'Derivative of f(x) + g(x)', back: "f′(x) + g′(x)" },
    ],
    sections: [
      {
        type: 'intro',
        content:
          '**Differentiation** dominates 9709 Pure Paper 1. Examiners award method marks for correct **dy/dx**, then interpretation marks for **gradients**, **stationary points**, and **nature of turning points**.',
      },
      { type: 'heading', content: 'The power rule' },
      { type: 'formula', content: 'If y = xⁿ then dy/dx = n xⁿ⁻¹\nConstant multiples and sums differentiate term by term.' },
      { type: 'heading', content: 'Tangents and gradients' },
      {
        type: 'text',
        content:
          'The value of **dy/dx** at x = a equals the gradient of the **tangent** to the curve at that point. Equation of tangent: y − y₁ = m(x − x₁) where m = dy/dx at x₁.',
      },
      { type: 'heading', content: 'Stationary points' },
      {
        type: 'text',
        content:
          'Solve **dy/dx = 0** to find x-coordinates of turning points. Substitute back into y for coordinates. Classify using **d²y/dx²** or a sign table of dy/dx around the point.',
      },
      {
        type: 'workedExample',
        question: 'y = x³ − 3x² + 2. Find stationary points and their nature.',
        solution:
          'dy/dx = 3x² − 6x = 3x(x − 2) → x = 0 or x = 2.\ny(0) = 2 → (0, 2); y(2) = −2 → (2, −2).\nd²y/dx² = 6x − 6: at x = 0, −6 (maximum); at x = 2, +6 (minimum).',
      },
      {
        type: 'workedExample',
        question: 'Find the gradient of y = 2x³ − 5x at x = −1.',
        solution: 'dy/dx = 6x² − 5. At x = −1: 6(1) − 5 = **1**.',
      },
      { type: 'examTip', content: 'Always show **dy/dx** before solving = 0. Method marks are lost when candidates jump straight to coordinates.' },
      { type: 'practice', label: 'Mark a differentiation question', href: '/mark?subject=9709&topic=1.7' },
      { type: 'resources', items: [{ label: '9709 course index', href: '/courses/9709' }] },
    ],
  },

  // ── Reference: 9700 Photosynthesis ─────────────────────────────────────
  '9700:13.1': {
    status: 'pilot',
    summary: '9700 P4 pilot — photosynthesis as light-dependent and light-independent stages; ATP and NADPH roles.',
    simpleExplanation: {
      title: 'Capturing light, building sugar',
      summary:
        'Photosynthesis converts light energy into chemical energy in glucose. The light-dependent stage makes ATP and NADPH; the Calvin cycle uses them to fix CO₂ into carbohydrate.',
      analogy:
        'Photosynthesis is a solar-powered factory: the roof panels (thylakoids) capture light and charge batteries (ATP/NADPH); the factory floor (stroma) assembles products using those batteries and imported CO₂.',
      steps: [
        'Light absorbed by chlorophyll in thylakoid membranes.',
        'Photolysis splits water → O₂, H⁺, electrons; electron transport makes ATP + NADPH.',
        'Calvin cycle in stroma fixes CO₂ using ATP and NADPH.',
        'Triose phosphate converted to glucose, starch, cellulose, or other products.',
      ],
    },
    flashcards: [
      { front: 'Site of light-dependent reactions?', back: 'Thylakoid membranes (grana)' },
      { front: 'Site of Calvin cycle?', back: 'Stroma of chloroplast' },
      { front: 'Products of light-dependent stage?', back: 'ATP, NADPH, O₂' },
      { front: 'Substrate for Calvin cycle?', back: 'CO₂ (fixed into organic molecules)' },
      { front: 'Role of ATP in Calvin cycle?', back: 'Provides energy for reduction steps' },
      { front: 'Role of NADPH in Calvin cycle?', back: 'Provides reducing power (H)' },
      { front: 'Photolysis equation concept?', back: 'H₂O → O₂ + H⁺ + e⁻' },
      { front: 'Limiting factors in photosynthesis?', back: 'Light intensity, CO₂ concentration, temperature' },
      { front: 'Why is chlorophyll essential?', back: 'Absorbs light energy to excite electrons' },
      { front: 'End product of photosynthesis (overall)?', back: 'Glucose (carbohydrate) and O₂' },
    ],
    sections: [
      {
        type: 'intro',
        content:
          '**Photosynthesis** (13.1) is a high-mark P4 topic linking **cell structure**, **biochemistry**, and **ecology**. Cambridge expects labelled diagrams and clear separation of **light-dependent** vs **Calvin cycle** events.',
      },
      { type: 'heading', content: 'Chloroplast structure' },
      {
        type: 'text',
        content:
          'Grana are stacks of thylakoids where light-dependent reactions occur. The stroma surrounds them and hosts the Calvin cycle. This compartmentalisation keeps the two stages spatially separated.',
      },
      { type: 'heading', content: 'Light-dependent stage' },
      {
        type: 'text',
        content:
          'Chlorophyll absorbs light; electrons enter an **electron transport chain**. **Photolysis** of water replaces electrons and releases **O₂**. Chemiosmosis produces **ATP**; NADP is reduced to **NADPH**.',
      },
      { type: 'heading', content: 'Calvin cycle (light-independent)' },
      {
        type: 'keyPoints',
        items: [
          'RuBP combines with CO₂ (carbon fixation).',
          'ATP and NADPH from light stage reduce intermediates.',
          'Regeneration of RuBP requires ATP.',
          'Triose phosphate leaves cycle → glucose, starch, etc.',
        ],
      },
      {
        type: 'workedExample',
        question: 'Explain why the rate of photosynthesis levels off at high light intensity.',
        solution:
          'At low light, rate limited by light energy (few excited electrons).\nAs intensity increases, more ATP/NADPH produced → faster Calvin cycle.\nAt high intensity, another factor (CO₂ or temperature/enzymes) becomes limiting, so rate plateaus.',
      },
      {
        type: 'workedExample',
        question: 'State the roles of ATP and NADPH in the Calvin cycle.',
        solution:
          '**ATP** supplies energy for phosphorylation and regeneration of RuBP.\n**NADPH** provides reducing power to convert GP to TP (carbohydrate synthesis).',
      },
      { type: 'examTip', content: 'Use **precise locations** (thylakoid vs stroma) — vague "in chloroplast" loses specificity marks.' },
      { type: 'practice', label: 'Mark a photosynthesis question', href: '/mark?subject=9700&topic=13.1' },
      { type: 'resources', items: [{ label: '9700 course index', href: '/courses/9700' }] },
    ],
  },

  // ── Reference: 9618 Logic gates ────────────────────────────────────────
  '9618:3.2': {
    status: 'pilot',
    summary: '9618 P1 pilot — logic gates, truth tables, Boolean algebra, and simple combinational circuits.',
    simpleExplanation: {
      title: 'Digital decisions with gates',
      summary:
        'Logic gates perform Boolean operations on binary inputs. Combining gates builds circuits that add, compare, or control data paths — the hardware foundation of the CPU.',
      analogy:
        'Logic gates are railway points: AND only switches when both control levers are pulled; OR when either is; NOT reverses the track direction entirely.',
      steps: [
        'Identify inputs (0/1) and the gate type (AND, OR, NOT, NAND, NOR, XOR).',
        'Build a truth table for all input combinations.',
        'Simplify Boolean expressions using algebra or Karnaugh maps.',
        'Trace the output for a given input pattern in a circuit diagram.',
      ],
    },
    flashcards: [
      { front: 'AND gate truth: both 1?', back: 'Output 1; otherwise 0' },
      { front: 'OR gate truth: any 1?', back: 'Output 1; both 0 → 0' },
      { front: 'NOT gate', back: 'Inverts input: 0→1, 1→0' },
      { front: 'XOR gate', back: 'Output 1 when inputs differ' },
      { front: 'NAND equivalent', back: 'NOT (A AND B)' },
      { front: 'De Morgan: NOT(A AND B)', back: '(NOT A) OR (NOT B)' },
      { front: 'Half adder outputs', back: 'Sum (XOR), Carry (AND)' },
      { front: 'Combinational vs sequential', back: 'Combinational: no memory; output depends only on current inputs' },
      { front: 'Boolean value of true', back: '1' },
      { front: 'Purpose of truth table', back: 'Lists all input combinations and corresponding outputs' },
    ],
    sections: [
      {
        type: 'intro',
        content:
          '**Logic gates** (3.2) appear in Paper 1 theory and underpin **CPU architecture** (4.1) and **Boolean algebra** (15.2). Examiners test **truth tables**, **circuit traces**, and **expression simplification**.',
      },
      { type: 'heading', content: 'Standard gates' },
      {
        type: 'text',
        content:
          '**AND**, **OR**, **NOT** are primitive. **NAND** and **NOR** are universal — any Boolean function can be built from either alone. **XOR** outputs 1 when inputs differ (used in half adders).',
      },
      { type: 'heading', content: 'Truth tables and Boolean algebra' },
      {
        type: 'text',
        content:
          'For n inputs there are 2ⁿ rows. Simplify expressions using identities: **A + A = A**, **A · A = A**, **A + A′ = 1**, **De Morgan\'s laws**. Simpler expressions mean fewer gates in hardware.',
      },
      { type: 'heading', content: 'Simple circuits' },
      {
        type: 'keyPoints',
        items: [
          'Half adder: XOR (sum) + AND (carry).',
          'Full adder: handles carry-in as well as two bits.',
          'Trace carefully — one wrong intermediate fails the whole output.',
          'Draw gates with clear input labels (A, B, Cin, etc.).',
        ],
      },
      {
        type: 'workedExample',
        question: 'Complete the truth table for A AND (B OR NOT C) when A=1, B=0, C=1.',
        solution:
          'B OR NOT C = 0 OR NOT 1 = 0 OR 0 = 0.\nA AND (result) = 1 AND 0 = **0**.',
      },
      {
        type: 'workedExample',
        question: 'Simplify: NOT(A AND B) using De Morgan.',
        solution: 'NOT(A AND B) = **(NOT A) OR (NOT B)**.',
      },
      { type: 'examTip', content: 'Show **intermediate values** at each gate when tracing — examiners award working marks.' },
      { type: 'practice', label: 'Mark a logic gates question', href: '/mark?subject=9618&topic=3.2' },
      { type: 'resources', items: [{ label: '9618 course index', href: '/courses/9618' }] },
    ],
  },

  // ── Chemistry cornerstones ─────────────────────────────────────────────
  '9701:2.1': {
    status: 'pilot',
    sections: [
      { type: 'intro', content: '**Relative atomic mass** (2.1) underpins every mole calculation in 9701. Cambridge tests definitions, weighted averages, and mass spectrometry links.' },
      { type: 'heading', content: 'Relative isotopic and atomic mass' },
      { type: 'text', content: '**Ar** is the weighted mean mass of atoms of an element relative to ¹⁄₁₂ of the mass of a carbon-12 atom. **Relative isotopic mass** compares a single isotope to the same standard.' },
      { type: 'heading', content: 'Calculating Ar from isotope data' },
      { type: 'formula', content: 'Ar = Σ (isotope mass × abundance) / 100\nMr for a molecule = sum of Ar values × subscripts' },
      { type: 'heading', content: 'Exam applications' },
      { type: 'keyPoints', items: ['Abundances as percentages must sum to 100.', 'Use Ar not mass numbers when calculating Mr.', 'Mass spectrometry provides isotope peaks and abundances.'] },
      { type: 'workedExample', question: 'Chlorine has isotopes ³⁵Cl (75%) and ³⁷Cl (25%). Calculate Ar.', solution: 'Ar = (35×75 + 37×25)/100 = (2625 + 925)/100 = **35.5**' },
      { type: 'workedExample', question: 'Find Mr of sulfuric acid H₂SO₄.', solution: 'Mr = 2(1.0) + 32.1 + 4(16.0) = **98.1** (using Ar values from periodic table).' },
      { type: 'examTip', content: 'Show the weighted average setup before the final Ar — method marks are common.' },
      { type: 'practice', label: 'Mark a relative mass question', href: '/mark?subject=9701&topic=2.1' },
      { type: 'resources', items: [{ label: '9701 course index', href: '/courses/9701' }] },
    ],
  },
  '9701:3.2': {
    status: 'pilot',
    sections: [
      { type: 'intro', content: '**Ionic bonding** (3.2) explains giant lattice structures, high melting points, and electrical conductivity when molten or in solution.' },
      { type: 'heading', content: 'Formation of ionic bonds' },
      { type: 'text', content: 'Electrons transfer from metal atoms (low IE) to non-metal atoms (high electron affinity). Oppositely charged ions attract in a **giant ionic lattice**.' },
      { type: 'heading', content: 'Properties linked to structure' },
      { type: 'keyPoints', items: ['Strong electrostatic forces → high melting/boiling points.', 'Solid: ions fixed → poor conductor.', 'Molten/aqueous: ions mobile → conduct electricity.', 'Brittle: ion layers shift and repel when stressed.'] },
      { type: 'heading', content: 'Dot-and-cross diagrams' },
      { type: 'text', content: 'Show transfer of outer electrons only. Include charges on ions. For NaCl: Na loses one electron to Cl → Na⁺ and Cl⁻.' },
      { type: 'workedExample', question: 'Explain why MgO has a very high melting point.', solution: 'Mg²⁺ and O²⁻ form a strong ionic lattice with **double charges**, giving very strong electrostatic attraction requiring much energy to overcome.' },
      { type: 'workedExample', question: 'Why does solid NaCl not conduct electricity?', solution: 'Ions are **fixed in the lattice** and cannot move to carry charge. When molten or dissolved, ions are free to move → conduction.' },
      { type: 'examTip', content: 'Link every property explicitly to **mobile ions** or **strong lattice forces**.' },
      { type: 'practice', label: 'Mark an ionic bonding question', href: '/mark?subject=9701&topic=3.2' },
      { type: 'resources', items: [{ label: '9701 course index', href: '/courses/9701' }] },
    ],
  },
  '9701:3.4': {
    status: 'pilot',
    sections: [
      { type: 'intro', content: '**Covalent bonding** (3.4) covers bond formation by electron sharing, bond energy, and coordinate (dative covalent) bonds.' },
      { type: 'heading', content: 'Covalent bonds' },
      { type: 'text', content: 'Atoms share one or more pairs of electrons to achieve stable electron configurations. Bond energy is the energy required to break 1 mol of bonds in the gaseous state.' },
      { type: 'heading', content: 'Coordinate bonds' },
      { type: 'text', content: 'Both electrons in the shared pair come from **one** atom (e.g. NH₃ → H⁺ forming NH₄⁺). Once formed, indistinguishable from ordinary covalent bonds.' },
      { type: 'heading', content: 'Multiple bonds' },
      { type: 'keyPoints', items: ['Single bond: one shared pair.', 'Double bond: two shared pairs (e.g. O=O).', 'Triple bond: three shared pairs (e.g. N≡N).', 'Bond length decreases as bond order increases.'] },
      { type: 'workedExample', question: 'Describe how a coordinate bond forms in NH₄⁺.', solution: 'NH₃ lone pair donated to H⁺ (empty 1s orbital) → shared pair in N–H coordinate bond → ammonium ion.' },
      { type: 'workedExample', question: 'Explain why N₂ is unreactive at room temperature.', solution: 'N≡N has very **high bond energy** (944 kJ mol⁻¹) — large activation energy needed to break the triple bond.' },
      { type: 'examTip', content: 'Dative bonds: show the lone pair arrow in mechanisms when Cambridge asks for curly-arrow notation later.' },
      { type: 'practice', label: 'Mark a covalent bonding question', href: '/mark?subject=9701&topic=3.4' },
      { type: 'resources', items: [{ label: '9701 course index', href: '/courses/9701' }] },
    ],
  },
  '9701:3.5': {
    status: 'pilot',
    sections: [
      { type: 'intro', content: '**Shapes of molecules** (3.5) uses VSEPR and bond pair/lone pair repulsion to predict molecular geometry and bond angles.' },
      { type: 'heading', content: 'VSEPR theory' },
      { type: 'text', content: 'Electron pairs (bonding + lone) arrange to minimise repulsion. Lone pairs repel more strongly than bonding pairs, reducing bond angles below ideal values.' },
      { type: 'heading', content: 'Common shapes' },
      { type: 'formula', content: 'Linear: 180° | Trigonal planar: 120° | Tetrahedral: 109.5° | Trigonal pyramidal: ~107° | Non-linear (H₂O): ~104.5°' },
      { type: 'heading', content: 'Predicting shape' },
      { type: 'keyPoints', items: ['Count electron regions around central atom.', 'Include lone pairs as regions even if not visible in final shape name.', 'Double bonds count as one region.', 'Example: CH₄ tetrahedral; NH₃ pyramidal; H₂O bent.'] },
      { type: 'workedExample', question: 'Predict the shape and bond angle of NH₃.', solution: '4 electron regions (3 bond, 1 lone) → **trigonal pyramidal**. Lone pair compresses H–N–H angle to about **107°**.' },
      { type: 'workedExample', question: 'Explain why CO₂ is linear.', solution: 'Carbon has two double bonds, no lone pairs → two regions → **180°** linear molecule.' },
      { type: 'examTip', content: 'State **lone pair repulsion** whenever angles are below standard tetrahedral/planar values.' },
      { type: 'practice', label: 'Mark a shapes of molecules question', href: '/mark?subject=9701&topic=3.5' },
      { type: 'resources', items: [{ label: '9701 course index', href: '/courses/9701' }] },
    ],
  },
  '9701:5.2': {
    status: 'pilot',
    sections: [
      { type: 'intro', content: "**Hess's law** (5.2) lets you calculate enthalpy changes via alternative routes — essential for Born-Haber cycles and energy diagrams." },
      { type: 'heading', content: "Hess's law statement" },
      { type: 'text', content: 'The total enthalpy change for a reaction is independent of the route taken, provided initial and final conditions are the same.' },
      { type: 'heading', content: 'Energy cycle method' },
      { type: 'text', content: 'If you can express ΔH as a sum of known steps (formation, combustion, atomisation), rearrange the cycle so unknown arrows sum correctly. Reverse an arrow → change sign of ΔH.' },
      { type: 'heading', content: 'Common cycles' },
      { type: 'keyPoints', items: ['ΔHf°: elements → compound.', 'ΔHc°: compound → CO₂ + H₂O (complete combustion).', 'Lattice energy cycles use atomisation + electron affinity + bond energies.', 'Keep state symbols and stoichiometry consistent.'] },
      { type: 'workedExample', question: 'Given ΔHf°(CO) and ΔHf°(CO₂), outline how to find ΔH for CO + ½O₂ → CO₂.', solution: 'Use Hess cycle: ΔH = ΔHf°(products) − ΔHf°(reactants) = ΔHf°(CO₂) − [ΔHf°(CO) + 0].' },
      { type: 'workedExample', question: 'Why does reversing a step change the sign of ΔH?', solution: "Breaking bonds endothermic (+); forming bonds exothermic (−). Reversing direction **inverts the sign** by Hess's law." },
      { type: 'examTip', content: 'Draw the cycle — even a rough diagram earns planning marks and reduces sign errors.' },
      { type: 'practice', label: "Mark a Hess's law question", href: '/mark?subject=9701&topic=5.2' },
      { type: 'resources', items: [{ label: '9701 course index', href: '/courses/9701' }] },
    ],
  },
  '9701:7.2': {
    status: 'pilot',
    sections: [
      { type: 'intro', content: '**Brønsted–Lowry acids and bases** (7.2) define acids as proton donors and bases as proton acceptors — central to pH, buffers, and titration curves.' },
      { type: 'heading', content: 'Brønsted–Lowry definitions' },
      { type: 'text', content: 'An **acid** donates H⁺; a **base** accepts H⁺. Conjugate pairs differ by one H⁺: acid ⇌ base + H⁺.' },
      { type: 'heading', content: 'Strong vs weak' },
      { type: 'text', content: 'Strong acids/bases ionise completely in water. Weak acids/bases partially ionise; an equilibrium exists (Ka, Kb).' },
      { type: 'heading', content: 'pH and calculations' },
      { type: 'formula', content: 'pH = −log₁₀[H⁺]\nFor strong monoprotic acid: [H⁺] ≈ concentration\nKw = [H⁺][OH⁻] = 1.0 × 10⁻¹⁴ mol² dm⁻⁶ at 298 K' },
      { type: 'workedExample', question: 'Identify conjugate pairs in: HCl + H₂O → Cl⁻ + H₃O⁺', solution: 'HCl/Cl⁻ and H₂O/H₃O⁺ are conjugate acid–base pairs.' },
      { type: 'workedExample', question: 'Calculate pH of 0.010 mol dm⁻³ HCl.', solution: '[H⁺] = 0.010 → pH = −log(0.010) = **2.0**' },
      { type: 'examTip', content: 'Weak acid pH needs Ka — do not assume full ionisation.' },
      { type: 'practice', label: 'Mark an acids and bases question', href: '/mark?subject=9701&topic=7.2' },
      { type: 'resources', items: [{ label: '9701 course index', href: '/courses/9701' }] },
    ],
  },
  '9701:8.1': {
    status: 'pilot',
    sections: [
      { type: 'intro', content: '**Rate of reaction** (8.1) links collision theory to measurable rate and concentration–time graphs.' },
      { type: 'heading', content: 'Measuring rate' },
      { type: 'text', content: 'Rate = change in concentration / time (or mass/volume of gas per time). Tangents on concentration–time graphs give instantaneous rate.' },
      { type: 'heading', content: 'Collision theory' },
      { type: 'text', content: 'Reactions occur when particles collide with **sufficient energy** (≥ Ea) and correct orientation. Increasing frequency or energy of successful collisions increases rate.' },
      { type: 'heading', content: 'Factors affecting rate' },
      { type: 'keyPoints', items: ['Temperature: more collisions, more particles ≥ Ea.', 'Concentration/pressure: more frequent collisions.', 'Surface area: more exposed particles.', 'Catalyst: alternative route, lower Ea.'] },
      { type: 'workedExample', question: 'Explain why powdered zinc reacts faster than a lump with acid.', solution: 'Powder has **larger surface area** → more acid–zinc collisions per second → faster H₂ production.' },
      { type: 'workedExample', question: 'How is instantaneous rate found from a graph?', solution: 'Draw a **tangent** at the time of interest; gradient = Δc/Δt = instantaneous rate.' },
      { type: 'examTip', content: 'Always link rate change to **successful collisions**, not just "more collisions".' },
      { type: 'practice', label: 'Mark a rate of reaction question', href: '/mark?subject=9701&topic=8.1' },
      { type: 'resources', items: [{ label: '9701 course index', href: '/courses/9701' }] },
    ],
  },

  // ── Further Maths P1 pilots ──────────────────────────────────────────────
  '9231:1.4': {
    status: 'pilot',
    summary: '9231 P1 pilot — matrix operations, determinants, and inverse matrices.',
  },
  '9231:1.3': {
    status: 'pilot',
    summary: '9231 P1 pilot — summation notation, standard series, and method of differences.',
  },
  '9231:1.1': {
    status: 'pilot',
    summary: '9231 P1 pilot — relationships between roots and coefficients of polynomial equations.',
  },
  '9231:1.2': {
    status: 'pilot',
    summary: '9231 P1 pilot — rational functions, asymptotes, and graphs.',
  },
  '9231:1.5': {
    status: 'pilot',
    summary: '9231 P1 pilot — polar coordinates, curves, and conversion from Cartesian.',
  },
  '9231:1.6': {
    status: 'pilot',
    summary: '9231 P1 pilot — vector geometry, scalar product, and lines in 3D.',
  },
  '9231:1.7': {
    status: 'pilot',
    summary: '9231 P1 pilot — proof by mathematical induction.',
  },
  '9231:2.1': {
    status: 'pilot',
    summary: '9231 P2 pilot — hyperbolic functions and identities.',
  },
}
