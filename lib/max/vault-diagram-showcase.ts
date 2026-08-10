/**
 * Curated Max Vault diagram theatre — signature showpiece + syllabus gallery.
 * Hand-picked for "wow" factor (motion that textbooks can't do), not every slug.
 */
import { hasLessonLiveDiagram } from '@/lib/courses/lesson-diagrams'
import { getCourseLesson } from '@/lib/courses'
import { isIbSubjectCode } from '@/lib/ib/marking-config'

export type VaultShowcaseDiagram = {
  slug: string
  title: string
  tagline: string
  topicCode: string
  lessonHref: string
  /** Short chip: "Signature" | "Pure" | "Mechanics" etc. */
  chip: string
}

export type VaultDiagramTheatre = {
  subjectCode: string
  subjectLabel: string
  /** Count of live diagrams we advertise for this subject family. */
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
}

/** Best-of catalog — motion-led diagrams students remember. */
const SHOWCASE_BY_SUBJECT: Record<string, ShowcaseSeed[]> = {
  '9709': [
    {
      slug: '1-7-differentiation',
      title: 'Differentiation — secant becomes tangent',
      tagline: 'Watch the chord collapse into the gradient. The derivative is a limit you can see.',
      topicCode: '1.7',
      chip: 'Signature',
    },
    {
      slug: '1-1-quadratics',
      title: 'Quadratics — completing the square',
      tagline: 'The parabola morphs as you complete the square. Vertex form, live.',
      topicCode: '1.1',
      chip: 'Pure',
    },
    {
      slug: '1-8-integration',
      title: 'Integration — area under the curve',
      tagline: 'Area accumulates as the fill sweeps. Definite integrals stop being abstract.',
      topicCode: '1.8',
      chip: 'Pure',
    },
    {
      slug: '1-5-trigonometry',
      title: 'Trigonometry — unit circle to wave',
      tagline: 'The circle unrolls into sin and cos. Exact values stick because they move.',
      topicCode: '1.5',
      chip: 'Pure',
    },
    {
      slug: '1-6-series',
      title: 'Series — binomial coefficients',
      tagline: 'Pascal rows fall into place. Binomial expansion becomes pattern, not memory.',
      topicCode: '1.6',
      chip: 'Pure',
    },
    {
      slug: '5-5-the-normal-distribution',
      title: 'Normal distribution — the bell',
      tagline: 'Mean and SD reshape the curve while probability regions light up.',
      topicCode: '5.5',
      chip: 'Stats',
    },
  ],
  '9702': [
    {
      slug: '14-3-specific-heat-capacity-and-specific-latent-heat',
      title: 'Heating curve — phase change live',
      tagline: 'Temperature flatlines while energy still pours in. Latent heat, finally visual.',
      topicCode: '14.3',
      chip: 'Signature',
    },
    {
      slug: '8-1-stationary-waves',
      title: 'Stationary waves — nodes and antinodes',
      tagline: 'Two waves lock into a standing pattern. Nodes freeze; antinodes breathe.',
      topicCode: '8.1',
      chip: 'Waves',
    },
    {
      slug: '17-1-simple-harmonic-oscillations',
      title: 'SHM — restoring force to sine wave',
      tagline: 'Displacement, velocity, acceleration dance out of phase on one stage.',
      topicCode: '17.1',
      chip: 'Oscillations',
    },
    {
      slug: '10-3-potential-dividers',
      title: 'Potential divider — voltage split',
      tagline: 'Slide the ratio and watch the output track. Circuits stop being black boxes.',
      topicCode: '10.3',
      chip: 'Electricity',
    },
    {
      slug: '2-1-equations-of-motion',
      title: 'Kinematics — suvat on the graph',
      tagline: 'Gradient is velocity; area is displacement. The equations write themselves.',
      topicCode: '2.1',
      chip: 'Mechanics',
    },
    {
      slug: '20-5-electromagnetic-induction',
      title: 'Electromagnetic induction',
      tagline: 'Flux change drives emf. Faraday stops being a formula you recite.',
      topicCode: '20.5',
      chip: 'Fields',
    },
  ],
  '9701': [
    {
      slug: '1-4-ionisation-energy',
      title: 'Ionisation energy — shell jumps',
      tagline: 'Successive ionisations spike when you crack a new shell. Trends that stick.',
      topicCode: '1.4',
      chip: 'Signature',
    },
    {
      slug: '1-3-electrons-energy-levels-and-atomic-orbitals',
      title: 'Atomic orbitals — energy levels',
      tagline: 'Electrons occupy levels you can see. Configuration becomes geometry.',
      topicCode: '1.3',
      chip: 'Atomic',
    },
    {
      slug: '1-1-particles-in-the-atom-and-atomic-radius',
      title: 'Atomic structure — particles & radius',
      tagline: 'Protons, neutrons, electrons and size trends in one clear stage.',
      topicCode: '1.1',
      chip: 'Atomic',
    },
  ],
  '9700': [
    {
      slug: '1-2-cells-as-the-basic-units-of-living-organisms',
      title: 'Cell structure — the living unit',
      tagline: 'Organelles in place, labelled for the exam. Biology that looks like biology.',
      topicCode: '1.2',
      chip: 'Signature',
    },
    {
      slug: '11-1-the-immune-system',
      title: 'Immune system — defence cascade',
      tagline: 'Pathogen, antibody, response — the storyboard examiners expect.',
      topicCode: '11.1',
      chip: 'Physiology',
    },
    {
      slug: '12-2-respiration',
      title: 'Respiration — energy pathway',
      tagline: 'Glucose to ATP without the wall of text. Follow the stages.',
      topicCode: '12.2',
      chip: 'Biochem',
    },
  ],
  '9618': [
    {
      slug: '3-2-logic-gates-and-logic-circuits',
      title: 'Logic gates — truth to circuit',
      tagline: 'Flip inputs and watch outputs update. Boolean stops being abstract.',
      topicCode: '3.2',
      chip: 'Signature',
    },
    {
      slug: '1-1-data-representation',
      title: 'Data representation — bits & encoding',
      tagline: 'Binary, hex, ASCII — the encodings that sit under every paper.',
      topicCode: '1.1',
      chip: 'Theory',
    },
    {
      slug: '10-1-data-types-and-records',
      title: 'Data types & records',
      tagline: 'Structures you can point at. Paper 2 programming finally makes sense.',
      topicCode: '10.1',
      chip: 'Programming',
    },
  ],
  '9708': [
    {
      slug: '2-4-the-interaction-of-demand-and-supply',
      title: 'Demand & supply — market equilibrium',
      tagline: 'Curves shift; equilibrium moves. The classic Econ diagram, live.',
      topicCode: '2.4',
      chip: 'Signature',
    },
  ],
}

/** IB profile codes → Cambridge showcase family (shared visuals). */
const IB_SHOWCASE_ALIAS: Record<string, string> = {
  'maths-aa': '9709',
  'maths-ai': '9709',
  physics: '9702',
  chemistry: '9701',
  biology: '9700',
  'computer-science': '9618',
  economics: '9708',
}

function resolveShowcaseSubject(subjectCode: string): {
  catalogCode: string
  label: string
} {
  if (!isIbSubjectCode(subjectCode)) {
    return { catalogCode: subjectCode, label: subjectCode }
  }
  const base = subjectCode.replace(/^ib-/, '').replace(/-(hl|sl)$/, '')
  const catalogCode = IB_SHOWCASE_ALIAS[base] ?? subjectCode
  return { catalogCode, label: subjectCode.replace(/^ib-/, '') }
}

function hydrate(
  catalogCode: string,
  seed: ShowcaseSeed
): VaultShowcaseDiagram | null {
  if (!hasLessonLiveDiagram(seed.slug)) return null
  // Prefer the Cambridge lesson that owns the diagram (always exists for these seeds).
  const lesson = getCourseLesson(catalogCode, seed.slug)
  const href = lesson
    ? `/courses/${catalogCode}/${seed.slug}`
    : `/courses/${catalogCode}`
  return {
    slug: seed.slug,
    title: seed.title,
    tagline: seed.tagline,
    topicCode: seed.topicCode,
    lessonHref: href,
    chip: seed.chip,
  }
}

export function buildVaultDiagramTheatre(
  subjectCode: string | null
): VaultDiagramTheatre | null {
  if (!subjectCode) return null
  const { catalogCode, label } = resolveShowcaseSubject(subjectCode)
  const seeds = SHOWCASE_BY_SUBJECT[catalogCode]
  if (!seeds?.length) return null

  const hydrated = seeds
    .map((s) => hydrate(catalogCode, s))
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
