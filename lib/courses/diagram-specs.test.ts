import {
  getLessonDiagramSpec,
  layerOpacity,
  resolveDiagramSpec,
  stepStateFor,
} from './diagram-specs'

let failed = 0

function check(name: string, ok: boolean) {
  if (!ok) {
    failed++
    console.error(`FAIL ${name}`)
  }
}

const slug = '13-3-gravitational-field-of-a-point-mass'
const spec = getLessonDiagramSpec(slug)

check('pilot spec exists', spec !== null)
check('has params', (spec?.params?.length ?? 0) >= 2)
check('has steps', (spec?.steps.length ?? 0) >= 4)

const step0 = stepStateFor(spec, 0)
check('step 0 focus mass', step0?.focus.includes('mass') === true)
check('embed hint on step 0', !!step0?.embedHint)

check('layer focused', layerOpacity(spec, 0, 'mass') === 1)
check('layer dimmed', layerOpacity(spec, 0, 'force') < 1)

const override = resolveDiagramSpec(slug, {
  steps: [{ focus: ['custom'], caption: 'Override' }],
})
check('override wins', override?.steps[0]?.caption === 'Override')

if (failed > 0) process.exit(1)
console.log('diagram-specs.test.ts: all checks passed')
