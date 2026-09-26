import assert from 'node:assert/strict'
import {
  compareQuestionNumbers,
  detectQuestionFromPageText,
  questionLabelMatch,
  questionMainNumber,
  romanToInt,
  sortQuestionNumbers,
} from './page-detection'

// --- labels need a marker at the start of a line -----------------------------
//
// "2 (x+1) = 6" used to label a page "Question 2". Every rejection below is a
// line of working that would otherwise send an answer to the wrong marker.

for (const [text, expected, why] of [
  ['Question 3\nsome working', '3', 'the header form'],
  ['  question 4 (a)(ii)\n…', '4(a)(ii)', 'header with parts'],
  ['Q3\nx = 2', '3', 'Q prefix'],
  ['Q. 7\n', '7', 'Q with a stop'],
  ['3.\nx = 2', '3', 'number with a stop'],
  ['3) x = 2', '3', 'number with a bracket'],
  ['5: working', '5', 'number with a colon'],
  ['3(a)\nx = 2', '3(a)', 'a bare sub-part is a marker'],
  ['3 (b)(ii) x = 2', '3(b)(ii)', 'sub-part with a roman part'],
  ['some notes\nQuestion 6\nmore', '6', 'label not on the first line'],
  ['2 (x+1) = 6', null, 'maths: a number beside a bracket is not a label'],
  ['2(x+1)(x-3)', null, 'maths: factorised expression'],
  ['12.5 = x', null, 'a decimal is not "12."'],
  ['2024 May/June', null, 'a year is not a question number'],
  ['the answer is 3 (see above)', null, 'a number mid-line is not a label'],
  ['area = 3(a)(b)', null, 'two letter brackets is algebra, not a part'],
  ['', null, 'empty'],
] as const) {
  assert.equal(detectQuestionFromPageText(text), expected, why)
}

// --- roman parts order by value ----------------------------------------------

assert.equal(romanToInt('iv'), 4)
assert.equal(romanToInt('ix'), 9)
assert.equal(romanToInt('xii'), 12)

assert.deepEqual(
  sortQuestionNumbers(['3(a)(ix)', '3(a)(ii)', '3(a)(x)', '3(a)(iv)', '3(a)(i)']),
  ['3(a)(i)', '3(a)(ii)', '3(a)(iv)', '3(a)(ix)', '3(a)(x)'],
  'roman parts sort numerically, not lexically'
)
assert.deepEqual(
  sortQuestionNumbers(['2(ii)', '2(i)', '2(iii)', '1', '10', '2']),
  ['1', '2', '2(i)', '2(ii)', '2(iii)', '10'],
  'roman directly under a question, and mains sort numerically'
)
assert.deepEqual(
  sortQuestionNumbers(['3(i)', '3(c)', '3(a)', '3(j)']),
  ['3(a)', '3(c)', '3(i)', '3(j)'],
  'single letters stay letters even when they are valid numerals'
)
assert.deepEqual(
  sortQuestionNumbers(['Q2', 'Q1(b)', 'q1(a)']),
  ['q1(a)', 'Q1(b)', 'Q2'],
  'Q prefixes are ignored for ordering'
)
assert.equal(compareQuestionNumbers('3 (a)', '3(a)'), 0, 'whitespace-insensitive')

// --- matching a segment to a page label -------------------------------------

assert.equal(questionMainNumber('3(a)(ii)'), '3')
assert.equal(questionMainNumber('Q12'), '12')
assert.equal(questionMainNumber('(a)'), '')

assert.equal(questionLabelMatch('3(a)', '3 (a)'), 'exact')
assert.equal(questionLabelMatch('3(a)', '3'), 'parent', 'a page labelled "3" holds part (a)')
assert.equal(questionLabelMatch('3', '3(b)'), 'part', 'a page labelled "3(b)" belongs to Q3')
assert.equal(questionLabelMatch('3(a)', '3(b)'), null, 'sibling parts are different answers')
assert.equal(questionLabelMatch('3', '30'), null)
assert.equal(questionLabelMatch('3', ''), null)
assert.equal(questionLabelMatch('Q3', 'question 3'), 'exact')

console.log('page-detection: all assertions passed')
