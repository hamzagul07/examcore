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

const goldStandardSlugs = ['22-2-photoelectric-effect', '3-5-shapes-of-molecules']
const nativePrimarySlugs = ['10-1-practical-circuits', '1-7-differentiation', '1-1-quadratics']

for (const slug of goldStandardSlugs) {
  check(`catalog retains gold-standard ${slug}`, slug in INTERACTIVE_EMBED_CATALOG)
  const entry = INTERACTIVE_EMBED_CATALOG[slug]
  check(`${slug} has embedUrl`, !!entry?.embedUrl?.startsWith('https://'))
}

for (const slug of nativePrimarySlugs) {
  check(`catalog omits native-primary ${slug}`, !(slug in INTERACTIVE_EMBED_CATALOG))
}

const lesson = {
  slug: '22-2-photoelectric-effect',
  topicCode: '22.2',
  title: 'Photoelectric effect',
  paper: 'P5',
  paperName: 'Paper 5',
  status: 'published',
  summary: 'x'.repeat(25),
  durationMin: 10,
  sections: [{ type: 'intro', content: 'Hello world lesson intro.' }],
} as CourseLesson

check('resolve catalog retains gold-standard PhET', resolveLessonInteractiveEmbed(lesson)?.provider === 'phet')
check('has embed', lessonHasInteractiveEmbed(lesson))

const nativePrimary = {
  ...lesson,
  slug: '10-1-practical-circuits',
  topicCode: '10.1',
  title: 'Practical circuits',
} as CourseLesson
check('native diagram suppresses PhET in resolve', resolveLessonInteractiveEmbed(nativePrimary) === null)

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
