import { buildVisualAuthoringGuide, slugHasVisualCatalogEntry } from './visual-catalog'

let failed = 0

function check(name: string, ok: boolean) {
  if (!ok) {
    failed++
    console.error(`FAIL ${name}`)
  }
}

check('13.3 has catalog', slugHasVisualCatalogEntry('13-3-gravitational-field-of-a-point-mass'))
check('3.7 vectors has catalog', slugHasVisualCatalogEntry('3-7-vectors'))
check('9701 atomic structure has catalog', slugHasVisualCatalogEntry('1-1-particles-in-the-atom-and-atomic-radius'))
check('9700 transport has catalog', slugHasVisualCatalogEntry('4-2-movement-into-and-out-of-cells'))
check('9709 quadratics has catalog', slugHasVisualCatalogEntry('1-1-quadratics'))
check('unknown slug false', !slugHasVisualCatalogEntry('99-9-unknown-topic'))

const guide = buildVisualAuthoringGuide('10-1-practical-circuits')
check('guide mentions steps', guide.includes('4 steps'))
check('guide mentions embed', guide.includes('PhET'))

if (failed > 0) process.exit(1)
console.log('visual-catalog.test.ts: all checks passed')
