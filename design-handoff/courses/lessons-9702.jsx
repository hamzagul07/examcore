// lessons-9702.jsx — fully-authored 9702 Physics lessons (merged into the registry by getLesson)

window.LESSONS_9702 = {
  '9702:1.1': {
    code: '9702', sub: 'Physics', point: '1.1', name: 'Physical quantities',
    papers: 'Paper 1: Multiple Choice · Paper 2: AS Structured', tag: 'foundation', mins: 12,
    intro: 'Every measurement in physics is a number paired with a unit. This lesson sets up physical quantities, base vs derived quantities, and the homogeneity-of-units check that wins (and saves) marks across the whole course.',
    objectives: [
      'Define a physical quantity as a numerical magnitude with a unit.',
      'Distinguish base quantities from derived quantities.',
      'Use prefixes from pico- to tera- correctly.',
      'Check the homogeneity of an equation by its units.',
    ],
    simple: {
      lead: 'A physical quantity is just a number with a unit attached — “3.0” means nothing until you say “3.0 metres”. Some quantities are basic building blocks; the rest are built from them.',
      analogy: 'Think of base quantities (mass, length, time…) as primary colours. Everything else — speed, force, energy — is a mixture you make by combining them, just like orange comes from red and yellow.',
    },
    formulas: [
      { tex: 'speed = distance / time', parts: [
        { s: 'distance', m: 'length travelled — in m' },
        { s: 'time', m: 'duration — in s' },
      ]},
    ],
    notes: [
      { h: '1. Base and derived quantities', p: 'There are seven SI base quantities; at A-Level you mostly use mass (kg), length (m), time (s), current (A), temperature (K) and amount of substance (mol). Derived quantities are combinations — e.g. speed (m s⁻¹), force (kg m s⁻²) and energy (kg m² s⁻²).' },
      { h: '2. Homogeneity of equations', p: 'A correct physics equation must have the same base units on both sides. If they do not match, the equation is wrong. Note: an equation that is homogeneous is not guaranteed correct (dimensionless constants like ½ are invisible to the check), but a non-homogeneous one is definitely wrong.', tip: 'When you are unsure of an equation, do a quick units check on both sides before you spend time substituting numbers — it catches rearrangement slips fast.' },
    ],
    worked: [
      { title: 'Worked example', q: 'Show that the equation s = ut + ½at² is homogeneous (s in m, u in m s⁻¹, a in m s⁻², t in s).',
        steps: [
          'LHS: s has base units of m.',
          'Term ut: (m s⁻¹)(s) = m. ✓',
          'Term ½at²: (m s⁻²)(s²) = m. The ½ is dimensionless and ignored.',
          'All terms are in metres, so the equation is homogeneous.',
        ]},
    ],
    glossary: [
      { t: 'Physical quantity', d: 'A property that can be measured, expressed as a magnitude × a unit.' },
      { t: 'Base quantity', d: 'One of the seven fundamental SI quantities from which all others are derived.' },
      { t: 'Derived quantity', d: 'A quantity defined as a combination of base quantities (e.g. force, energy).' },
      { t: 'Homogeneous equation', d: 'An equation with identical base units on both sides.' },
    ],
    quiz: [
      { q: 'What two parts make up a physical quantity?', a: 'A numerical magnitude and a unit.' },
      { q: 'Give the base units of force.', a: 'kg m s⁻² (from F = ma).' },
      { q: 'Does homogeneity prove an equation is correct?', a: 'No — it only rules an equation out. Dimensionless constants are invisible to the check.' },
      { q: 'What does the prefix “µ” mean?', a: 'micro — a factor of 10⁻⁶.' },
    ],
    flashcards: [
      { q: 'Base units of energy?', a: 'kg m² s⁻² (from E = ½mv²).' },
      { q: 'How do you check an equation is homogeneous?', a: 'Reduce every term to base units; they must match on both sides.' },
      { q: 'Prefix for 10⁹?', a: 'giga (G).' },
    ],
    takeaways: [
      'A quantity = magnitude × unit.',
      'Seven SI base quantities; everything else is derived.',
      'Both sides of a real equation share the same base units.',
    ],
    faqs: [
      { q: 'Is a homogeneous equation always correct?', a: 'No. Homogeneity is necessary but not sufficient — numerical factors and dimensionless constants are not tested by a units check.' },
    ],
    practice: { ref: '9702/12 · Oct/Nov 2022 · Q1', marks: 4,
      text: 'The equation for the period of a mass on a spring is T = 2π√(m/k). Determine the base units of the spring constant k.' },
  },

  '9702:1.3': {
    code: '9702', sub: 'Physics', point: '1.3', name: 'Errors and uncertainties',
    papers: 'Paper 1: Multiple Choice · Paper 2: AS Structured', tag: 'core skill', mins: 16,
    intro: 'Real measurements are never perfect. This lesson covers systematic vs random errors, precision vs accuracy, and — the part examiners love — how to combine uncertainties when quantities are added, multiplied or raised to a power.',
    objectives: [
      'Distinguish systematic from random errors, and precision from accuracy.',
      'Quote absolute, fractional and percentage uncertainties.',
      'Combine uncertainties for sums, products and powers.',
      'State a result to a sensible number of significant figures.',
    ],
    simple: {
      lead: 'An uncertainty is your honest “give or take”. A systematic error pushes every reading the same way (a wrongly-zeroed scale); a random error scatters readings either side of the true value.',
      analogy: 'Picture darts. Accurate but not precise = darts spread around the bullseye. Precise but not accurate = a tight cluster, but in the wrong corner. Systematic error is aiming at the wrong spot every throw.',
    },
    formulas: [
      { tex: 'sum: Δz = Δa + Δb', parts: [
        { s: 'Δz', m: 'absolute uncertainty in the result' },
        { s: 'Δa', m: 'absolute uncertainty in a (added/subtracted)' },
        { s: 'Δb', m: 'absolute uncertainty in b' },
      ]},
      { tex: 'product: Δz/z = Δa/a + Δb/b', parts: [
        { s: 'Δz/z', m: 'fractional uncertainty in the result' },
        { s: 'Δa/a', m: 'fractional uncertainty in a (× or ÷)' },
        { s: 'Δb/b', m: 'fractional uncertainty in b' },
      ]},
    ],
    notes: [
      { h: '1. Systematic vs random', p: 'Systematic errors shift all readings in the same direction and cannot be reduced by repeating — only by fixing the cause (re-zeroing, calibrating). Random errors vary unpredictably and are reduced by repeating measurements and averaging.' },
      { h: '2. Combining uncertainties', p: 'When adding or subtracting quantities, add their ABSOLUTE uncertainties. When multiplying or dividing, add their FRACTIONAL (or percentage) uncertainties. For a power, multiply the fractional uncertainty by the power: if z = aⁿ then Δz/z = |n|·Δa/a.', tip: 'A squared quantity doubles its percentage uncertainty; a cubed one triples it. Examiners often hide marks in a radius that is squared (area) or cubed (volume).' },
    ],
    worked: [
      { title: 'Worked example', q: 'A wire has length L = 1.50 ± 0.01 m and diameter d = 0.50 ± 0.01 mm. Find the percentage uncertainty in the cross-sectional area A = πd²/4.',
        steps: [
          'Percentage uncertainty in d = (0.01/0.50) × 100% = 2.0%.',
          'A depends on d², so its percentage uncertainty = 2 × 2.0% = 4.0%.',
          'L is not needed for the area; the answer is 4.0%.',
        ]},
    ],
    glossary: [
      { t: 'Systematic error', d: 'An error that shifts every reading by the same amount or proportion; not reduced by repeating.' },
      { t: 'Random error', d: 'An unpredictable scatter in readings, reduced by averaging repeats.' },
      { t: 'Precision', d: 'How close repeated readings are to each other.' },
      { t: 'Accuracy', d: 'How close a reading is to the true value.' },
      { t: 'Fractional uncertainty', d: 'Absolute uncertainty divided by the measured value (×100% for percentage).' },
    ],
    quiz: [
      { q: 'How do you reduce random errors?', a: 'Take repeat readings and average them.' },
      { q: 'How are uncertainties combined when multiplying quantities?', a: 'Add the fractional (or percentage) uncertainties.' },
      { q: 'If r has 3% uncertainty, what is the uncertainty in r³?', a: '9% (3 × 3%).' },
      { q: 'Precision vs accuracy — which describes a tight but off-target cluster?', a: 'Precise but not accurate.' },
    ],
    flashcards: [
      { q: 'Add or subtract: which uncertainty combines?', a: 'Add the ABSOLUTE uncertainties.' },
      { q: 'Multiply or divide: which uncertainty combines?', a: 'Add the FRACTIONAL/percentage uncertainties.' },
      { q: 'Can repeating fix a systematic error?', a: 'No — only fixing the cause can.' },
    ],
    takeaways: [
      'Systematic = shifts one way; random = scatters both ways.',
      'Add absolute uncertainties for ±; add fractional for ×/÷.',
      'For zⁿ, multiply the fractional uncertainty by n.',
    ],
    faqs: [
      { q: 'How many significant figures should a result have?', a: 'Match the least precise measurement used. Quote the uncertainty to 1 (occasionally 2) significant figures and round the value to the same decimal place.' },
    ],
    practice: { ref: '9702/22 · May/June 2023 · Q1', marks: 5,
      text: 'A resistance is found from R = V/I with V = 6.0 ± 0.1 V and I = 0.50 ± 0.02 A. Calculate R and its absolute uncertainty.' },
  },

  '9702:2.1': {
    code: '9702', sub: 'Physics', point: '2.1', name: 'Equations of motion',
    papers: 'Paper 1: Multiple Choice · Paper 2: AS Structured', tag: 'core concept', mins: 18,
    intro: 'The “suvat” equations describe motion under constant acceleration — the backbone of mechanics. This lesson derives them from velocity–time graphs and shows the sign conventions that examiners punish hardest.',
    objectives: [
      'Define displacement, velocity and acceleration.',
      'Use the four equations of motion for constant acceleration.',
      'Interpret the gradient and area of motion graphs.',
      'Apply a consistent sign convention to vertical motion under gravity.',
    ],
    diagram: 'vt',
    steps: [
      { n: 1, title: 'Gradient = acceleration', body: 'On a velocity–time graph, the gradient of the line is the acceleration: a = Δv/Δt.' },
      { n: 2, title: 'Area = displacement', body: 'The area under the line is the displacement. For constant acceleration it is a trapezium, s = ½(u+v)t.' },
      { n: 3, title: 'The equations', body: 'Combining the gradient and the area gives the suvat set — v = u + at and the rest follow.' },
    ],
    simple: {
      lead: 'If acceleration is constant, four tidy equations link displacement (s), initial velocity (u), final velocity (v), acceleration (a) and time (t). Pick the one that has your three knowns and the unknown you want.',
      analogy: 'It’s like a recipe card set: each suvat equation is a recipe missing one ingredient. Choose the recipe that uses exactly the ingredients you already have on the bench.',
    },
    formulas: [
      { tex: 'v = u + at', parts: [
        { s: 'v', m: 'final velocity — in m s⁻¹' },
        { s: 'u', m: 'initial velocity — in m s⁻¹' },
        { s: 'a', m: 'acceleration — in m s⁻²' },
        { s: 't', m: 'time — in s' },
      ]},
      { tex: 's = ut + ½at²', parts: [
        { s: 's', m: 'displacement — in m' },
        { s: 'u', m: 'initial velocity — in m s⁻¹' },
        { s: 'a', m: 'acceleration — in m s⁻²' },
        { s: 't', m: 'time — in s' },
      ]},
      { tex: 'v² = u² + 2as', parts: [
        { s: 'v', m: 'final velocity — in m s⁻¹' },
        { s: 'u', m: 'initial velocity — in m s⁻¹' },
        { s: 'a', m: 'acceleration — in m s⁻²' },
        { s: 's', m: 'displacement — in m' },
      ]},
    ],
    notes: [
      { h: '1. From graphs to equations', p: 'On a velocity–time graph the gradient is acceleration and the area under the line is displacement. For constant acceleration the line is straight: the area is a trapezium, which gives s = ½(u+v)t, and the gradient gives v = u + at. Combining them produces the other suvat equations.' },
      { h: '2. Sign conventions', p: 'Displacement, velocity and acceleration are vectors. Choose one direction as positive and stick to it. For a ball thrown up with g downward, taking “up” positive makes a = −9.81 m s⁻². At the highest point v = 0, but a is still −9.81 m s⁻².', tip: 'The most common dropped mark is forgetting that acceleration is still g at the top of a throw, where velocity is momentarily zero. Velocity zero does not mean acceleration zero.' },
    ],
    worked: [
      { title: 'Worked example', q: 'A stone is thrown vertically up at 12 m s⁻¹. Taking g = 9.81 m s⁻², find the maximum height reached.',
        steps: [
          'Take up as positive: u = +12 m s⁻¹, v = 0 at the top, a = −9.81 m s⁻².',
          'Use v² = u² + 2as → 0 = 12² + 2(−9.81)s.',
          's = 144 / (2 × 9.81) = 7.3 m (2 s.f.).',
        ]},
    ],
    glossary: [
      { t: 'Displacement', d: 'The straight-line distance and direction from start to finish (a vector).' },
      { t: 'Velocity', d: 'Rate of change of displacement (a vector).' },
      { t: 'Acceleration', d: 'Rate of change of velocity (a vector).' },
      { t: 'Free fall', d: 'Motion under gravity alone, with acceleration g ≈ 9.81 m s⁻².' },
    ],
    quiz: [
      { q: 'What does the gradient of a velocity–time graph represent?', a: 'Acceleration.' },
      { q: 'What does the area under a velocity–time graph represent?', a: 'Displacement.' },
      { q: 'At the top of a vertical throw, what is the acceleration?', a: 'g downward (≈ 9.81 m s⁻²) — velocity is zero, but acceleration is not.' },
      { q: 'Which suvat equation has no time term?', a: 'v² = u² + 2as.' },
    ],
    flashcards: [
      { q: 'State v = u + at in words.', a: 'Final velocity = initial velocity + acceleration × time.' },
      { q: 'Displacement from a v–t graph?', a: 'The area under the graph.' },
      { q: 'Condition for using the suvat equations?', a: 'Acceleration must be constant.' },
    ],
    takeaways: [
      'suvat applies only for constant acceleration.',
      'v–t graph: gradient = a, area = s.',
      'Pick a positive direction and keep signs consistent.',
    ],
    faqs: [
      { q: 'Can I use suvat for a car that speeds up then slows down?', a: 'Not in one step — acceleration is not constant. Split the motion into stages where acceleration is constant and apply suvat to each.' },
    ],
    practice: { ref: '9702/21 · May/June 2022 · Q2', marks: 6,
      text: 'A ball is dropped from rest from a height of 1.8 m onto a floor. Calculate the time to reach the floor and its speed on impact. Take g = 9.81 m s⁻².' },
  },

  '9702:3.1': {
    code: '9702', sub: 'Physics', point: '3.1', name: "Momentum and Newton's laws of motion",
    papers: 'Paper 1: Multiple Choice · Paper 2: AS Structured', tag: 'core concept', mins: 18,
    intro: "Newton's three laws are usually stated in terms of momentum — the proper A-Level definition. This lesson links force to rate of change of momentum and sets up the conservation principle used everywhere from collisions to rockets.",
    objectives: [
      'Define linear momentum as p = mv.',
      "State Newton's three laws of motion.",
      'Relate resultant force to rate of change of momentum.',
      'Use impulse = change in momentum.',
    ],
    simple: {
      lead: 'Momentum is “mass in motion” — how hard something is to stop. Newton’s second law really says: a resultant force changes momentum, and the faster you change it, the bigger the force.',
      analogy: 'Catching a cricket ball, you pull your hands back. Same change in momentum, but over a longer time — so a smaller force on your hands. That’s F = Δp/Δt in everyday life.',
    },
    formulas: [
      { tex: 'p = mv', parts: [
        { s: 'p', m: 'momentum — in kg m s⁻¹' },
        { s: 'm', m: 'mass — in kg' },
        { s: 'v', m: 'velocity — in m s⁻¹' },
      ]},
      { tex: 'F = Δp / Δt', parts: [
        { s: 'F', m: 'resultant force — in N' },
        { s: 'Δp', m: 'change in momentum — in kg m s⁻¹' },
        { s: 'Δt', m: 'time taken — in s' },
      ]},
    ],
    notes: [
      { h: '1. The three laws', p: '1st law: a body stays at rest or constant velocity unless acted on by a resultant force. 2nd law: the resultant force equals the rate of change of momentum (F = Δp/Δt, which gives F = ma for constant mass). 3rd law: forces act in equal, opposite pairs on two different bodies.' },
      { h: '2. Impulse', p: 'Impulse is force × time, equal to the change in momentum it causes: FΔt = Δp. On a force–time graph, impulse is the area under the graph. This is why airbags and crumple zones work — they extend Δt to reduce the force for the same Δp.', tip: 'A 3rd-law pair always acts on TWO different objects and is the same type of force. “Weight and the normal contact force on a book” is NOT a 3rd-law pair — they act on the same body.' },
    ],
    worked: [
      { title: 'Worked example', q: 'A 0.058 kg tennis ball arrives at 30 m s⁻¹ and leaves at 40 m s⁻¹ in the opposite direction after 5.0 ms. Find the average force on the ball.',
        steps: [
          'Take the outgoing direction as positive: Δp = m(v − u) = 0.058(40 − (−30)).',
          'Δp = 0.058 × 70 = 4.06 kg m s⁻¹.',
          'F = Δp/Δt = 4.06 / (5.0 × 10⁻³) = 810 N (2 s.f.).',
        ]},
    ],
    glossary: [
      { t: 'Linear momentum', d: 'The product of mass and velocity, p = mv (a vector).' },
      { t: 'Impulse', d: 'Force × time of action; equals the change in momentum (FΔt = Δp).' },
      { t: "Newton's first law", d: 'A body remains at rest or in uniform motion unless acted on by a resultant force.' },
      { t: "Newton's third law", d: 'For every force there is an equal and opposite force on a second body.' },
    ],
    quiz: [
      { q: 'Define linear momentum.', a: 'The product of mass and velocity, p = mv.' },
      { q: "State Newton's second law (momentum form).", a: 'The resultant force equals the rate of change of momentum, F = Δp/Δt.' },
      { q: 'What does the area under a force–time graph give?', a: 'The impulse (change in momentum).' },
      { q: 'Why do crumple zones reduce injury?', a: 'They increase the collision time, reducing the force for the same change in momentum.' },
    ],
    flashcards: [
      { q: 'Units of momentum?', a: 'kg m s⁻¹ (equivalently N s).' },
      { q: 'Impulse equals…?', a: 'Change in momentum, Δp = FΔt.' },
      { q: 'Do 3rd-law pairs act on the same body?', a: 'No — on two different bodies.' },
    ],
    takeaways: [
      'p = mv; momentum is a vector — mind the signs.',
      'F = Δp/Δt reduces to F = ma for constant mass.',
      'Impulse = FΔt = Δp = area under a force–time graph.',
    ],
    faqs: [
      { q: 'Why use F = Δp/Δt instead of F = ma?', a: 'F = Δp/Δt is the general form and works when mass changes (e.g. rockets). F = ma is the special case for constant mass.' },
    ],
    practice: { ref: '9702/22 · Oct/Nov 2021 · Q3', marks: 7,
      text: 'A 1200 kg car travelling at 15 m s⁻¹ is brought to rest in 0.30 s in a crash. Calculate the change in momentum and the average force on the car, and explain how a crumple zone reduces the force.' },
  },

  '9702:4.2': {
    code: '9702', sub: 'Physics', point: '4.2', name: 'Equilibrium of forces',
    papers: 'Paper 1: Multiple Choice · Paper 2: AS Structured', tag: 'core concept', mins: 16,
    intro: 'A body in equilibrium has no resultant force and no resultant moment. This lesson covers the two conditions for equilibrium, the principle of moments, and the closed-triangle test for three coplanar forces.',
    objectives: [
      'State the two conditions for equilibrium.',
      'Apply the principle of moments.',
      'Resolve forces into perpendicular components.',
      'Use a closed vector triangle for three forces in equilibrium.',
    ],
    simple: {
      lead: 'Equilibrium means balanced twice over: the pushes cancel (no resultant force) AND the turns cancel (no resultant moment). Both must hold.',
      analogy: 'A see-saw sitting level is the whole idea: the kids’ weights × their distances balance (moments), and the pivot pushes up to cancel their total weight (forces).',
    },
    formulas: [
      { tex: 'moment = F × d', parts: [
        { s: 'moment', m: 'turning effect — in N m' },
        { s: 'F', m: 'force — in N' },
        { s: 'd', m: 'perpendicular distance to the pivot — in m' },
      ]},
    ],
    notes: [
      { h: '1. The two conditions', p: 'For equilibrium: (1) the resultant force in every direction is zero, and (2) the resultant moment about any point is zero. If either fails, the body accelerates or rotates.' },
      { h: '2. Principle of moments', p: 'For a body in rotational equilibrium, the sum of clockwise moments about a point equals the sum of anticlockwise moments about that point. Choose your pivot at an unknown force to eliminate it from the equation.', tip: 'Always take the PERPENDICULAR distance from the pivot to the line of action of the force. For an angled force, either resolve the force or use the perpendicular distance — never the slant length.' },
    ],
    worked: [
      { title: 'Worked example', q: 'A uniform 2.0 m beam of weight 40 N rests on a pivot 0.50 m from its left end. A load W hangs at the left end. Find W for balance.',
        steps: [
          'The beam’s weight (40 N) acts at its centre, 1.0 m from the left end — i.e. 0.50 m to the right of the pivot.',
          'Clockwise moment (weight): 40 × 0.50 = 20 N m.',
          'Anticlockwise moment (load W at 0.50 m left of pivot): W × 0.50.',
          'Balance: 0.50 W = 20 → W = 40 N.',
        ]},
    ],
    glossary: [
      { t: 'Equilibrium', d: 'A state of zero resultant force and zero resultant moment.' },
      { t: 'Moment', d: 'The turning effect of a force: force × perpendicular distance to the pivot.' },
      { t: 'Principle of moments', d: 'In equilibrium, total clockwise moments = total anticlockwise moments about any point.' },
      { t: 'Couple', d: 'Two equal, opposite, parallel forces whose only effect is to rotate.' },
    ],
    quiz: [
      { q: 'State the two conditions for equilibrium.', a: 'Zero resultant force and zero resultant moment.' },
      { q: 'Define the moment of a force.', a: 'Force × perpendicular distance from the pivot to the line of action.' },
      { q: 'Why choose the pivot at an unknown force?', a: 'That force has zero moment about itself, so it drops out of the equation.' },
      { q: 'Three forces in equilibrium form what when drawn tip-to-tail?', a: 'A closed triangle.' },
    ],
    flashcards: [
      { q: 'Units of a moment?', a: 'N m.' },
      { q: 'Equilibrium needs which two things to be zero?', a: 'Resultant force and resultant moment.' },
      { q: 'Which distance goes in moment = F × d?', a: 'The perpendicular distance to the pivot.' },
    ],
    takeaways: [
      'Equilibrium = no resultant force AND no resultant moment.',
      'Moment = F × perpendicular distance.',
      'Three forces in equilibrium close into a vector triangle.',
    ],
    faqs: [
      { q: 'Does it matter which point I take moments about?', a: 'No — for a body in equilibrium the resultant moment is zero about ANY point. Pick the point that removes the most unknowns.' },
    ],
    practice: { ref: '9702/21 · May/June 2023 · Q3', marks: 6,
      text: 'A uniform plank of weight 120 N and length 3.0 m rests on two supports, one at each end. A 200 N child stands 1.0 m from the left support. Find the force on each support.' },
  },

  '9702:5.1': {
    code: '9702', sub: 'Physics', point: '5.1', name: 'Energy conservation',
    papers: 'Paper 1: Multiple Choice · Paper 2: AS Structured', tag: 'core concept', mins: 16,
    intro: 'Energy is never created or destroyed, only transferred. This lesson states the principle of conservation of energy, links work and power, and applies the work–energy idea to real mechanical problems.',
    objectives: [
      'State the principle of conservation of energy.',
      'Calculate work done by a force.',
      'Relate power to work done and to force × velocity.',
      'Apply energy conservation to mechanical systems.',
    ],
    simple: {
      lead: 'Energy just moves around — from one store to another — but the total never changes in a closed system. Work is the amount of energy a force transfers; power is how fast it does so.',
      analogy: 'Think of energy like money in sealed accounts: you can transfer it between savings and current accounts (stores), but the total balance never changes unless money enters or leaves the system.',
    },
    formulas: [
      { tex: 'W = F·s·cosθ', parts: [
        { s: 'W', m: 'work done — in J' },
        { s: 'F', m: 'force — in N' },
        { s: 's', m: 'displacement — in m' },
        { s: 'θ', m: 'angle between force and motion' },
      ]},
      { tex: 'P = W / t', parts: [
        { s: 'P', m: 'power — in W' },
        { s: 'W', m: 'work done (energy transferred) — in J' },
        { s: 't', m: 'time — in s' },
      ]},
      { tex: 'P = F·v', parts: [
        { s: 'P', m: 'power — in W' },
        { s: 'F', m: 'force — in N' },
        { s: 'v', m: 'velocity — in m s⁻¹' },
      ]},
    ],
    notes: [
      { h: '1. Work done', p: 'Work is done when a force moves its point of application: W = Fs cosθ, where θ is the angle between the force and the displacement. A force perpendicular to motion (θ = 90°) does no work — which is why the tension in a string does no work on an object in circular motion.' },
      { h: '2. Conservation and efficiency', p: 'Total energy in a closed system is constant. In real machines some input energy becomes “wasted” heat, so efficiency = useful output energy / total input energy. It is always less than 100% for any real device.', tip: 'When a question says “smooth” or “frictionless”, no energy is lost — set initial total energy equal to final total energy. If it mentions friction or drag, account for the energy transferred to heat.' },
    ],
    worked: [
      { title: 'Worked example', q: 'A 0.20 kg ball is dropped from 1.8 m onto the ground. Ignoring air resistance, find its speed just before impact (g = 9.81 m s⁻²).',
        steps: [
          'GPE lost = mgh = 0.20 × 9.81 × 1.8 = 3.53 J.',
          'By conservation this becomes kinetic energy: ½mv² = 3.53 J.',
          'v = √(2 × 3.53 / 0.20) = 5.9 m s⁻¹ (2 s.f.).',
        ]},
    ],
    glossary: [
      { t: 'Work done', d: 'Energy transferred by a force: W = Fs cosθ.' },
      { t: 'Power', d: 'Rate of energy transfer (or rate of doing work), in watts.' },
      { t: 'Conservation of energy', d: 'Total energy in a closed system is constant.' },
      { t: 'Efficiency', d: 'Useful output energy ÷ total input energy (always < 1 in practice).' },
    ],
    quiz: [
      { q: 'When does a force do no work?', a: 'When it is perpendicular to the motion (θ = 90°).' },
      { q: 'Give two expressions for power.', a: 'P = W/t and P = Fv.' },
      { q: 'State the principle of conservation of energy.', a: 'Energy cannot be created or destroyed, only transferred; the total in a closed system is constant.' },
      { q: 'Why is real efficiency always below 100%?', a: 'Some input energy is always transferred to wasted forms such as heat.' },
    ],
    flashcards: [
      { q: 'Formula for work done at an angle?', a: 'W = Fs cosθ.' },
      { q: 'Power in terms of force and velocity?', a: 'P = Fv.' },
      { q: 'KE and GPE formulas?', a: 'KE = ½mv², GPE = mgh.' },
    ],
    takeaways: [
      'Energy is conserved in a closed system.',
      'W = Fs cosθ; a perpendicular force does no work.',
      'P = W/t = Fv.',
    ],
    faqs: [
      { q: 'Is energy conserved when there is friction?', a: 'Yes — total energy is still conserved. Friction simply transfers some mechanical energy to thermal energy, so the kinetic + potential total falls.' },
    ],
    practice: { ref: '9702/22 · Oct/Nov 2022 · Q4', marks: 7,
      text: 'A 60 kg cyclist freewheels from rest down a slope, descending 8.0 m vertically, and reaches 9.0 m s⁻¹. Calculate the energy transferred to resistive forces.' },
  },

  '9702:7.1': {
    code: '9702', sub: 'Physics', point: '7.1', name: 'Progressive waves',
    papers: 'Paper 1: Multiple Choice · Paper 2: AS Structured', tag: 'core concept', mins: 16,
    intro: 'A progressive wave transfers energy without transferring matter. This lesson defines the key wave quantities, derives the wave equation v = fλ, and explains phase difference — a favourite of multiple-choice papers.',
    objectives: [
      'Define displacement, amplitude, wavelength, period and frequency.',
      'Use the wave equation v = fλ.',
      'Explain phase difference between points on a wave.',
      'Relate intensity to amplitude.',
    ],
    simple: {
      lead: 'A wave carries energy along while the medium itself just wobbles in place. Frequency is how many waves pass per second; wavelength is the length of one full wave; multiply them and you get the wave’s speed.',
      analogy: 'A Mexican wave in a stadium: the “wave” travels around the ground, but each person only stands up and sits down — nobody runs around with it. Energy moves; people don’t.',
    },
    formulas: [
      { tex: 'v = fλ', parts: [
        { s: 'v', m: 'wave speed — in m s⁻¹' },
        { s: 'f', m: 'frequency — in Hz' },
        { s: 'λ', m: 'wavelength — in m' },
      ]},
      { tex: 'f = 1 / T', parts: [
        { s: 'f', m: 'frequency — in Hz' },
        { s: 'T', m: 'period — in s' },
      ]},
    ],
    notes: [
      { h: '1. Wave quantities', p: 'Amplitude is the maximum displacement from equilibrium. Wavelength λ is the distance for one complete cycle. Period T is the time for one cycle, and frequency f = 1/T is the number of cycles per second. The wave speed is v = fλ.' },
      { h: '2. Phase difference', p: 'Phase difference describes how “in step” two points (or two waves) are, measured in radians or degrees. Points one wavelength apart are in phase (360° or 2π rad); points half a wavelength apart are in antiphase (180° or π rad). Intensity is proportional to amplitude squared, I ∝ A².', tip: 'A doubling of amplitude quadruples the intensity (I ∝ A²). Watch for this in multiple choice — it is a classic distractor.' },
    ],
    worked: [
      { title: 'Worked example', q: 'A sound wave has frequency 256 Hz and travels at 340 m s⁻¹ in air. Find its wavelength.',
        steps: [
          'Use v = fλ → λ = v/f.',
          'λ = 340 / 256 = 1.33 m.',
          'The wavelength is about 1.3 m (2 s.f.).',
        ]},
    ],
    glossary: [
      { t: 'Amplitude', d: 'The maximum displacement of a particle from its equilibrium position.' },
      { t: 'Wavelength', d: 'The distance between adjacent points in phase (one full cycle).' },
      { t: 'Period', d: 'The time for one complete oscillation, T = 1/f.' },
      { t: 'Phase difference', d: 'How far out of step two points are, in degrees or radians.' },
      { t: 'Intensity', d: 'Power per unit area; proportional to amplitude squared.' },
    ],
    quiz: [
      { q: 'What does a progressive wave transfer?', a: 'Energy, without transferring matter.' },
      { q: 'State the wave equation.', a: 'v = fλ.' },
      { q: 'Phase difference between points half a wavelength apart?', a: '180° (π radians) — antiphase.' },
      { q: 'How does intensity depend on amplitude?', a: 'Intensity is proportional to amplitude squared (I ∝ A²).' },
    ],
    flashcards: [
      { q: 'Wave equation?', a: 'v = fλ.' },
      { q: 'Relationship between f and T?', a: 'f = 1/T.' },
      { q: 'I ∝ ? for waves', a: 'Amplitude squared (A²).' },
    ],
    takeaways: [
      'Progressive waves transfer energy, not matter.',
      'v = fλ and f = 1/T.',
      'Intensity ∝ amplitude².',
    ],
    faqs: [
      { q: 'What is the difference between transverse and longitudinal waves?', a: 'In transverse waves the oscillations are perpendicular to the energy transfer (e.g. light); in longitudinal waves they are parallel to it (e.g. sound).' },
    ],
    practice: { ref: '9702/12 · May/June 2023 · Q14', marks: 5,
      text: 'A wave on a string has period 0.020 s and wavelength 0.15 m. Calculate its frequency and speed.' },
  },

  '9702:9.1': {
    code: '9702', sub: 'Physics', point: '9.1', name: 'Electric current',
    papers: 'Paper 1: Multiple Choice · Paper 2: AS Structured', tag: 'core concept', mins: 16,
    intro: 'Current is the flow of charge. This lesson defines current and charge, introduces the equation I = nAvq for charge carriers, and clarifies conventional current vs electron flow.',
    objectives: [
      'Define electric current and the coulomb.',
      'Use Q = It.',
      'Apply I = nAvq for charge carriers in a conductor.',
      'Distinguish conventional current from electron flow.',
    ],
    simple: {
      lead: 'Current is simply how much charge flows past a point each second. One amp is one coulomb per second. The more carriers, the faster they drift, and the wider the wire, the bigger the current.',
      analogy: 'Picture a motorway: current is the number of cars passing a bridge per minute. More lanes (area), more cars per lane (carrier density) and faster traffic (drift speed) all increase the flow.',
    },
    formulas: [
      { tex: 'Q = I·t', parts: [
        { s: 'Q', m: 'charge — in C' },
        { s: 'I', m: 'current — in A' },
        { s: 't', m: 'time — in s' },
      ]},
      { tex: 'I = nAvq', parts: [
        { s: 'n', m: 'number density of carriers — in m⁻³' },
        { s: 'A', m: 'cross-sectional area — in m²' },
        { s: 'v', m: 'mean drift velocity — in m s⁻¹' },
        { s: 'q', m: 'charge per carrier — in C' },
      ]},
    ],
    notes: [
      { h: '1. Current and charge', p: 'Electric current is the rate of flow of charge: I = Q/t, so charge Q = It. The unit of charge, the coulomb, is one ampere-second. Charge is quantised in units of the elementary charge e = 1.60 × 10⁻¹⁹ C.' },
      { h: '2. The transport equation', p: 'In a conductor, current depends on the number density of charge carriers n, the cross-sectional area A, the mean drift velocity v and the charge q on each carrier: I = nAvq. For a fixed current, a thinner wire (smaller A) forces a larger drift velocity.', tip: 'Conventional current flows from + to − (the direction a positive charge would move). In a metal the electrons actually drift the opposite way. Examiners reward stating this clearly.' },
    ],
    worked: [
      { title: 'Worked example', q: 'A current of 0.50 A flows in a copper wire of cross-sectional area 1.0 × 10⁻⁶ m². If n = 8.5 × 10²⁸ m⁻³ and q = 1.6 × 10⁻¹⁹ C, find the mean drift velocity.',
        steps: [
          'Rearrange I = nAvq → v = I/(nAq).',
          'v = 0.50 / (8.5 × 10²⁸ × 1.0 × 10⁻⁶ × 1.6 × 10⁻¹⁹).',
          'v ≈ 3.7 × 10⁻⁵ m s⁻¹ — very slow, despite the lamp lighting instantly.',
        ]},
    ],
    glossary: [
      { t: 'Electric current', d: 'The rate of flow of charge, I = Q/t.' },
      { t: 'Coulomb', d: 'The SI unit of charge; one ampere-second.' },
      { t: 'Drift velocity', d: 'The mean velocity of charge carriers along a conductor.' },
      { t: 'Number density', d: 'The number of charge carriers per unit volume, n.' },
      { t: 'Elementary charge', d: 'The charge on one electron, e = 1.60 × 10⁻¹⁹ C.' },
    ],
    quiz: [
      { q: 'Define electric current.', a: 'The rate of flow of electric charge, I = Q/t.' },
      { q: 'What is one coulomb?', a: 'The charge passing when a current of one ampere flows for one second.' },
      { q: 'State the charge-carrier equation.', a: 'I = nAvq.' },
      { q: 'Which way does conventional current flow?', a: 'From positive to negative — opposite to electron flow in a metal.' },
    ],
    flashcards: [
      { q: 'Charge in terms of current and time?', a: 'Q = It.' },
      { q: 'Charge-carrier (transport) equation?', a: 'I = nAvq.' },
      { q: 'Value of the elementary charge?', a: '1.60 × 10⁻¹⁹ C.' },
    ],
    takeaways: [
      'Current = rate of flow of charge; Q = It.',
      'I = nAvq links current to carriers and geometry.',
      'Conventional current is opposite to electron drift in metals.',
    ],
    faqs: [
      { q: 'If drift velocity is tiny, why does a lamp light instantly?', a: 'The electric field is established along the wire at near light-speed, so charge carriers everywhere — including in the lamp — start drifting almost immediately.' },
    ],
    practice: { ref: '9702/22 · Oct/Nov 2022 · Q6', marks: 6,
      text: 'A wire carries a current of 1.2 A. Calculate the charge passing in 2.0 minutes, and the number of electrons this represents.' },
  },

  '9702:17.1': {
    code: '9702', sub: 'Physics', point: '17.1', name: 'Simple harmonic motion',
    papers: 'Paper 4: A Level Structured', tag: 'core concept', mins: 18,
    diagram: 'shm',
    steps: [
      { n: 1, title: 'Restoring force', body: 'Displace the mass and a force pulls it back towards equilibrium. The acceleration is proportional to displacement and points back: a = −ω²x.' },
      { n: 2, title: 'Oscillation', body: 'Released, the mass oscillates. Its displacement traces a cosine in time: x = x₀cos(ωt), where x₀ is the amplitude.' },
      { n: 3, title: 'Velocity', body: 'Speed is greatest at the centre (v_max = ωx₀) and momentarily zero at the extremes, where acceleration is greatest.' },
      { n: 4, title: 'Period', body: 'One full cycle takes the period T = 2π/ω. For SHM, T is independent of amplitude — the defining bonus of the motion.' },
    ],
    intro: 'Simple harmonic motion is the oscillation behind pendulums, springs, tides and AC. This lesson defines SHM by its acceleration–displacement relationship and builds the equations for displacement, velocity and period.',
    objectives: [
      'Define simple harmonic motion by a = −ω²x.',
      'Use x = x₀cos(ωt) and relate ω to period and frequency.',
      'Find the maximum speed and maximum acceleration.',
      'Recognise that the period of SHM is independent of amplitude (isochronous).',
    ],
    simple: {
      lead: 'SHM is any wobble where the pull back to the middle grows in proportion to how far you have strayed — and always points home. That single rule gives a smooth, repeating cosine motion.',
      analogy: 'Picture a ball in a smooth bowl. Nudge it and it rolls back; the further out you push it, the harder it is pulled back. Let go and it rocks side to side with a steady, repeating rhythm.',
    },
    formulas: [
      { tex: 'a = −ω²x', parts: [
        { s: 'a', m: 'acceleration — in m s⁻²' },
        { s: 'ω', m: 'angular frequency — in rad s⁻¹' },
        { s: 'x', m: 'displacement from equilibrium — in m' },
      ]},
      { tex: 'v_max = ωx₀', parts: [
        { s: 'v_max', m: 'maximum speed (at the centre) — in m s⁻¹' },
        { s: 'ω', m: 'angular frequency — in rad s⁻¹' },
        { s: 'x₀', m: 'amplitude — in m' },
      ]},
      { tex: 'ω = 2π/T = 2πf', parts: [
        { s: 'ω', m: 'angular frequency — in rad s⁻¹' },
        { s: 'T', m: 'period — in s' },
        { s: 'f', m: 'frequency — in Hz' },
      ]},
    ],
    notes: [
      { h: '1. The defining condition', p: 'A body performs SHM when its acceleration is directly proportional to its displacement from a fixed point and always directed towards that point: a = −ω²x. The minus sign encodes “restoring” — the acceleration opposes the displacement.', tip: 'When asked to SHOW that a motion is SHM, you must derive a = −ω²x explicitly. Merely quoting the equation scores zero — examiners want the proportionality and the negative (restoring) sign demonstrated.' },
      { h: '2. Velocity and acceleration', p: 'Starting from x = x₀cos(ωt), the velocity is v = −ωx₀sin(ωt), so the maximum speed is v_max = ωx₀ at the centre (x = 0). Acceleration is greatest at the extremes, a_max = ω²x₀, where the speed is momentarily zero.' },
    ],
    worked: [
      { title: 'Worked example', q: 'A trolley on springs oscillates with SHM of period 0.40 s and amplitude 2.0 cm. Calculate ω and the maximum speed.',
        steps: [
          'ω = 2π/T = 2π/0.40 = 15.7 rad s⁻¹.',
          'Convert amplitude: x₀ = 2.0 cm = 0.020 m.',
          'v_max = ωx₀ = 15.7 × 0.020 = 0.31 m s⁻¹ (2 s.f.).',
        ]},
    ],
    glossary: [
      { t: 'Simple harmonic motion', d: 'Oscillation where a = −ω²x: acceleration ∝ displacement, directed towards equilibrium.' },
      { t: 'Angular frequency (ω)', d: 'Rate of phase change, ω = 2πf = 2π/T, in rad s⁻¹.' },
      { t: 'Amplitude (x₀)', d: 'The maximum displacement from equilibrium.' },
      { t: 'Period (T)', d: 'Time for one complete oscillation; for SHM, independent of amplitude.' },
    ],
    quiz: [
      { q: 'State the defining equation of SHM.', a: 'a = −ω²x.' },
      { q: 'What does the minus sign signify?', a: 'The acceleration (restoring force) is always directed towards equilibrium, opposing displacement.' },
      { q: 'Where is the speed maximum?', a: 'At the equilibrium position (centre), where v_max = ωx₀.' },
      { q: 'Does the period of SHM depend on amplitude?', a: 'No — SHM is isochronous; T is independent of amplitude.' },
    ],
    flashcards: [
      { q: 'Defining equation of SHM?', a: 'a = −ω²x.' },
      { q: 'Maximum speed in SHM?', a: 'v_max = ωx₀ (at the centre).' },
      { q: 'Relate ω to period and frequency.', a: 'ω = 2π/T = 2πf.' },
    ],
    takeaways: [
      'SHM is defined by a = −ω²x (restoring, ∝ displacement).',
      'v_max = ωx₀ at the centre; a_max = ω²x₀ at the extremes.',
      'The period is independent of amplitude (isochronous).',
    ],
    faqs: [
      { q: 'Why is a pendulum only approximately SHM?', a: 'The restoring force is proportional to sin θ, not θ. For small angles sin θ ≈ θ, so the motion is approximately SHM; at large angles the approximation breaks down.' },
    ],
    practice: { ref: '9702/41 · May/June 2022 · Q3', marks: 6,
      text: 'A mass on a spring oscillates with SHM of frequency 1.5 Hz and amplitude 3.0 cm. Calculate ω, the maximum speed and the maximum acceleration.' },
  },
};
