import assert from 'node:assert/strict'
import {
  mcqFitsOneRow,
  paperFooterCode,
  parseQuestionNumber,
  sessionCoverLabel,
  splitMcqOptions,
  splitQuestionParts,
  stripTrailingMarks,
  sumPartMarks,
} from './question-parts'

// --- parseQuestionNumber ---
assert.deepEqual(parseQuestionNumber('3(b)(i)'), { number: '3', parts: ['b', 'i'], printed: '3(b)(i)' })
assert.deepEqual(parseQuestionNumber('3 (b)'), { number: '3', parts: ['b'], printed: '3(b)' })
assert.deepEqual(parseQuestionNumber('Q4'), { number: '4', parts: [], printed: '4' })
assert.deepEqual(parseQuestionNumber('4a'), { number: '4', parts: ['a'], printed: '4(a)' })
assert.deepEqual(parseQuestionNumber('4bii'), { number: '4', parts: ['b', 'ii'], printed: '4(b)(ii)' })
assert.deepEqual(parseQuestionNumber('12'), { number: '12', parts: [], printed: '12' })
assert.deepEqual(parseQuestionNumber(''), { number: null, parts: [], printed: '' })
assert.deepEqual(parseQuestionNumber('Section A'), { number: null, parts: [], printed: 'Section A' })

// --- stripTrailingMarks ---
assert.deepEqual(stripTrailingMarks('Find the speed. [3]'), { text: 'Find the speed.', marks: 3 })
assert.deepEqual(stripTrailingMarks('Find the speed. [3 marks]'), { text: 'Find the speed.', marks: 3 })
assert.deepEqual(stripTrailingMarks('Find the speed. (2 marks)'), { text: 'Find the speed.', marks: 2 })
assert.deepEqual(stripTrailingMarks('Find the speed. [Total: 10]'), { text: 'Find the speed.', marks: 10 })
assert.deepEqual(stripTrailingMarks('x in [0, 2]'), { text: 'x in [0, 2]' }, 'interval is not a mark')
assert.deepEqual(stripTrailingMarks('see ref [1]'), { text: 'see ref', marks: 1 }, 'a single bracket at the end reads as marks')
assert.deepEqual(stripTrailingMarks('  '), { text: '' })

// --- splitQuestionParts ---
assert.deepEqual(splitQuestionParts('A ball is dropped from 1.8 m. Calculate its speed. [4]'), [
  { text: 'A ball is dropped from 1.8 m. Calculate its speed.', marks: 4 },
])
assert.deepEqual(
  splitQuestionParts('The curve C has equation $y = x^3$.\n(a) Find $\\frac{dy}{dx}$. [2]\n(b) Hence find the stationary points. [3]'),
  [
    { text: 'The curve C has equation $y = x^3$.' },
    { label: '(a)', text: 'Find $\\frac{dy}{dx}$.', marks: 2 },
    { label: '(b)', text: 'Hence find the stationary points.', marks: 3 },
  ]
)
assert.deepEqual(
  splitQuestionParts('(a) State what is meant by e.m.f.\n\n(b) (i) Define internal resistance. [1]\n(ii) Explain lost volts. [2]'),
  [
    { label: '(a)', text: 'State what is meant by e.m.f.' },
    { label: '(b)', text: '(i) Define internal resistance.', marks: 1 },
    { label: '(ii)', text: 'Explain lost volts.', marks: 2 },
  ],
  'a nested (i) on the same line as (b) stays inside (b); a line-start (ii) becomes its own part'
)
assert.deepEqual(
  splitQuestionParts('Given f(a) = 2 and (b) is odd, find f(b). [3]'),
  [{ text: 'Given f(a) = 2 and (b) is odd, find f(b).', marks: 3 }],
  'labels mid-sentence do not split'
)
assert.deepEqual(splitQuestionParts('**(a)** Bold label. [2]'), [{ label: '(a)', text: 'Bold label.', marks: 2 }])
assert.deepEqual(splitQuestionParts('\r\n(a) One\r\n(b) Two'), [
  { label: '(a)', text: 'One' },
  { label: '(b)', text: 'Two' },
])
assert.deepEqual(splitQuestionParts(''), [])
assert.deepEqual(splitQuestionParts(null), [])

// --- sumPartMarks ---
assert.equal(sumPartMarks([{ text: 'a', marks: 2 }, { text: 'b', marks: 3 }, { text: 'c' }]), 5)
assert.equal(sumPartMarks([{ text: 'a' }]), null)

// --- sessions and footer codes ---
assert.equal(sessionCoverLabel('s23'), 'May/June 2023')
assert.equal(sessionCoverLabel('w24'), 'October/November 2024')
assert.equal(sessionCoverLabel('m22'), 'February/March 2022')
assert.equal(sessionCoverLabel('June 2023'), 'May/June 2023')
assert.equal(sessionCoverLabel('Oct/Nov 2021'), 'October/November 2021')
assert.equal(sessionCoverLabel('2023'), null)
assert.equal(paperFooterCode('9702/22', 's23'), '9702/22/M/J/23')
assert.equal(paperFooterCode('9709/12', 'May/June 2024'), '9709/12/M/J/24')
assert.equal(paperFooterCode('9701/42', 'w23'), '9701/42/O/N/23')
assert.equal(paperFooterCode('9702', 's23'), null, 'needs a component')
assert.equal(paperFooterCode('9702/22', 'Specimen'), null, 'unreadable session → no made-up code')

// --- splitMcqOptions ---
assert.deepEqual(
  splitMcqOptions('A ball is dropped from rest. What is its speed after 2.0 s?\nA 4.9 m/s\nB 9.8 m/s\nC 19.6 m/s\nD 39.2 m/s'),
  {
    stem: 'A ball is dropped from rest. What is its speed after 2.0 s?',
    options: [
      { letter: 'A', text: '4.9 m/s' },
      { letter: 'B', text: '9.8 m/s' },
      { letter: 'C', text: '19.6 m/s' },
      { letter: 'D', text: '39.2 m/s' },
    ],
  },
  'a stem that itself opens with "A " does not steal the first option'
)
assert.deepEqual(
  splitMcqOptions('Which quantity is a vector? [1]\nA. energy\nB) mass\n(C) momentum\n**D** speed'),
  {
    stem: 'Which quantity is a vector?',
    options: [
      { letter: 'A', text: 'energy' },
      { letter: 'B', text: 'mass' },
      { letter: 'C', text: 'momentum' },
      { letter: 'D', text: 'speed' },
    ],
    marks: 1,
  },
  'tolerates "A." / "B)" / "(C)" / bold labels and strips the stem marks'
)
assert.deepEqual(
  splitMcqOptions('What is the SI base unit of current?  A ampere  B coulomb  C volt  D watt [1]'),
  {
    stem: 'What is the SI base unit of current?',
    options: [
      { letter: 'A', text: 'ampere' },
      { letter: 'B', text: 'coulomb' },
      { letter: 'C', text: 'volt' },
      { letter: 'D', text: 'watt' },
    ],
    marks: 1,
  },
  'options on one line split on two or more spaces; a bracket after D is the question mark'
)
assert.deepEqual(
  splitMcqOptions('Which is a base quantity?\n- A: force\n- B: length\n* C: energy\n• D: power')?.options.map((o) => o.text),
  ['force', 'length', 'energy', 'power'],
  'a list bullet and a colon label, as extracted text often arrives, still read as options'
)
assert.deepEqual(
  splitMcqOptions('The distance  A to B is 3 m.\nA 1 m\nB 2 m\nC 3 m\nD 4 m')?.stem,
  'The distance  A to B is 3 m.',
  'a stray letter mid-stem is not an option'
)
assert.equal(splitMcqOptions('Find the speed.\nA 1 m/s\nB 2 m/s\nC 3 m/s'), null, 'fewer than four → not an MCQ')
assert.equal(splitMcqOptions('Find the speed. Given that A is at rest and B is moving, C and D collide.'), null)
assert.equal(splitMcqOptions('Options:\nA\nB\nC\nD'), null, 'empty responses are not an MCQ')
assert.equal(splitMcqOptions(''), null)
assert.equal(splitMcqOptions(null), null)
assert.deepEqual(
  splitMcqOptions('(a) Define D.C. current.\n(b) A wire carries 2 A.')?.options,
  undefined,
  'part labels and abbreviations do not read as options'
)

// --- mcqFitsOneRow ---
assert.equal(mcqFitsOneRow([{ letter: 'A', text: '2 m' }, { letter: 'B', text: '$4\\,\\text{m s}^{-1}$' }]), true)
assert.equal(mcqFitsOneRow([{ letter: 'A', text: '2 m' }, { letter: 'B', text: 'the gravitational potential energy' }]), false)
assert.equal(mcqFitsOneRow([]), false)

console.log('exam-paper/question-parts.test.ts: ok')
