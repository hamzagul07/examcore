import assert from 'node:assert/strict'
import {
  INTERACTIVE_EMBED_CATALOG,
  isCheerpjEmbedUrl,
  lessonHasInteractiveEmbed,
  resolveLessonInteractiveEmbed,
} from './interactive-embeds'
import type { CourseLesson } from './types'

let failed = 0

function check(name: string, ok: boolean) {
  if (!ok) {
    failed++
    console.error(`FAIL ${name}`)
  }
}

const pilotSlugs = [
  '13-3-gravitational-field-of-a-point-mass',
  '8-4-the-diffraction-grating',
  '10-1-practical-circuits',
  '15-3-kinetic-theory-of-gases',
  '1-7-differentiation',
]

for (const slug of pilotSlugs) {
  check(`catalog has ${slug}`, slug in INTERACTIVE_EMBED_CATALOG)
  const entry = INTERACTIVE_EMBED_CATALOG[slug]
  check(`${slug} has embedUrl`, !!entry?.embedUrl?.startsWith('https://'))
}

const lesson = {
  slug: '10-1-practical-circuits',
  topicCode: '10.1',
  title: 'Test',
  paper: 'P2',
  paperName: 'Paper 2',
  status: 'published',
  summary: 'x'.repeat(25),
  durationMin: 10,
  sections: [{ type: 'intro', content: 'Hello world lesson intro.' }],
} as CourseLesson

check('resolve catalog', resolveLessonInteractiveEmbed(lesson)?.provider === 'phet')
check('has embed', lessonHasInteractiveEmbed(lesson))

check('cheerpj detect', isCheerpjEmbedUrl('https://phet.colorado.edu/sims/cheerpj/photoelectric/latest/photoelectric.html'))
check('html5 not cheerpj', !isCheerpjEmbedUrl('https://phet.colorado.edu/sims/html/gas-properties/latest/gas-properties_en.html'))

const override = {
  ...lesson,
  interactiveEmbed: {
    provider: 'custom' as const,
    title: 'Custom',
    embedUrl: 'https://example.com/sim',
    attribution: { source: 'Test', license: 'MIT' },
  },
}
check('lesson override wins', resolveLessonInteractiveEmbed(override)?.provider === 'custom')

if (failed > 0) process.exit(1)
console.log('interactive-embeds.test.ts: all checks passed')
