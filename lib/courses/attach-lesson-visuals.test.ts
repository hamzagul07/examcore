import { attachCatalogVisuals, alignDiagramSpecToSteps, ensureSimpleExplanationForVisuals } from './attach-lesson-visuals'
import { getLessonDiagramSpec } from './diagram-specs'
import type { GeneratedLesson } from './generator/lesson-schema'

let failed = 0

function check(name: string, ok: boolean) {
  if (!ok) {
    failed++
    console.error(`FAIL ${name}`)
  }
}

const baseIntroOnly = {
  slug: '13-3-gravitational-field-of-a-point-mass',
  topicCode: '13.3',
  title: 'Gravitational field',
  paper: 'P4',
  paperName: 'Paper 4',
  status: 'pilot' as const,
  summary: 'x'.repeat(25),
  durationMin: 20,
  paperNumber: '4',
  paperType: 'structured' as const,
  level: 'A-Level',
  syllabusObjectivesCovered: ['13.3.1'],
  sections: [{ type: 'intro' as const, content: 'Intro text for the lesson here.' }],
  simpleExplanation: {
    title: 'Simple',
    summary: 'Summary',
    steps: ['Step A', 'Step B', 'Step C'],
  },
}

const base = {
  ...baseIntroOnly,
  sections: [
    { type: 'intro' as const, content: 'Intro text for the lesson here.' },
    {
      type: 'resources' as const,
      items: [
        {
          label: 'PhET Simulation: Gravity and Orbits',
          href: 'https://phet.colorado.edu/en/simulations/gravity-and-orbits',
        },
      ],
    },
  ],
}

const attached = attachCatalogVisuals(base as GeneratedLesson)
check('native grav attaches PhET from resources when listed', attached.interactiveEmbed?.provider === 'phet')
check('attaches diagram spec', (attached.diagramSpec?.steps.length ?? 0) === 3)

const withExisting = attachCatalogVisuals({
  ...base,
  interactiveEmbed: {
    provider: 'custom',
    title: 'Custom',
    embedUrl: 'https://example.com/sim',
    attribution: { source: 'Test', license: 'MIT' },
  },
} as GeneratedLesson)
check('does not override custom embed', withExisting.interactiveEmbed?.provider === 'custom')

const spec = getLessonDiagramSpec('13-3-gravitational-field-of-a-point-mass')
if (spec) {
  const aligned = alignDiagramSpecToSteps(spec, 2)
  check('align truncates steps', aligned.steps.length === 2)
}

const noSteps = ensureSimpleExplanationForVisuals({
  ...base,
  simpleExplanation: undefined,
  sections: [
    { type: 'intro' as const, content: 'Intro text for the lesson here.' },
    {
      type: 'keyPoints' as const,
      items: ['Point one about the topic.', 'Point two about the topic.', 'Point three about the topic.'],
    },
  ],
} as GeneratedLesson)
check('synthesises simpleExplanation', (noSteps.simpleExplanation?.steps.length ?? 0) >= 3)

const logicGates = attachCatalogVisuals({
  ...baseIntroOnly,
  slug: '3-2-logic-gates-and-logic-circuits',
  topicCode: '3.2',
  title: 'Logic gates',
  simpleExplanation: {
    title: 'Logic gates',
    summary: 'Summary',
    steps: ['Step 1', 'Step 2', 'Step 3', 'Step 4'],
  },
} as GeneratedLesson)
check('prefers native diagram over placeholder embed', logicGates.interactiveEmbed === undefined)
check('keeps diagram spec for native logic diagram', (logicGates.diagramSpec?.steps.length ?? 0) === 4)

const algorithms = attachCatalogVisuals({
  ...baseIntroOnly,
  slug: '19-1-algorithms',
  topicCode: '19.1',
  title: 'Algorithms',
  simpleExplanation: {
    title: 'Algorithms',
    summary: 'Summary',
    steps: ['Step 1', 'Step 2', 'Step 3', 'Step 4'],
  },
} as GeneratedLesson)
check('native algorithm diagram skips placeholder', algorithms.interactiveEmbed === undefined)

const differentiation = attachCatalogVisuals({
  ...base,
  slug: '1-7-differentiation',
  topicCode: '1.7',
  title: 'Differentiation',
  sections: [
    { type: 'intro' as const, content: 'Intro text for the lesson here.' },
    {
      type: 'resources' as const,
      items: [
        {
          label: 'GeoGebra: Tangent explorer',
          href: 'https://www.geogebra.org/classic?material=abc123',
        },
      ],
    },
  ],
  simpleExplanation: {
    title: 'Differentiation',
    summary: 'Summary',
    steps: ['Step 1', 'Step 2', 'Step 3', 'Step 4'],
  },
} as GeneratedLesson)
check('9709 native diagram keeps geogebra from resources', differentiation.interactiveEmbed?.provider === 'geogebra')
check('9709 keeps diagram spec with params', (differentiation.diagramSpec?.params?.length ?? 0) >= 2)

const bakedPhEt = attachCatalogVisuals({
  ...base,
  slug: '10-1-practical-circuits',
  topicCode: '10.1',
  title: 'Practical circuits',
  interactiveEmbed: {
    provider: 'phet',
    title: 'Circuits',
    embedUrl: 'https://phet.colorado.edu/sims/html/circuit-construction-kit-dc/latest/circuit-construction-kit-dc_en.html',
    attribution: { source: 'PhET', license: 'CC BY 4.0' },
  },
  simpleExplanation: {
    title: 'Circuits',
    summary: 'Summary',
    steps: ['Step 1', 'Step 2', 'Step 3', 'Step 4'],
  },
} as GeneratedLesson)
check('retains baked-in PhET with native diagram', bakedPhEt.interactiveEmbed?.provider === 'phet')

const shm = attachCatalogVisuals({
  ...base,
  slug: '17-1-simple-harmonic-oscillations',
  topicCode: '17.1',
  title: 'SHM',
  sections: [
    { type: 'intro' as const, content: 'Intro text for the lesson here.' },
    {
      type: 'resources' as const,
      items: [
        {
          label: 'PhET Simulation: Mass on a Spring',
          href: 'https://phet.colorado.edu/en/simulations/masses-and-springs',
        },
      ],
    },
  ],
  simpleExplanation: {
    title: 'SHM',
    summary: 'Summary',
    steps: ['Step 1', 'Step 2', 'Step 3', 'Step 4'],
  },
} as GeneratedLesson)
check('9702 SHM keeps PhET from resources with native diagram', shm.interactiveEmbed?.provider === 'phet')

const photoelectric = attachCatalogVisuals({
  ...base,
  slug: '22-2-photoelectric-effect',
  topicCode: '22.2',
  title: 'Photoelectric effect',
  simpleExplanation: {
    title: 'Photoelectric',
    summary: 'Summary',
    steps: ['Step 1', 'Step 2', 'Step 3', 'Step 4'],
  },
} as GeneratedLesson)
check('photoelectric retains PhET sim', photoelectric.interactiveEmbed?.provider === 'phet')

const moleculeShapes = attachCatalogVisuals({
  ...base,
  slug: '3-5-shapes-of-molecules',
  topicCode: '3.5',
  title: 'Shapes of molecules',
  simpleExplanation: {
    title: 'VSEPR',
    summary: 'Summary',
    steps: ['Step 1', 'Step 2', 'Step 3', 'Step 4'],
  },
} as GeneratedLesson)
check('9701 VSEPR retains PhET with native diagram', moleculeShapes.interactiveEmbed?.provider === 'phet')

const idealGas = attachCatalogVisuals({
  ...baseIntroOnly,
  slug: '4-1-the-gaseous-state-ideal-and-real-gases-and-pv-nrt',
  topicCode: '4.1',
  title: 'Ideal gases',
  simpleExplanation: {
    title: 'Gases',
    summary: 'Summary',
    steps: ['Step 1', 'Step 2', 'Step 3', 'Step 4'],
  },
} as GeneratedLesson)
check('9701 ideal gas prefers native over PhET', idealGas.interactiveEmbed === undefined)

const atomicStructure = attachCatalogVisuals({
  ...baseIntroOnly,
  slug: '1-1-particles-in-the-atom-and-atomic-radius',
  topicCode: '1.1',
  title: 'Atomic structure',
  simpleExplanation: {
    title: 'Atoms',
    summary: 'Summary',
    steps: ['Step 1', 'Step 2', 'Step 3', 'Step 4'],
  },
} as GeneratedLesson)
check('9701 atomic structure prefers native over PhET', atomicStructure.interactiveEmbed === undefined)

const stoichiometry = attachCatalogVisuals({
  ...baseIntroOnly,
  slug: '2-2-the-mole-and-the-avogadro-constant',
  topicCode: '2.2',
  title: 'The mole',
  simpleExplanation: {
    title: 'Mole',
    summary: 'Summary',
    steps: ['Step 1', 'Step 2', 'Step 3', 'Step 4'],
  },
} as GeneratedLesson)
check('9701 stoichiometry prefers native over PhET', stoichiometry.interactiveEmbed === undefined)

const electrochemistry = attachCatalogVisuals({
  ...baseIntroOnly,
  slug: '24-1-electrolysis',
  topicCode: '24.1',
  title: 'Electrolysis',
  simpleExplanation: {
    title: 'Electrolysis',
    summary: 'Summary',
    steps: ['Step 1', 'Step 2', 'Step 3', 'Step 4'],
  },
} as GeneratedLesson)
check('9701 electrolysis prefers native over PhET', electrochemistry.interactiveEmbed === undefined)

const spectroscopy = attachCatalogVisuals({
  ...baseIntroOnly,
  slug: '37-4-proton-h-nmr-spectroscopy',
  topicCode: '37.4',
  title: 'Proton NMR',
  simpleExplanation: {
    title: 'NMR',
    summary: 'Summary',
    steps: ['Step 1', 'Step 2', 'Step 3', 'Step 4'],
  },
} as GeneratedLesson)
check('9701 NMR prefers native over PhET', spectroscopy.interactiveEmbed === undefined)

const accounting = attachCatalogVisuals({
  ...baseIntroOnly,
  slug: '1-2-1-the-accounting-system',
  topicCode: '1.2.1',
  title: 'The accounting system',
  simpleExplanation: {
    title: 'Double entry',
    summary: 'Summary',
    steps: ['Debit rules', 'Credit rules', 'Prime entry', 'Ledger'],
  },
} as GeneratedLesson)
check('9706 accounting attaches diagram spec', (accounting.diagramSpec?.steps.length ?? 0) === 4)
check('9706 accounting has no embed', accounting.interactiveEmbed === undefined)

const marketing = attachCatalogVisuals({
  ...baseIntroOnly,
  slug: '3-3-1-the-elements-of-the-marketing-mix-the-4ps',
  topicCode: '3.3.1',
  title: 'Marketing mix',
  simpleExplanation: {
    title: '4Ps',
    summary: 'Summary',
    steps: ['Product', 'Price', 'Promotion', 'Place'],
  },
} as GeneratedLesson)
check('9609 marketing attaches diagram spec', (marketing.diagramSpec?.steps.length ?? 0) === 4)

const scarcity = attachCatalogVisuals({
  ...baseIntroOnly,
  slug: '1-1-scarcity-choice-and-opportunity-cost',
  topicCode: '1.1',
  title: 'Scarcity',
  simpleExplanation: {
    title: 'Scarcity',
    summary: 'Summary',
    steps: ['Scarcity', 'Opportunity cost', 'Economic questions', 'PPC link'],
  },
} as GeneratedLesson)
check('9708 scarcity attaches GeoGebra embed', scarcity.interactiveEmbed?.provider === 'geogebra')
check('9708 scarcity attaches embed spec', (scarcity.diagramSpec?.steps.length ?? 0) === 4)

const breakeven9706 = attachCatalogVisuals({
  ...baseIntroOnly,
  slug: '2-2-4-cost-volume-profit-analysis',
  topicCode: '2.2.4',
  title: 'CVP analysis',
  simpleExplanation: {
    title: 'CVP',
    summary: 'Summary',
    steps: ['Contribution', 'BEP', 'MOS', 'Target profit'],
  },
} as GeneratedLesson)
check('9706 CVP attaches break-even diagram spec', (breakeven9706.diagramSpec?.steps.length ?? 0) === 4)
check('9706 CVP attaches GeoGebra embed', breakeven9706.interactiveEmbed?.provider === 'geogebra')

const breakeven9609 = attachCatalogVisuals({
  ...baseIntroOnly,
  slug: '5-4-4-break-even-analysis',
  topicCode: '5.4.4',
  title: 'Break-even analysis',
  simpleExplanation: {
    title: 'Break-even',
    summary: 'Summary',
    steps: ['Formula', 'Chart', 'MOS', 'Assumptions'],
  },
} as GeneratedLesson)
check('9609 break-even attaches GeoGebra embed', breakeven9609.interactiveEmbed?.provider === 'geogebra')
check('9609 break-even attaches embed spec', (breakeven9609.diagramSpec?.steps.length ?? 0) === 4)

const paper5 = attachCatalogVisuals({
  ...baseIntroOnly,
  slug: 'paper-5-planning-and-analysis',
  topicCode: 'P5',
  title: 'Paper 5',
  simpleExplanation: {
    title: 'Paper 5',
    summary: 'Summary',
    steps: ['Error bars', 'LOBF', 'WAL', 'Gradient'],
  },
} as GeneratedLesson)
check('9702 paper 5 attaches WAL diagram spec', paper5.diagramSpec?.steps[0]?.focus.includes('points') === true)
check('9702 paper 5 gradient step', paper5.diagramSpec?.steps[3]?.focus.includes('gradient') === true)

const stakeholders = attachCatalogVisuals({
  ...baseIntroOnly,
  slug: '1-5-1-business-stakeholders',
  topicCode: '1.5.1',
  title: 'Stakeholders',
  simpleExplanation: {
    title: 'Stakeholders',
    summary: 'Summary',
    steps: ['Define', 'Map', 'Prioritise', 'Engage'],
  },
} as GeneratedLesson)
check('9609 stakeholders attaches diagram spec', (stakeholders.diagramSpec?.steps.length ?? 0) === 4)

const psychDiathesis = attachCatalogVisuals({
  ...baseIntroOnly,
  slug: '1-1-2-explanations-of-schizophrenia',
  topicCode: '1.1.2',
  title: 'Explanations of schizophrenia',
  simpleExplanation: {
    title: 'Explanations',
    summary: 'Summary',
    steps: ['Diathesis', 'Stress', 'Onset', 'Compare'],
  },
} as GeneratedLesson)
check('9990 explanation attaches diagram spec', (psychDiathesis.diagramSpec?.steps.length ?? 0) === 4)

const lawPrecedent = attachCatalogVisuals({
  ...baseIntroOnly,
  slug: '1-1-5-judicial-precedent',
  topicCode: '1.1.5',
  title: 'Judicial precedent',
  simpleExplanation: {
    title: 'Precedent',
    summary: 'Summary',
    steps: ['Hierarchy', 'Ratio', 'Distinguish', 'Overrule'],
  },
} as GeneratedLesson)
check('9084 precedent attaches diagram spec', (lawPrecedent.diagramSpec?.steps.length ?? 0) === 4)

const investNpv = attachCatalogVisuals({
  ...baseIntroOnly,
  slug: '10-3-3-discounted-cash-flow-method-net-present-value-npv',
  topicCode: '10.3.3',
  title: 'NPV',
  simpleExplanation: {
    title: 'NPV',
    summary: 'Summary',
    steps: ['Discount', 'PV', 'Sum', 'Decision'],
  },
} as GeneratedLesson)
check('9609 NPV attaches GeoGebra embed', investNpv.interactiveEmbed?.provider === 'geogebra')
check('9609 NPV attaches embed spec', (investNpv.diagramSpec?.steps.length ?? 0) === 4)

if (failed > 0) process.exit(1)
console.log('attach-lesson-visuals.test.ts: all checks passed')
