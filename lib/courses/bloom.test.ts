import { BLOOM_LABEL, bloomForSection, bloomLabelForSection } from './bloom'

let failed = 0
function check(label: string, ok: boolean) {
  if (!ok) {
    console.error('FAIL:', label)
    failed += 1
  }
}

check('quiz is apply', bloomForSection('quiz') === 'apply')
check('cards is remember', bloomForSection('cards') === 'remember')
check('teachback is understand', bloomForSection('teachback') === 'understand')
check('practice is analyse', bloomForSection('practice') === 'analyse')
check('unknown null', bloomForSection('notes') === null)
check('labels exist', BLOOM_LABEL.apply === 'Apply')
check('label helper', bloomLabelForSection('quiz') === 'Apply')
check('label helper null', bloomLabelForSection('notes') === undefined)

if (failed > 0) process.exit(1)
console.log('bloom.test.ts: all checks passed')
