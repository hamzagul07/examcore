// course-data.jsx — per-subject hub structures + lessons registry + outline template
// depends on data.jsx (SUBJECTS, PAPERS_9702, TOPICS_9702_P1, LESSON)

// build a paper-1 spine from compact unit definitions (sequential numbering)
function buildSpine(units) {
  return units.map((u, ui) => ({
    unit: `${ui + 1} · ${u.u}`,
    items: u.t.map((title, ti) => ({ n: `${ui + 1}.${ti + 1}`, t: title })),
  }));
}

// generic paper sets
const PAPERS_SCI = PAPERS_9702;
const PAPERS_3 = [
  { id: 1, name: 'AS structured questions', topics: 0 },
  { id: 2, name: 'AS data & essays', topics: 0 },
  { id: 3, name: 'A Level structured', topics: 0 },
];
const PAPERS_4 = [
  { id: 1, name: 'Paper 1', topics: 0 },
  { id: 2, name: 'Paper 2', topics: 0 },
  { id: 3, name: 'Paper 3', topics: 0 },
  { id: 4, name: 'Paper 4', topics: 0 },
];

const COURSES = {
  '9702': {
    blurb: 'Mechanics, waves, electricity and modern physics — 77 premium lessons across 3 papers. Learn visually, then mark real past papers on every topic.',
    papers: PAPERS_9702, units: TOPICS_9702_P1, totalP1: 32,
    spines: {
      1: TOPICS_9702_P1,
      2: TOPICS_9702_P1,
      4: [
        { unit: '12 · Motion in a circle', items: [ { n: '12.1', t: 'Radian measure & angular speed' }, { n: '12.2', t: 'Centripetal acceleration & force' } ] },
        { unit: '13 · Gravitational fields', items: [ { n: '13.1', t: 'Gravitational field & field strength' }, { n: '13.2', t: "Newton's law of gravitation" }, { n: '13.3', t: 'Gravitational potential & orbits' } ] },
        { unit: '14 · Temperature', items: [ { n: '14.1', t: 'Thermal equilibrium & scales' }, { n: '14.2', t: 'Specific heat capacity & latent heat' } ] },
        { unit: '15 · Ideal gases', items: [ { n: '15.1', t: 'The equation of state pV = nRT' }, { n: '15.2', t: 'Kinetic theory of gases' } ] },
        { unit: '16 · Thermodynamics', items: [ { n: '16.1', t: 'Internal energy' }, { n: '16.2', t: 'The first law of thermodynamics' } ] },
        { unit: '17 · Oscillations', items: [ { n: '17.1', t: 'Simple harmonic motion' }, { n: '17.2', t: 'Energy in SHM' }, { n: '17.3', t: 'Damping & resonance' } ] },
        { unit: '18 · Electric fields', items: [ { n: '18.1', t: 'Electric field & field strength' }, { n: "18.2", t: "Coulomb's law" }, { n: '18.3', t: 'Electric potential' } ] },
        { unit: '19 · Capacitance', items: [ { n: '19.1', t: 'Capacitors & capacitance' }, { n: '19.2', t: 'Energy stored & discharge' } ] },
        { unit: '20 · Magnetic fields', items: [ { n: '20.1', t: 'Concept of a magnetic field' }, { n: '20.2', t: 'Force on a current & on a charge' }, { n: '20.3', t: 'Electromagnetic induction' } ] },
        { unit: '21 · Alternating currents', items: [ { n: '21.1', t: 'Characteristics of alternating currents' }, { n: '21.2', t: 'Rectification & smoothing' } ] },
        { unit: '22 · Quantum physics', items: [ { n: '22.1', t: 'The photoelectric effect' }, { n: '22.2', t: 'Wave–particle duality' }, { n: '22.3', t: 'Energy levels & line spectra' } ] },
        { unit: '23 · Nuclear physics', items: [ { n: '23.1', t: 'Mass defect & binding energy' }, { n: '23.2', t: 'Radioactive decay' } ] },
        { unit: '24 · Medical physics', items: [ { n: '24.1', t: 'Ultrasound' }, { n: '24.2', t: 'X-ray imaging' }, { n: '24.3', t: 'PET scanning' } ] },
        { unit: '25 · Astronomy & cosmology', items: [ { n: '25.1', t: 'Standard candles & luminosity' }, { n: '25.2', t: "Hubble's law & the Big Bang" } ] },
      ],
    },
  },
  '9709': {
    blurb: 'Pure mathematics, mechanics and statistics. Worked methods, real exam questions and mark-by-mark feedback on every method mark.',
    papers: [
      { id: 1, name: 'Pure Mathematics 1', topics: 24 },
      { id: 2, name: 'Pure Mathematics 2', topics: 18 },
      { id: 3, name: 'Pure Mathematics 3', topics: 26 },
      { id: 4, name: 'Mechanics', topics: 20 },
      { id: 5, name: 'Probability & Statistics 1', topics: 16 },
    ],
    units: buildSpine([
      { u: 'Quadratics', t: ['Completing the square', 'The discriminant', 'Quadratic inequalities'] },
      { u: 'Functions', t: ['Domain and range', 'Composite functions', 'Inverse functions'] },
      { u: 'Coordinate geometry', t: ['Straight lines', 'The equation of a circle'] },
      { u: 'Trigonometry', t: ['Graphs and transformations', 'Trigonometric identities', 'Solving equations'] },
      { u: 'Differentiation', t: ['The gradient function', 'Tangents and normals', 'Stationary points'] },
      { u: 'Integration', t: ['Indefinite integration', 'Definite integrals & area'] },
    ]),
  },
  '9701': {
    blurb: 'Physical, inorganic and organic chemistry. Definitions worth marks, mechanisms drawn right, and past-paper marking on every point.',
    papers: PAPERS_SCI,
    units: buildSpine([
      { u: 'Atomic structure', t: ['Particles in the atom', 'Electron configuration', 'Ionisation energies'] },
      { u: 'Atoms, molecules & stoichiometry', t: ['The mole', 'Empirical & molecular formulae', 'Reacting masses & gas volumes'] },
      { u: 'Chemical bonding', t: ['Ionic bonding', 'Covalent bonding', 'Shapes of molecules', 'Intermolecular forces'] },
      { u: 'Chemical energetics', t: ['Enthalpy changes', "Hess's law"] },
      { u: 'Electrochemistry', t: ['Redox & oxidation number', 'Electrolysis'] },
      { u: 'Equilibria', t: ['Reversible reactions & Kc', 'Acids, bases and pH'] },
    ]),
  },
  '9700': {
    blurb: 'Cells, biological molecules, physiology and genetics. Command words decoded and answers marked against the real scheme.',
    papers: PAPERS_SCI,
    units: buildSpine([
      { u: 'Cell structure', t: ['The microscope & magnification', 'Eukaryotic cells', 'Prokaryotic cells'] },
      { u: 'Biological molecules', t: ['Carbohydrates', 'Lipids', 'Proteins', 'Water'] },
      { u: 'Enzymes', t: ['Mode of action', 'Factors affecting enzyme activity'] },
      { u: 'Cell membranes & transport', t: ['Membrane structure', 'Diffusion & osmosis', 'Active transport'] },
      { u: 'The mitotic cell cycle', t: ['Chromosomes', 'Mitosis'] },
      { u: 'Transport in mammals', t: ['The circulatory system', 'The heart', 'Haemoglobin & oxygen transport'] },
    ]),
  },
  '9231': {
    blurb: 'Further pure, further mechanics and further statistics for the strongest mathematicians.',
    papers: PAPERS_4,
    units: buildSpine([
      { u: 'Further Pure 1', t: ['Roots of polynomial equations', 'Rational functions & graphs', 'Summation of series'] },
      { u: 'Further Pure 2', t: ['Hyperbolic functions', 'Differential equations', 'Complex numbers'] },
      { u: 'Further Mechanics', t: ['Momentum & impulse', 'Circular motion', 'Hooke\u2019s law'] },
      { u: 'Further Statistics', t: ['Continuous random variables', 'Hypothesis testing'] },
    ]),
  },
  '9618': {
    blurb: 'From bits to algorithms — representation, hardware, networking, databases and programming.',
    papers: PAPERS_4,
    units: buildSpine([
      { u: 'Information representation', t: ['Number systems', 'Binary, hex & two\u2019s complement', 'Text, sound & images'] },
      { u: 'Communication & networking', t: ['Networks & topologies', 'The internet & protocols'] },
      { u: 'Hardware & logic', t: ['Logic gates', 'Boolean algebra', 'The processor (von Neumann)'] },
      { u: 'Programming', t: ['Data types & structures', 'Iteration & selection', 'Procedures & functions'] },
      { u: 'Databases', t: ['Relational databases', 'SQL'] },
    ]),
  },
  '9708': {
    blurb: 'Microeconomics and macroeconomics — diagrams that earn marks and analysis that scores.',
    papers: PAPERS_4,
    units: buildSpine([
      { u: 'Basic economic ideas', t: ['Scarcity & opportunity cost', 'Production possibility curves', 'The margin & decision-making'] },
      { u: 'The price system', t: ['Demand & supply', 'Elasticities', 'Market equilibrium'] },
      { u: 'Government intervention', t: ['Market failure', 'Taxes & subsidies'] },
      { u: 'The macroeconomy', t: ['Aggregate demand & supply', 'Inflation', 'Unemployment'] },
    ]),
  },
  '9706': {
    blurb: 'Financial and management accounting — statements that balance and decisions backed by numbers.',
    papers: PAPERS_3,
    units: buildSpine([
      { u: 'Financial accounting', t: ['The accounting equation', 'Double-entry bookkeeping', 'Income statements', 'Statements of financial position'] },
      { u: 'Cost & management accounting', t: ['Costing methods', 'Marginal costing', 'Budgeting'] },
    ]),
  },
  '9609': {
    blurb: 'Strategy, people, marketing, operations and finance — the full A-Level business toolkit.',
    papers: PAPERS_4,
    units: buildSpine([
      { u: 'Business & its environment', t: ['Enterprise', 'Business structure', 'Stakeholders'] },
      { u: 'People in organisations', t: ['Motivation', 'Leadership & management', 'Human resource management'] },
      { u: 'Marketing', t: ['The marketing mix', 'Market research', 'Marketing strategy'] },
      { u: 'Operations & finance', t: ['Operations management', 'Sources of finance', 'Investment appraisal'] },
    ]),
  },
  '9990': {
    blurb: 'Biological, cognitive, learning and social approaches — plus the research methods that underpin them.',
    papers: PAPERS_4,
    units: buildSpine([
      { u: 'The biological approach', t: ['Localisation of function', 'Core study: Dement & Kleitman'] },
      { u: 'The cognitive approach', t: ['Models of memory', 'Core study: Andrade (doodling)'] },
      { u: 'The learning approach', t: ['Classical conditioning', 'Operant conditioning'] },
      { u: 'Research methods', t: ['Experiments', 'Self-reports', 'Ethics'] },
    ]),
  },
  '9699': {
    blurb: 'Socialisation, identity and the institutions that shape society — with the methods to study them.',
    papers: PAPERS_4,
    units: buildSpine([
      { u: 'Socialisation & identity', t: ['Nature vs nurture', 'Agents of socialisation', 'Social control'] },
      { u: 'Research methods', t: ['Positivism & interpretivism', 'Quantitative methods', 'Qualitative methods'] },
      { u: 'The family', t: ['Family diversity', 'Changing family roles'] },
      { u: 'Education', t: ['Functions of education', 'Differential achievement'] },
    ]),
  },
  '9489': {
    blurb: 'European, American and international history — argument, evidence and source analysis that examiners reward.',
    papers: PAPERS_4,
    units: buildSpine([
      { u: 'Modern European history', t: ['The French Revolution', 'The unification of Germany', 'The Russian Revolution'] },
      { u: 'American history', t: ['Westward expansion', 'The Civil War', 'Reconstruction'] },
      { u: 'International history', t: ['Origins of WWI', 'The League of Nations', 'The Cold War'] },
    ]),
  },
  '9084': {
    blurb: 'The English legal system and the substantive law of contract, tort and crime.',
    papers: PAPERS_4,
    units: buildSpine([
      { u: 'The legal system', t: ['Sources of law', 'The court structure', 'Judicial precedent'] },
      { u: 'Law of contract', t: ['Offer & acceptance', 'Consideration', 'Terms & breach'] },
      { u: 'Law of tort', t: ['Negligence', 'Duty of care', 'Remedies'] },
      { u: 'Criminal law', t: ['Actus reus & mens rea', 'Non-fatal offences'] },
    ]),
  },
  '9607': {
    blurb: 'Media language, representation, industries and audiences — analysis and production.',
    papers: PAPERS_3,
    units: buildSpine([
      { u: 'Media language', t: ['Codes & conventions', 'Genre', 'Narrative'] },
      { u: 'Representation', t: ['Stereotypes', 'Identity & ideology'] },
      { u: 'Industries & audiences', t: ['Ownership & regulation', 'Audience theory'] },
    ]),
  },
  '9488': {
    blurb: 'The origins of Islam, the Qur\u2019an, Hadith and early Islamic history.',
    papers: PAPERS_4,
    units: buildSpine([
      { u: 'The origins of Islam', t: ['Pre-Islamic Arabia', 'The life of the Prophet', 'The early community'] },
      { u: 'The Qur\u2019an', t: ['Revelation & compilation', 'Major themes'] },
      { u: 'Hadith', t: ['Collection & classification', 'The major collections'] },
      { u: 'Early Islamic history', t: ['The Rightly Guided Caliphs', 'Expansion'] },
    ]),
  },
};

// ---- lessons registry: authored full lessons keyed by "code:n" ----
const LESSONS = {
  '9702:4.3': LESSON, // the fully-authored Density & pressure lesson (data.jsx)
};

// ---- outline lesson generator for any topic (faithful: "outline topics show
//      syllabus alignment — you can practise marking immediately") ----
function buildOutline(code, n, title) {
  const sub = SUBJECTS.find(s => s.code === code) || { name: 'Course', code };
  return {
    outline: true,
    code, sub: sub.name, point: n, name: title,
    papers: `${sub.level || 'A-Level'} · ${code}`,
    tag: 'syllabus point', mins: 14,
    intro: `This lesson covers ${title} for Cambridge ${sub.name} (${code}), syllabus point ${n}. The full premium walkthrough is being written — but the syllabus alignment is set, so you can practise a real past-paper question on this exact point right now and have it marked against the official scheme.`,
    objectives: [
      `Recall the key definitions and results examiners expect for ${title}.`,
      `Recognise how ${title} is assessed in past papers for ${code}.`,
      `Practise a real exam question and mark it mark-by-mark.`,
    ],
    simple: {
      lead: `${title} is one syllabus point in ${sub.name}. Below you can jump straight to a real past-paper question and get examiner-style feedback.`,
      analogy: `The fastest way to learn a topic like ${title} is to attempt a real question, see exactly where the marks are won and lost, then re-read only what you missed. That loop is what this page is built around.`,
    },
    practice: {
      ref: `${code} · real past paper`, marks: 6,
      text: `Attempt a recent ${sub.name} (${code}) question on ${title}. Upload your handwritten working and MarkScheme grades it against the official Cambridge mark scheme, point by point.`,
    },
    flashcards: [
      { q: `What syllabus point is "${title}"?`, a: `${code} · ${n} — ${title}.` },
      { q: `How should you revise ${title}?`, a: 'Attempt a past-paper question, mark it strictly, then revisit the marks you lost.' },
    ],
    related: [],
  };
}

function getCourse(code) { return COURSES[code] || COURSES['9702']; }
function spinesOf(course) { return course.spines || { 1: course.units }; }
// find which spine a topic lives in, plus its index and title
function topicContext(code, n) {
  const c = getCourse(code);
  const sp = spinesOf(c);
  for (const pid of Object.keys(sp)) {
    const flat = sp[pid].flatMap(u => u.items);
    const idx = flat.findIndex(i => i.n === n);
    if (idx >= 0) return { flat, idx, title: flat[idx].t };
  }
  const flat0 = (sp[Object.keys(sp)[0]] || []).flatMap(u => u.items);
  return { flat: flat0, idx: -1, title: 'Topic' };
}
function getLesson(code, n) {
  const key = `${code}:${n}`;
  const reg = Object.assign({}, LESSONS, window.LESSONS_9702 || {});
  if (reg[key]) return reg[key];
  return buildOutline(code, n, topicContext(code, n).title);
}

Object.assign(window, { COURSES, getCourse, getLesson, buildOutline, spinesOf, topicContext });
