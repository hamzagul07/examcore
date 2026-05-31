/**
 * Verify syllabus topic lookup for Chemistry vs Math (no 9709 bleed).
 * Run: npx tsx scripts/verify-syllabus-badge-lookup.mjs
 */

import { getSyllabusTopicByCode as get9709 } from '../lib/syllabus.ts'
import { getSyllabusTopicByCode } from '../lib/syllabi/index.ts'

const chem11 = getSyllabusTopicByCode('9701', '1.1')
const chem91 = getSyllabusTopicByCode('9701', '9.1')
const math11 = get9709('1.1')
const math16 = get9709('1.6')

console.log('Chemistry 9701 / 1.1:', chem11?.name)
console.log('Chemistry 9701 / 9.1:', chem91?.name)
console.log('Math 9709 / 1.1 (should NOT be used for chem):', math11?.name)
console.log('Math 9709 / 1.6:', math16?.name)

const ok =
  chem11?.name !== 'Quadratics' &&
  chem11?.name?.includes('atom') &&
  chem91?.name?.includes('Period') &&
  math11?.name === 'Quadratics'

console.log(ok ? '\nPASS' : '\nFAIL')
process.exit(ok ? 0 : 1)
