import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  expandSubjectCodeAliases,
  preferSubjectCodesFirst,
  preferSubjectsByCodeFirst,
  splitPreferredSubjects,
} from './prefer-codes'

describe('expandSubjectCodeAliases', () => {
  it('bridges ib-prefixed profile codes and bare course slugs', () => {
    assert.deepEqual(expandSubjectCodeAliases('ib-biology-hl'), [
      'ib-biology-hl',
      'biology-hl',
      'ib-biology',
      'biology',
    ])
  })
})

describe('preferSubjectCodesFirst', () => {
  it('pins preferred codes first in profile order', () => {
    assert.deepEqual(
      preferSubjectCodesFirst(
        ['9709', '9702', '9701', '9708'],
        ['9702', '9701']
      ),
      ['9702', '9701', '9709', '9708']
    )
  })

  it('matches IB profile codes to level-agnostic catalog codes', () => {
    assert.deepEqual(
      preferSubjectCodesFirst(
        ['ib-chemistry', 'ib-biology', 'ib-physics'],
        ['ib-biology-hl']
      ),
      ['ib-biology', 'ib-chemistry', 'ib-physics']
    )
  })

  it('ignores preferred codes that are not in the list', () => {
    assert.deepEqual(
      preferSubjectCodesFirst(['9709', '9702'], ['9999', '9702']),
      ['9702', '9709']
    )
  })

  it('returns the original order when nothing is preferred', () => {
    assert.deepEqual(
      preferSubjectCodesFirst(['9709', '9702'], []),
      ['9709', '9702']
    )
  })
})

describe('preferSubjectsByCodeFirst', () => {
  it('reorders objects by code', () => {
    const items = [
      { code: '9709', name: 'Maths' },
      { code: '9702', name: 'Physics' },
      { code: '9701', name: 'Chemistry' },
    ]
    assert.deepEqual(
      preferSubjectsByCodeFirst(items, ['9701', '9702'], (s) => s.code),
      [
        { code: '9701', name: 'Chemistry' },
        { code: '9702', name: 'Physics' },
        { code: '9709', name: 'Maths' },
      ]
    )
  })

  it('matches ib- profile codes onto bare IB course card slugs', () => {
    const items = [
      { code: 'chemistry-hl', name: 'Chemistry' },
      { code: 'biology-hl', name: 'Biology' },
      { code: 'physics-hl', name: 'Physics' },
    ]
    assert.deepEqual(
      preferSubjectsByCodeFirst(items, ['ib-biology-hl'], (s) => s.code),
      [
        { code: 'biology-hl', name: 'Biology' },
        { code: 'chemistry-hl', name: 'Chemistry' },
        { code: 'physics-hl', name: 'Physics' },
      ]
    )
  })
})

describe('splitPreferredSubjects', () => {
  it('returns matched subjects separately without duplicating the rest', () => {
    const items = [
      { code: '9709', name: 'Maths' },
      { code: '9702', name: 'Physics' },
      { code: '9701', name: 'Chemistry' },
    ]
    assert.deepEqual(
      splitPreferredSubjects(items, ['9702'], (s) => s.code),
      {
        yours: [{ code: '9702', name: 'Physics' }],
        rest: [
          { code: '9709', name: 'Maths' },
          { code: '9701', name: 'Chemistry' },
        ],
      }
    )
  })
})
