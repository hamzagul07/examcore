import assert from 'node:assert/strict'
import { parsePaper5SectionHeader, isPaper5SectionHeader } from './paper5-section'

assert.equal(isPaper5SectionHeader('1(Defining the problem)'), true)
assert.equal(isPaper5SectionHeader('2(a)'), false)

const a = parsePaper5SectionHeader('1(Defining the problem)')
assert.ok(a)
assert.equal(a.baseQuestionNumber, '1')
assert.equal(a.canonicalLetter, 'a')
assert.equal(a.canonicalQuestionNumber, '1(a)')

const b = parsePaper5SectionHeader('1(Methods of data collection)')
assert.equal(b?.canonicalLetter, 'b')

const c = parsePaper5SectionHeader('1(Method of Analysis)')
assert.equal(c?.canonicalLetter, 'c')

console.log('paper5-section.test.ts: ok')
