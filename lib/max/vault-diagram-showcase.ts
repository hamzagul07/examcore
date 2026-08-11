/**
 * Curated Max Vault syllabus diagram theatres — per subject the student chose.
 * Hand-picked motion diagrams + teaching step captions for understanding.
 */
import { hasLessonLiveDiagram } from '@/lib/courses/lesson-diagrams'
import { getCourseLesson } from '@/lib/courses'
import { getLessonDiagramSpec } from '@/lib/courses/diagram-specs'
import { isIbSubjectCode } from '@/lib/ib/marking-config'
import { getSyllabusSubjectName } from '@/lib/syllabi'

export type VaultShowcaseDiagram = {
  slug: string
  title: string
  tagline: string
  topicCode: string
  lessonHref: string
  chip: string
  /** Short teaching beats that advance with stepIndex (understanding-first). */
  teachingSteps: string[]
}

export type VaultDiagramTheatre = {
  subjectCode: string
  subjectLabel: string
  catalogCount: number
  signature: VaultShowcaseDiagram | null
  gallery: VaultShowcaseDiagram[]
}

type ShowcaseSeed = {
  slug: string
  title: string
  tagline: string
  topicCode: string
  chip: string
  /** Fallback beats when diagram-specs has none. */
  beats?: string[]
}

/** Best-of catalog — motion-led diagrams students remember. */
const SHOWCASE_BY_SUBJECT: Record<string, ShowcaseSeed[]> = {
  '9709': [
    {
      slug: '1-7-differentiation',
      title: 'Differentiation — secant becomes tangent',
      tagline: 'The chord collapses into the gradient. See the derivative as a limit.',
      topicCode: '1.7',
      chip: 'Signature',
      beats: [
        'Start with a secant through two points on the curve.',
        'Slide the second point closer — the chord steepens toward the tangent.',
        'The limit of that gradient is $f\'(x)$ — the instantaneous rate of change.',
        'Power rule: if $y = x^n$ then $\\dfrac{dy}{dx} = nx^{n-1}$.',
      ],
    },
    {
      slug: '1-1-quadratics',
      title: 'Quadratics — completing the square',
      tagline: 'Watch the parabola settle into vertex form. Completing the square becomes geometry.',
      topicCode: '1.1',
      chip: 'Pure',
      beats: [
        '$y = ax^2 + bx + c$ starts as a stretched, shifted parabola.',
        'Completing the square rewrites it as $a(x - h)^2 + k$.',
        'The vertex $(h, k)$ is the turning point — min or max.',
        'Use vertex form to solve, sketch, and find the range.',
      ],
    },
    {
      slug: '1-8-integration',
      title: 'Integration — area under the curve',
      tagline: 'Area accumulates as the fill sweeps. Definite integrals stop being abstract.',
      topicCode: '1.8',
      chip: 'Pure',
      beats: [
        'Shade the region between the curve and the $x$-axis.',
        'A definite integral adds thin strips from $a$ to $b$.',
        'Antiderivative $F(b) - F(a)$ equals that signed area.',
        'Watch the sign: below the axis means negative contribution.',
      ],
    },
    {
      slug: '1-5-trigonometry',
      title: 'Trigonometry — unit circle to wave',
      tagline: 'The circle unrolls into sin and cos. Exact values stick because they move.',
      topicCode: '1.5',
      chip: 'Pure',
      beats: [
        'A point walks around the unit circle.',
        'Height vs angle draws the sine wave.',
        'Horizontal position draws cosine.',
        'Exact values (0, 30, 45, 60, 90) land on clear heights.',
      ],
    },
    {
      slug: '1-6-series',
      title: 'Series — binomial coefficients',
      tagline: 'Pascal rows fall into place. Binomial expansion becomes pattern, not memory.',
      topicCode: '1.6',
      chip: 'Pure',
      beats: [
        'Each Pascal row builds from the one above.',
        'Coefficients match (a + b)ⁿ expansions.',
        'Pick the term you need without expanding everything.',
        'nCr is the combinatorial reading of those entries.',
      ],
    },
    {
      slug: '5-5-the-normal-distribution',
      title: 'Normal distribution — the bell',
      tagline: 'Mean and SD reshape the curve while probability regions light up.',
      topicCode: '5.5',
      chip: 'Stats',
      beats: [
        'The bell is centred on the mean μ.',
        'σ stretches or squeezes the spread.',
        'Shade a region to read P(a < X < b).',
        'Standardise to Z when the table demands it.',
      ],
    },
  ],
  '9702': [
    {
      slug: '17-1-simple-harmonic-oscillations',
      title: 'SHM — a point riding the wave',
      tagline: 'Watch amplitude breathe. Displacement, velocity and a = −ω²x click because they move.',
      topicCode: '17.1',
      chip: 'Signature',
      beats: [
        'Restoring force always points toward equilibrium ($F \\propto -x$).',
        'Displacement traces a smooth sine in time.',
        'Velocity leads displacement by a quarter-cycle.',
        'Acceleration is opposite displacement — $a = -\\omega^2 x$.',
      ],
    },
    {
      slug: '8-1-stationary-waves',
      title: 'Stationary waves — nodes and antinodes',
      tagline: 'Two waves lock into a standing pattern. Nodes freeze; antinodes breathe.',
      topicCode: '8.1',
      chip: 'Waves',
      beats: [
        'Two equal waves travel in opposite directions.',
        'Interference creates fixed nodes (zero amplitude).',
        'Antinodes oscillate with maximum amplitude.',
        'λ/2 between adjacent nodes — classic exam measurement.',
      ],
    },
    {
      slug: '14-3-specific-heat-capacity-and-specific-latent-heat',
      title: 'Heating curve — phase change live',
      tagline: 'Temperature flatlines while energy still pours in. Latent heat, finally visual.',
      topicCode: '14.3',
      chip: 'Thermal',
      beats: [
        'Heat raises temperature on the sloping parts (c = Q / mΔθ).',
        'During melting/boiling the line is flat — energy goes into breaking bonds.',
        'That flat energy is latent heat (L = Q / m).',
        'Examiners love: identify which segment is c vs L.',
      ],
    },
    {
      slug: '10-3-potential-dividers',
      title: 'Potential divider — voltage split',
      tagline: 'Slide the ratio and watch the output track. Circuits stop being black boxes.',
      topicCode: '10.3',
      chip: 'Electricity',
      beats: [
        'Two resistors share the supply in series.',
        'V_out = V_in × R2 / (R1 + R2).',
        'Change R2 and the split moves instantly.',
        'Use this for sensors: LDR / thermistor as one arm.',
      ],
    },
    {
      slug: '2-1-equations-of-motion',
      title: 'Kinematics — suvat on the graph',
      tagline: 'Gradient is velocity; area is displacement. The equations write themselves.',
      topicCode: '2.1',
      chip: 'Mechanics',
      beats: [
        's–t slope = velocity.',
        'v–t slope = acceleration.',
        'Area under v–t = displacement.',
        'Pick the suvat equation that matches knowns/unknowns.',
      ],
    },
    {
      slug: '20-5-electromagnetic-induction',
      title: 'Electromagnetic induction',
      tagline: 'Flux change drives emf. Faraday stops being a formula you recite.',
      topicCode: '20.5',
      chip: 'Fields',
      beats: [
        'Magnetic flux is field × area (through the loop).',
        'Change the flux — emf appears.',
        'Faraday: ε = − dΦ/dt.',
        'Lenz: the induced current opposes the change.',
      ],
    },
  ],
  '9701': [
    {
      slug: '1-4-ionisation-energy',
      title: 'Ionisation energy — shell jumps',
      tagline: 'Successive ionisations spike when you crack a new shell.',
      topicCode: '1.4',
      chip: 'Signature',
      beats: [
        'First IE removes the outermost electron.',
        'Successive IEs climb as the ion gets more positive.',
        'A big jump means you opened a new inner shell.',
        'Use the jump to deduce group / electron structure.',
      ],
    },
    {
      slug: '1-3-electrons-energy-levels-and-atomic-orbitals',
      title: 'Atomic orbitals — energy levels',
      tagline: 'Electrons occupy levels you can see. Configuration becomes geometry.',
      topicCode: '1.3',
      chip: 'Atomic',
      beats: [
        'Electrons sit in shells / subshells with fixed energies.',
        'Aufbau fills lowest levels first.',
        'Orbitals are regions of probability, not planet orbits.',
        'Link configuration to IE and periodic trends.',
      ],
    },
    {
      slug: '1-1-particles-in-the-atom-and-atomic-radius',
      title: 'Atomic structure — particles & radius',
      tagline: 'Protons, neutrons, electrons and size trends in one clear stage.',
      topicCode: '1.1',
      chip: 'Atomic',
      beats: [
        'Nucleus holds protons and neutrons.',
        'Electrons occupy the cloud around it.',
        'Across a period, radius usually shrinks.',
        'Down a group, radius grows as shells are added.',
      ],
    },
  ],
  '9700': [
    {
      slug: '1-2-cells-as-the-basic-units-of-living-organisms',
      title: 'Cell structure — the living unit',
      tagline: 'Organelles in place, labelled for the exam.',
      topicCode: '1.2',
      chip: 'Signature',
      beats: [
        'Identify the nucleus, membrane, cytoplasm.',
        'Match each organelle to its function.',
        'Compare plant vs animal extras (wall, chloroplast, vacuole).',
        'Exam move: label accurately, then explain function.',
      ],
    },
    {
      slug: '11-1-the-immune-system',
      title: 'Immune system — defence cascade',
      tagline: 'Pathogen → recognition → response — the storyboard examiners expect.',
      topicCode: '11.1',
      chip: 'Physiology',
      beats: [
        'Barrier defences come first.',
        'Phagocytes engulf pathogens.',
        'Lymphocytes drive specific immunity.',
        'Antibodies bind antigens with specificity.',
      ],
    },
    {
      slug: '12-2-respiration',
      title: 'Respiration — energy pathway',
      tagline: 'Glucose to ATP without the wall of text.',
      topicCode: '12.2',
      chip: 'Biochem',
      beats: [
        'Glycolysis splits glucose in the cytoplasm.',
        'Link reaction feeds the Krebs cycle.',
        'Oxidative phosphorylation makes most ATP.',
        'Track where CO₂ and H₂O appear.',
      ],
    },
  ],
  '9618': [
    {
      slug: '3-2-logic-gates-and-logic-circuits',
      title: 'Logic gates — truth to circuit',
      tagline: 'Flip inputs and watch outputs update. Boolean stops being abstract.',
      topicCode: '3.2',
      chip: 'Signature',
      beats: [
        'Each gate has a truth table.',
        'AND needs both inputs true.',
        'OR needs at least one; NOT inverts.',
        'Combine gates to match a required Boolean expression.',
      ],
    },
    {
      slug: '1-1-data-representation',
      title: 'Data representation — bits & encoding',
      tagline: 'Binary, hex, ASCII — the encodings under every paper.',
      topicCode: '1.1',
      chip: 'Theory',
      beats: [
        'Bits are 0/1; bytes group eight of them.',
        'Hex compresses binary for humans.',
        'ASCII / Unicode map characters to numbers.',
        'Two’s complement stores signed integers.',
      ],
    },
    {
      slug: '10-1-data-types-and-records',
      title: 'Data types & records',
      tagline: 'Structures you can point at for Paper 2.',
      topicCode: '10.1',
      chip: 'Programming',
      beats: [
        'Primitive types: integer, real, boolean, char, string.',
        'A record groups related fields.',
        'Declare before you use — examiners check this.',
        'Arrays hold many values of one type.',
      ],
    },
  ],
  '9708': [
    {
      slug: '2-4-the-interaction-of-demand-and-supply',
      title: 'Demand & supply — market equilibrium',
      tagline: 'Curves shift; equilibrium moves. The classic Econ diagram, live.',
      topicCode: '2.4',
      chip: 'Signature',
      beats: [
        'Demand slopes down; supply slopes up.',
        'Where they cross is equilibrium price and quantity.',
        'A demand shift moves the intersection.',
        'A supply shift moves it the other way — label every axis and curve.',
      ],
    },
    {
      slug: '1-5-production-possibility-curves',
      title: 'Production possibility curves',
      tagline: 'Scarcity, choice, and opportunity cost on one diagram.',
      topicCode: '1.5',
      chip: 'Foundation',
      beats: [
        'The PPC shows maximum combinations from scarce resources.',
        'A point inside is inefficient; on the curve is efficient.',
        'Moving along the curve reveals opportunity cost.',
        'Outward shifts mean economic growth — more resources or better tech.',
      ],
    },
    {
      slug: '2-2-price-elasticity-income-elasticity-and-cross-elasticity-of-demand',
      title: 'Elasticity of demand',
      tagline: 'How much quantity responds when price (or income) changes.',
      topicCode: '2.2',
      chip: 'Micro',
      beats: [
        'PED = %ΔQd / %ΔP — ignore the minus sign in the calculation story.',
        'Inelastic demand: steep curve; total revenue rises with price.',
        'Elastic demand: flatter curve; total revenue falls when price rises.',
        'YED and XED extend the same responsiveness idea to income and related goods.',
      ],
    },
    {
      slug: '4-3-aggregate-demand-and-aggregate-supply-analysis',
      title: 'AD–AS analysis',
      tagline: 'Macro equilibrium: price level and real output on one frame.',
      topicCode: '4.3',
      chip: 'Macro',
      beats: [
        'AD = C + I + G + (X − M) — shifts when any component changes.',
        'Short-run AS can shift with costs; long-run AS with capacity.',
        'Equilibrium sets the price level and national output.',
        'Evaluation: spare capacity, elasticities, and policy lags decide the size of the effect.',
      ],
    },
    {
      slug: '4-2-introduction-to-the-circular-flow-of-income',
      title: 'Circular flow of income',
      tagline: 'Injections and withdrawals — why national income moves.',
      topicCode: '4.2',
      chip: 'Macro',
      beats: [
        'Households and firms exchange factors and goods in a closed loop.',
        'Injections: investment, government spending, exports.',
        'Withdrawals: saving, tax, imports.',
        'When injections exceed withdrawals, income rises — and vice versa.',
      ],
    },
    {
      slug: '1-1-scarcity-choice-and-opportunity-cost',
      title: 'Scarcity, choice & opportunity cost',
      tagline: 'The basic economic problem — every paper starts here.',
      topicCode: '1.1',
      chip: 'Foundation',
      beats: [
        'Wants are unlimited; resources are limited — that is scarcity.',
        'Scarcity forces choice: what, how, and for whom to produce.',
        'Opportunity cost is the next-best alternative foregone.',
        'Examiners want the definition and a clear link to a decision.',
      ],
    },
  ],
  '9706': [
    {
      slug: '1-6-2-calculation-and-evaluation-of-ratios',
      title: 'Accounting ratios',
      tagline: 'Calculate, then evaluate — marks live in the judgement.',
      topicCode: '1.6.2',
      chip: 'Signature',
      beats: [
        'Pick the right ratio for the question stem.',
        'Show the formula, then the figures, then the answer.',
        'Evaluate: trend, comparison, and limitations.',
        'Link the ratio back to liquidity, profitability, or efficiency.',
      ],
    },
    {
      slug: '1-4-3-bank-reconciliation-statements',
      title: 'Bank reconciliation',
      tagline: 'Cash book vs bank statement — find every timing difference.',
      topicCode: '1.4.3',
      chip: 'AS',
      beats: [
        'Start from the cash book or statement as the question asks.',
        'Unpresented cheques and outstanding lodgements are timing items.',
        'Errors belong on the side that made them.',
        'The reconciled balances must agree.',
      ],
    },
  ],
  '9231': [
    {
      slug: '1-7-differentiation',
      title: 'Differentiation — further methods',
      tagline: 'Same visual limit idea — now push into further techniques.',
      topicCode: '1.7',
      chip: 'Signature',
      beats: [
        'Recall the secant → tangent picture.',
        'Further maths builds on that limit idea.',
        'Keep diagrams for intuition; algebra for marks.',
      ],
    },
  ],
}

/** Explicit aliases → showcase catalog family (CAIE course content powers the visuals). */
const SHOWCASE_ALIAS: Record<string, string> = {
  'maths-aa': '9709',
  'maths-ai': '9709',
  // IB codes are `ib-math-aa-hl` — singular "math" — so they never matched the
  // "maths-" spellings above and fell through to the generic fallback instead
  // of a theatre labelled with the student's own subject.
  'math-aa': '9709',
  'math-ai': '9709',
  physics: '9702',
  chemistry: '9701',
  biology: '9700',
  'computer-science': '9618',
  economics: '9708',
  '9231': '9231',
  '9709': '9709',
  '9702': '9702',
  '9701': '9701',
  '9700': '9700',
  '9618': '9618',
  '9708': '9708',
  '9706': '9706',
  accounting: '9706',
  // Edexcel UK / common board ids
  '9MA0': '9709',
  '8MA0': '9709',
  '9PH0': '9702',
  '9CH0': '9701',
  '9BI0': '9700',
  '9EC0': '9708',
  'aqa-mathematics': '9709',
  'aqa-physics': '9702',
  'aqa-chemistry': '9701',
  'aqa-biology': '9700',
  'aqa-economics': '9708',
  'aqa-computer-science': '9618',
  'oxaqa-mathematics': '9709',
  'oxaqa-physics': '9702',
  'oxaqa-chemistry': '9701',
  'oxaqa-biology': '9700',
  'ap-calculus-ab': '9709',
  'ap-calculus-bc': '9709',
  'ap-physics-1': '9702',
  'ap-physics-2': '9702',
  'ap-physics-c-mechanics': '9702',
  'ap-chemistry': '9701',
  'ap-biology': '9700',
  'ap-computer-science-a': '9618',
  'ap-microeconomics': '9708',
  'ap-macroeconomics': '9708',
}

/** Map any board subject code/name onto a CAIE showcase catalog when possible. */
function inferCatalogCode(
  subjectCode: string,
  displayName?: string | null
): string | null {
  if (SHOWCASE_BY_SUBJECT[subjectCode]) return subjectCode
  if (SHOWCASE_ALIAS[subjectCode]) return SHOWCASE_ALIAS[subjectCode]

  if (isIbSubjectCode(subjectCode)) {
    const base = subjectCode.replace(/^ib-/, '').replace(/-(hl|sl)$/, '')
    const aliased = SHOWCASE_ALIAS[base]
    // Falls through on a miss rather than returning null. This used to bail
    // here, so any IB subject whose base name was not an explicit alias
    // (ib-psychology-hl → "psychology") got no diagram theatre at all and never
    // reached the name matching below, which would have caught it.
    if (aliased) return aliased
  }

  const c = subjectCode.toLowerCase()
  const n = (displayName || '').toLowerCase()

  // Pearson IAL unit prefixes
  if (/^wma|^wme|^wst|^9ma|^8ma/.test(c)) return '9709'
  if (/^wph|^9ph|^8ph/.test(c)) return '9702'
  if (/^wch|^9ch|^8ch/.test(c)) return '9701'
  if (/^wbi|^9bi|^8bi/.test(c)) return '9700'
  if (/^wec|^9ec|^8ec/.test(c)) return '9708'
  if (/^wcs|computer|comp-sci|computing|4cp/.test(c)) return '9618'

  const hay = `${c} ${n}`
  if (/further\s*math|math|calculus|pure/.test(hay)) return '9709'
  if (/physic/.test(hay)) return '9702'
  if (/chem/.test(hay)) return '9701'
  if (/\bbio/.test(hay)) return '9700'
  if (/econ/.test(hay)) return '9708'
  if (/computer|computing|comp\s*sci/.test(hay)) return '9618'

  return null
}

function resolveShowcaseSubject(
  subjectCode: string,
  displayName?: string | null
): { catalogCode: string; label: string } {
  const catalogCode = inferCatalogCode(subjectCode, displayName) ?? subjectCode
  if (isIbSubjectCode(subjectCode)) {
    return {
      catalogCode,
      label: displayName || subjectCode.replace(/^ib-/, '').replace(/-/g, ' '),
    }
  }
  return {
    catalogCode,
    label: displayName || getSyllabusSubjectName(subjectCode) || subjectCode,
  }
}

function teachingStepsFor(slug: string, fallback?: string[]): string[] {
  // Curated cinema beats win — they carry KaTeX-ready copy for Vault.
  if (fallback && fallback.length >= 2) return fallback.slice(0, 6)
  const spec = getLessonDiagramSpec(slug)
  const fromSpec =
    spec?.steps
      ?.map((s) => s.caption)
      .filter((caption): caption is string => Boolean(caption)) ?? []
  if (fromSpec.length >= 2) return fromSpec.slice(0, 6)
  return [
    'Watch how the diagram changes as you step.',
    'Connect each move to the formula or definition.',
    'Pause on the exam-ready takeaway, then open the lesson.',
  ]
}

function hydrate(
  catalogCode: string,
  seed: ShowcaseSeed
): VaultShowcaseDiagram | null {
  if (!hasLessonLiveDiagram(seed.slug)) return null
  const lesson = getCourseLesson(catalogCode, seed.slug)
  // 9231 may not own the 9709 lesson file — fall back to 9709 href for maths visuals.
  const hrefLesson =
    lesson ||
    (catalogCode === '9231' ? getCourseLesson('9709', seed.slug) : null)
  const hrefCode = hrefLesson ? (lesson ? catalogCode : '9709') : catalogCode
  const href = hrefLesson
    ? `/courses/${hrefCode}/${seed.slug}`
    : `/courses/${catalogCode}`
  return {
    slug: seed.slug,
    title: seed.title,
    tagline: seed.tagline,
    topicCode: seed.topicCode,
    lessonHref: href,
    chip: seed.chip,
    teachingSteps: teachingStepsFor(seed.slug, seed.beats),
  }
}

export function buildVaultDiagramTheatre(
  subjectCode: string | null,
  displayName?: string | null
): VaultDiagramTheatre | null {
  if (!subjectCode) return null
  const { catalogCode, label } = resolveShowcaseSubject(subjectCode, displayName)
  const seeds = SHOWCASE_BY_SUBJECT[catalogCode]
  if (!seeds?.length) return null

  const hydrated = seeds
    .map((s) => hydrate(catalogCode === '9231' ? '9709' : catalogCode, s))
    .filter((d): d is VaultShowcaseDiagram => d !== null)

  if (hydrated.length === 0) return null

  const signature =
    hydrated.find((d) => d.chip === 'Signature') ?? hydrated[0] ?? null
  const gallery = hydrated.filter((d) => d.slug !== signature?.slug).slice(0, 5)

  return {
    subjectCode,
    subjectLabel: label,
    catalogCount: hydrated.length,
    signature,
    gallery,
  }
}

/** One theatre per profile subject that maps to a curated visual family. */
export function buildVaultDiagramTheatres(
  subjects: Array<{ code: string; name: string }>
): VaultDiagramTheatre[] {
  const out: VaultDiagramTheatre[] = []
  const seen = new Set<string>()
  for (const s of subjects) {
    if (seen.has(s.code)) continue
    seen.add(s.code)
    const theatre = buildVaultDiagramTheatre(s.code, s.name)
    if (theatre) out.push(theatre)
  }
  // Prefer the first profile subject's family; only then Maths classics.
  if (out.length === 0 && subjects[0]) {
    const own = buildVaultDiagramTheatre(subjects[0].code, subjects[0].name)
    if (own) {
      out.push(own)
      return out
    }
  }
  if (out.length === 0) {
    const maths = buildVaultDiagramTheatre('9709', 'Mathematics')
    if (maths) out.push(maths)
  }
  return out
}
