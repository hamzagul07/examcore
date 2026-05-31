import { normalizeMarkdownTables } from '../lib/rich-text/normalize-marking-text'
import { normalizeQuestionText } from '../lib/rich-text/normalize-question-text'

const PRODUCTION_TABLE = `Complete Table 1.1 using relevant information from the Periodic Table.

Table 1.1

nucleon number | proton number | number of electrons
Mg$^{2+}$ | 24 | | 
Al$^{3+}$ | 27 | |`

function assert(name: string, got: string, expect: string) {
  if (got === expect) {
    console.log(`PASS ${name}`)
    return true
  }
  console.log(`FAIL ${name}`)
  console.log('--- expected ---')
  console.log(expect)
  console.log('--- got ---')
  console.log(got)
  return false
}

let pass = 0

if (
  assert(
    'Case 1 — missing separator',
    normalizeMarkdownTables('| col1 | col2 |\n| row1 | row2 |'),
    '| col1 | col2 |\n| --- | --- |\n| row1 | row2 |'
  )
) {
  pass++
}

if (
  assert(
    'Case 2 — already correct',
    normalizeMarkdownTables('| col1 | col2 |\n| --- | --- |\n| row1 | row2 |'),
    '| col1 | col2 |\n| --- | --- |\n| row1 | row2 |'
  )
) {
  pass++
}

if (
  assert(
    'Case 3 — incidental pipes',
    normalizeMarkdownTables('Use the formula | F = ma | to find force.'),
    'Use the formula | F = ma | to find force.'
  )
) {
  pass++
}

const prodNorm = normalizeQuestionText(PRODUCTION_TABLE)
const hasSeparator = /\| --- \|/.test(prodNorm)
const hasGfmHeader = prodNorm.includes('| nucleon number | proton number | number of electrons |')
console.log(
  hasSeparator && hasGfmHeader
    ? 'PASS Case 4 — production table normalized'
    : 'FAIL Case 4 — production table normalized'
)
if (hasSeparator && hasGfmHeader) pass++
else {
  console.log('--- normalized production excerpt ---')
  console.log(prodNorm.split('\n').slice(3).join('\n'))
}

console.log(`\n${pass}/4 passed`)
process.exit(pass === 4 ? 0 : 1)
