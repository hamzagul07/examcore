import type { CourseLesson } from './types'
import { resolveLessonHeroVisual } from './lesson-hero-visual'

let failed = 0

function check(name: string, ok: boolean) {
  if (!ok) {
    failed++
    console.error(`FAIL ${name}`)
  }
}

const base = {
  slug: '10-1-practical-circuits',
  topicCode: '10.1',
  title: 'Practical circuits',
  paper: 'P4',
  paperName: 'Paper 4',
  status: 'premium',
  summary: 'x'.repeat(25),
  durationMin: 20,
  sections: [{ type: 'intro' as const, content: 'Intro text for the lesson here.' }],
} as CourseLesson

check(
  'native-primary shows diagram badge',
  resolveLessonHeroVisual(base).kind === 'native-diagram'
)

const photoelectric = { ...base, slug: '22-2-photoelectric-effect', topicCode: '22.2' } as CourseLesson
check(
  'gold-standard PhET shows embed badge',
  resolveLessonHeroVisual(photoelectric).kind === 'embed'
)

const generic = { ...base, slug: 'no-visual-topic-xyz' } as CourseLesson
check('unknown slug falls back to template', resolveLessonHeroVisual(generic).kind === 'template')

if (failed > 0) process.exit(1)
console.log('lesson-hero-visual.test.ts: all checks passed')
