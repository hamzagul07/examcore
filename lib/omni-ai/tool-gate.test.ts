import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { shouldRunMarkingToolLoop } from './tool-gate'

describe('shouldRunMarkingToolLoop', () => {
  it('skips tools for focused-attempt mark questions', () => {
    assert.equal(
      shouldRunMarkingToolLoop('Why did I lose the M1 mark?', {
        hasFocusedAttempt: true,
      }),
      false
    )
  })

  it('runs tools for cross-attempt history asks with a focused attempt', () => {
    assert.equal(
      shouldRunMarkingToolLoop('How does this compare to my previous marks?', {
        hasFocusedAttempt: true,
      }),
      true
    )
  })

  it('runs tools for coaching asks without a focused attempt', () => {
    assert.equal(
      shouldRunMarkingToolLoop('What is my weakest topic?', {
        hasFocusedAttempt: false,
      }),
      true
    )
    assert.equal(
      shouldRunMarkingToolLoop('What should I work on next?', {
        hasFocusedAttempt: false,
      }),
      true
    )
    assert.equal(
      shouldRunMarkingToolLoop('How do I get to A*?', {
        hasFocusedAttempt: false,
      }),
      true
    )
    assert.equal(
      shouldRunMarkingToolLoop('Am I improving?', {
        hasFocusedAttempt: false,
      }),
      true
    )
    assert.equal(
      shouldRunMarkingToolLoop('Where am I losing marks?', {
        hasFocusedAttempt: false,
      }),
      true
    )
  })

  it('skips tools for product upload questions', () => {
    assert.equal(
      shouldRunMarkingToolLoop('How do I upload a paper?', {
        hasFocusedAttempt: false,
      }),
      false
    )
  })
})
