import type { CourseLesson } from './types'
import {
  embedFromLessonResources,
  embedMatchesResource,
  filterResourcesForPromotedEmbed,
  geogebraEmbedFromUrl,
  parseGeogebraMaterialId,
  parsePhetSimId,
  phetEmbedFromUrl,
} from './embed-from-resources'
import { resolveLessonInteractiveEmbed } from './interactive-embeds'

let failed = 0

function check(name: string, ok: boolean) {
  if (!ok) {
    failed++
    console.error(`FAIL ${name}`)
  }
}

check('parse phet page url', parsePhetSimId('https://phet.colorado.edu/en/simulations/masses-and-springs') === 'masses-and-springs')
check('alias photoelectric-effect', parsePhetSimId('https://phet.colorado.edu/en/simulations/photoelectric-effect') === 'photoelectric')
check('parse geogebra material', parseGeogebraMaterialId('https://www.geogebra.org/classic?material=VGWtkPU5') === 'VGWtkPU5')

const phetEmbed = phetEmbedFromUrl('PhET Simulation: Mass on a Spring', 'https://phet.colorado.edu/en/simulations/masses-and-springs')
check('phet embed provider', phetEmbed?.provider === 'phet')
check('phet embed url', phetEmbed?.embedUrl.includes('masses-and-springs') === true)

const lesson = {
  slug: '17-1-simple-harmonic-oscillations',
  topicCode: '17.1',
  title: 'Simple harmonic oscillations',
  paper: 'P4',
  paperName: 'Paper 4',
  status: 'published',
  summary: 'x'.repeat(25),
  durationMin: 10,
  sections: [
    { type: 'intro', content: 'Hello world lesson intro.' },
    {
      type: 'resources',
      items: [
        {
          label: 'PhET Simulation: Mass on a Spring',
          href: 'https://phet.colorado.edu/en/simulations/masses-and-springs',
        },
      ],
    },
  ],
} as CourseLesson

check('embed from resources', embedFromLessonResources(lesson)?.title === 'Mass on a Spring')
check('resolve with native diagram + phet resources', resolveLessonInteractiveEmbed(lesson)?.provider === 'phet')

const filtered = filterResourcesForPromotedEmbed(lesson.sections[1].type === 'resources' ? lesson.sections[1].items : [], resolveLessonInteractiveEmbed(lesson))
check('filters promoted phet link', (filtered?.length ?? 0) === 0)

const geogebraLesson = {
  ...lesson,
  slug: '1-1-quadratics',
  sections: [
    { type: 'intro', content: 'Hello world lesson intro.' },
    {
      type: 'resources',
      items: [
        {
          label: 'GeoGebra: Quadratic explorer',
          href: 'https://www.geogebra.org/m/abc123',
        },
      ],
    },
  ],
} as CourseLesson
check('geogebra from resources', embedFromLessonResources(geogebraLesson)?.provider === 'geogebra')

check(
  'embed matches resource',
  embedMatchesResource(
    geogebraEmbedFromUrl('GeoGebra', 'https://www.geogebra.org/m/abc123')!,
    'https://www.geogebra.org/classic?material=abc123'
  )
)

if (failed > 0) process.exit(1)
console.log('embed-from-resources.test.ts: all checks passed')
