// data.jsx — real content lifted from markscheme.app/courses, /9702, /4-3-density-and-pressure

/* ---------------- catalog: 15 CAIE subjects ---------------- */
// glyph, accent token, level, family, units, lessons, questions, progress %
const SUBJECTS = [
  { code: '9709', name: 'Mathematics',       glyph: '∫', acc: 'acc-blue',   level: 'A-Level', fam: 'Maths',      units: 6, lessons: 38,  q: 220, prog: 62 },
  { code: '9702', name: 'Physics',           glyph: 'Ω', acc: 'acc-violet', level: 'A-Level', fam: 'Sciences',   units: 3, lessons: 77,  q: 447, prog: 41, featured: true },
  { code: '9701', name: 'Chemistry',         glyph: '⌬', acc: 'acc-teal',   level: 'A-Level', fam: 'Sciences',   units: 2, lessons: 90,  q: 522, prog: 18 },
  { code: '9700', name: 'Biology',           glyph: 'ϕ', acc: 'ink',        level: 'A-Level', fam: 'Sciences',   units: 2, lessons: 44,  q: 255, prog: 0 },
  { code: '9231', name: 'Further Mathematics', glyph: 'Σ', acc: 'acc-blue', level: 'A-Level', fam: 'Maths',      units: 4, lessons: 24,  q: 139, prog: 0 },
  { code: '9618', name: 'Computer Science',  glyph: '{}', acc: 'acc-slate', level: 'A-Level', fam: 'Maths',      units: 4, lessons: 45,  q: 261, prog: 0 },
  { code: '9608', name: 'Economics',         glyph: '£',  acc: 'acc-rose',  level: 'A-Level', fam: 'Commerce',   units: 4, lessons: 53,  q: 307, prog: 0, codeReal: '9708' },
  { code: '9706', name: 'Accounting',        glyph: '¤',  acc: 'amber',     level: 'A-Level', fam: 'Commerce',   units: 3, lessons: 19,  q: 110, prog: 0 },
  { code: '9609', name: 'Business',          glyph: '§',  acc: 'acc-teal',  level: 'A-Level', fam: 'Commerce',   units: 3, lessons: 116, q: 673, prog: 0 },
  { code: '9990', name: 'Psychology',        glyph: 'Ψ',  acc: 'acc-violet',level: 'A-Level', fam: 'Humanities', units: 3, lessons: 60,  q: 348, prog: 0 },
  { code: '9699', name: 'Sociology',         glyph: '∴',  acc: 'acc-slate', level: 'A-Level', fam: 'Humanities', units: 4, lessons: 35,  q: 203, prog: 0 },
  { code: '9489', name: 'History',           glyph: '¶',  acc: 'red',       level: 'A-Level', fam: 'Humanities', units: 4, lessons: 27,  q: 54,  prog: 0 },
  { code: '9084', name: 'Law',               glyph: '⟁',  acc: 'acc-slate', level: 'A-Level', fam: 'Humanities', units: 4, lessons: 53,  q: 307, prog: 0 },
  { code: '9607', name: 'Media Studies',     glyph: '▶',  acc: 'acc-rose',  level: 'A-Level', fam: 'Humanities', units: 3, lessons: 18,  q: 36,  prog: 0 },
  { code: '9488', name: 'Islamic Studies',   glyph: '☪',  acc: 'acc-teal',  level: 'A-Level', fam: 'Humanities', units: 4, lessons: 23,  q: 46,  prog: 0 },
];

/* ---------------- 9702 Physics course ---------------- */
const PAPERS_9702 = [
  { id: 1, name: 'Multiple choice',                  topics: 32 },
  { id: 2, name: 'AS structured questions',          topics: 32 },
  { id: 3, name: 'Advanced practical skills',        topics: 32 },
  { id: 4, name: 'A Level structured questions',     topics: 44 },
  { id: 5, name: 'Planning, analysis & evaluation',  topics: 33 },
];

// Paper 1 topics grouped by syllabus unit. done: completed, active: current
const TOPICS_9702_P1 = [
  { unit: '1 · Physical quantities & units', items: [
    { n: '1.1', t: 'Physical quantities', done: true },
    { n: '1.2', t: 'SI units', done: true },
    { n: '1.3', t: 'Errors and uncertainties', done: true },
    { n: '1.4', t: 'Scalars and vectors', done: true },
  ]},
  { unit: '2 · Kinematics', items: [
    { n: '2.1', t: 'Equations of motion', done: true },
  ]},
  { unit: '3 · Dynamics', items: [
    { n: '3.1', t: "Momentum and Newton's laws of motion", done: true },
    { n: '3.2', t: 'Non-uniform motion', done: true },
    { n: '3.3', t: 'Linear momentum and its conservation' },
  ]},
  { unit: '4 · Forces, density & pressure', items: [
    { n: '4.1', t: 'Turning effects of forces', done: true },
    { n: '4.2', t: 'Equilibrium of forces', done: true },
    { n: '4.3', t: 'Density and pressure', active: true },
  ]},
  { unit: '5 · Work, energy & power', items: [
    { n: '5.1', t: 'Energy conservation' },
    { n: '5.2', t: 'Gravitational PE and kinetic energy' },
  ]},
  { unit: '6 · Deformation of solids', items: [
    { n: '6.1', t: 'Stress and strain' },
    { n: '6.2', t: 'Elastic and plastic behaviour' },
  ]},
  { unit: '7 · Waves', items: [
    { n: '7.1', t: 'Progressive waves' },
    { n: '7.2', t: 'Transverse and longitudinal waves' },
    { n: '7.3', t: 'Doppler effect for sound waves' },
    { n: '7.4', t: 'Electromagnetic spectrum' },
    { n: '7.5', t: 'Polarisation' },
  ]},
  { unit: '8 · Superposition', items: [
    { n: '8.1', t: 'Stationary waves' },
    { n: '8.2', t: 'Diffraction' },
    { n: '8.3', t: 'Interference' },
    { n: '8.4', t: 'The diffraction grating' },
  ]},
  { unit: '9 · Electricity', items: [
    { n: '9.1', t: 'Electric current' },
    { n: '9.2', t: 'Potential difference and power' },
    { n: '9.3', t: 'Resistance and resistivity' },
  ]},
  { unit: '10 · D.C. circuits', items: [
    { n: '10.1', t: 'Practical circuits' },
    { n: '10.2', t: "Kirchhoff's laws" },
    { n: '10.3', t: 'Potential dividers' },
  ]},
  { unit: '11 · Particle physics', items: [
    { n: '11.1', t: 'Atoms, nuclei and radiation' },
    { n: '11.2', t: 'Fundamental particles' },
  ]},
];

/* ---------------- Lesson: 4.3 Density and pressure ---------------- */
const LESSON = {
  code: '9702', sub: 'Physics', point: '4.3', name: 'Density and pressure',
  heroPre: 'Density &', heroEm: 'pressure', diagram: 'fluid',
  papers: 'Paper 1: Multiple Choice · Paper 2: AS Structured',
  tag: 'core concept', mins: 22,
  intro: 'This lesson introduces the fundamental concepts of density and pressure. You will learn how to define and calculate these quantities for solids and fluids, and explore the relationship between pressure, depth, and fluid density — a key principle in hydrostatics.',
  objectives: [
    'Define density as mass per unit volume and apply ρ = m/V.',
    'Define pressure as the normal force per unit area and apply p = F/A.',
    'Derive Δp = ρgh for the pressure difference in a fluid.',
    'Apply the density and pressure equations to problems involving solids and fluids.',
  ],
  simple: {
    lead: "Density tells us how much 'stuff' (mass) is packed into a certain space (volume). Pressure describes how concentrated a push (force) is over a certain surface (area).",
    analogy: "Imagine a lift. The more people that cram inside, the higher the density. Now, if someone wearing a stiletto heel steps on your foot, the pressure is immense — their whole weight is concentrated on a tiny area. In a flat shoe, the same weight spread over a larger area hurts far less.",
  },
  steps: [
    { n: 1, title: 'Density', body: 'Density (ρ) is the mass (m) of a substance per unit volume (V). It measures how compact the substance is.' },
    { n: 2, title: 'Pressure', body: 'Pressure (p) is the normal force (F) acting on a surface divided by the area (A) over which that force is distributed.' },
    { n: 3, title: 'Pressure in a fluid', body: 'In a fluid, pressure increases with depth. The extra pressure (Δp) at depth (h) is Δp = ρgh, where ρ is the fluid density and g is the acceleration of free fall.' },
    { n: 4, title: 'In the exam', body: "You'll use these to find unknowns: the mass of air in a room, the force on a dam, or the height of a mercury barometer." },
  ],
  formulas: [
    { tex: 'ρ = m / V', parts: [
      { s: 'ρ', m: 'density — in kg m⁻³' },
      { s: 'm', m: 'mass — in kg' },
      { s: 'V', m: 'volume — in m³' },
    ]},
    { tex: 'p = F / A', parts: [
      { s: 'p', m: 'pressure — in Pa (N m⁻²)' },
      { s: 'F', m: 'normal force — in N' },
      { s: 'A', m: 'area — in m²' },
    ]},
    { tex: 'Δp = ρgh', parts: [
      { s: 'Δp', m: 'pressure difference — in Pa' },
      { s: 'ρ', m: 'fluid density — in kg m⁻³' },
      { s: 'g', m: 'free-fall acceleration — 9.81 m s⁻²' },
      { s: 'h', m: 'vertical depth — in m' },
    ]},
  ],
  notes: [
    { h: '1. Density (ρ)', p: 'Density measures how much mass is contained within a given volume. It is an intrinsic property — a small piece of gold and a large bar of gold have the same density. Lead is very dense; polystyrene is not. The density of water is a key reference: approximately 1000 kg m⁻³.' },
    { h: '2. Pressure (p)', p: 'Pressure is the force per unit area, with the force acting perpendicular to the surface. A large force over a large area gives small pressure (a tractor on wide tyres). A small force on a tiny area gives immense pressure (the point of a needle).', tip: 'A common question has an object resting on a surface. The force causing the pressure is the object\u2019s weight, W = mg — never just the mass. Always find the weight first by multiplying mass by g (9.81 m s⁻²).' },
    { h: '3. Pressure in a fluid', p: 'Dive into a pool and you feel pressure on your eardrums rise with depth — the weight of the water column above you pushes down. For a cylinder of fluid, height h, area A: volume V = Ah, mass m = ρAh, weight W = ρAhg. That weight acts on area A, so Δp = F/A = ρAhg / A = ρgh.' },
  ],
  worked: [
    { title: 'Worked example 1', q: 'A rectangular block of steel measures 2.0 cm × 4.0 cm × 5.0 cm. Its mass is 312 g. Calculate the density of the steel in kg m⁻³.',
      steps: [
        'Convert to SI units. m = 312 g = 0.312 kg. Dimensions: 0.020 m, 0.040 m, 0.050 m.',
        'Calculate the volume. V = l × w × h = 0.020 × 0.040 × 0.050 = 4.0 × 10⁻⁵ m³.',
        'Apply ρ = m/V = 0.312 / (4.0 × 10⁻⁵) = 7800 kg m⁻³ (2 s.f.).',
      ]},
    { title: 'Worked example 2', q: 'The Mariana Trench is ~11 000 m deep. Find the pressure at this depth. Take seawater density 1030 kg m⁻³, atmospheric pressure 1.01 × 10⁵ Pa, g = 9.81 m s⁻².',
      steps: [
        'Identify the goal: absolute pressure p_total = p_atm + ρgh.',
        'List knowns: h = 11 000 m, ρ = 1030 kg m⁻³, g = 9.81 m s⁻², p_atm = 1.01 × 10⁵ Pa.',
        'Gauge pressure Δp = ρgh = 1030 × 9.81 × 11000 = 1.111 × 10⁸ Pa.',
        'Absolute pressure p_total = 1.01 × 10⁵ + 1.111 × 10⁸ ≈ 1.1 × 10⁸ Pa (2 s.f.).',
      ]},
  ],
  glossary: [
    { t: 'Density', d: 'The mass per unit volume of a substance, ρ = m/V.' },
    { t: 'Pressure', d: 'The normal force acting per unit area, p = F/A.' },
    { t: 'Pascal (Pa)', d: 'The SI unit of pressure. 1 Pa = 1 N m⁻².' },
    { t: 'Gauge pressure', d: 'Pressure relative to atmospheric pressure — the value of Δp = ρgh.' },
    { t: 'Absolute pressure', d: 'Total pressure: gauge pressure plus atmospheric pressure, p = p_atm + ρgh.' },
    { t: 'Hydrostatic pressure', d: 'The pressure exerted by a fluid at rest due to the weight of fluid above a point.' },
  ],
  quiz: [
    { q: 'What is the definition of density?', a: 'Density (ρ) is the mass per unit volume of a substance.' },
    { q: 'What is the formula for density?', a: 'ρ = m/V, where m is mass and V is volume.' },
    { q: 'What are the SI base units for density?', a: 'kg m⁻³' },
    { q: 'What is the definition of pressure?', a: 'Pressure (p) is the force acting normally (perpendicular) per unit area.' },
    { q: 'What is the formula for pressure?', a: 'p = F/A, where F is the normal force and A is the area.' },
    { q: 'What is the SI unit of pressure, and what is it equivalent to?', a: 'The pascal (Pa). 1 Pa = 1 N m⁻².' },
  ],
  flashcards: [
    { q: 'Define density.', a: 'Density (ρ) is the mass per unit volume of a substance.' },
    { q: 'Define pressure.', a: 'Pressure (p) is the normal force per unit area.' },
    { q: 'State the formula for pressure in a fluid column.', a: 'Δp = ρgh — ρ fluid density, g free-fall acceleration, h depth.' },
    { q: 'Why is pressure a scalar?', a: 'At a point in a fluid it acts equally in all directions, so it has no single direction.' },
    { q: 'Reference density of water?', a: '≈ 1000 kg m⁻³.' },
  ],
  takeaways: [
    'Symbol: ρ (rho). SI unit kg m⁻³.',
    'Pressure p = F/A uses the normal force — for a resting object that is its weight W = mg.',
    'Pressure in a fluid rises with depth: Δp = ρgh.',
    'Volume of irregular solids: water displacement method.',
  ],
  faqs: [
    { q: 'Why is pressure a scalar when force and area are vectors?', a: 'Pressure is the magnitude of the perpendicular force divided by area. At any point in a fluid it acts equally in all directions, so it has no single direction — making it a scalar.' },
    { q: 'What is the difference between gauge and absolute pressure?', a: 'Gauge pressure is measured relative to atmospheric pressure (the value of Δp = ρgh). Absolute pressure is the total: gauge pressure plus atmospheric pressure.' },
    { q: 'In Δp = ρgh, does h mean height or depth?', a: 'It is the vertical depth below the fluid surface. A greater depth means a taller column of fluid above, hence greater weight and pressure. Use the vertical component, never a slanted distance.' },
    { q: 'Is Density and pressure (4.3) free to study?', a: 'Yes — the 9702 course is 100% free, including visual lessons, exam tips and past-paper marking. No paywall.' },
  ],
  related: [
    { n: '4.1', t: 'Turning effects of forces' },
    { n: '4.2', t: 'Equilibrium of forces' },
    { n: '5.1', t: 'Energy conservation' },
    { n: '5.2', t: 'Gravitational PE and kinetic energy' },
  ],
  prev: { n: '4.2', t: 'Equilibrium of forces' },
  next: { n: '5.1', t: 'Energy conservation' },
  practice: { ref: '9702/22 May/June 2023 · Q4', marks: 6,
    text: 'A sealed cylinder contains oil of density 850 kg m⁻³ to a depth of 0.60 m. (a) Calculate the pressure due to the oil at the base. (b) The base area is 4.0 × 10⁻³ m². Find the force the oil exerts on the base.' },
};

Object.assign(window, { SUBJECTS, PAPERS_9702, TOPICS_9702_P1, LESSON });
