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

const base = {
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

const attached = attachCatalogVisuals(base as GeneratedLesson)
check('attaches interactive embed', attached.interactiveEmbed?.provider === 'phet')
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
  ...base,
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

if (failed > 0) process.exit(1)
console.log('attach-lesson-visuals.test.ts: all checks passed')
