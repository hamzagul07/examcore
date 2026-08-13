import assert from 'node:assert/strict'
import { getComponentMarkingType } from '@/lib/marking/component-types'

/**
 * Component marking types, pinned against extracted mark schemes.
 *
 * These entries decide how a paper is marked when no scheme is cached for the
 * specific question, so a wrong one is not cosmetic: Economics Paper 3 was
 * declared level_of_response and is multiple choice, which handed students an
 * essay-marking prompt for a paper of lettered answers. 9708 is the second
 * most-marked subject in the corpus.
 *
 * Every expectation below was checked against what the mark scheme PDFs
 * actually contained — 682 extracted rows for Economics alone, counted by
 * whether each carried an answer key, a marks array or bands. Where this file
 * and the extracted schemes disagree, the schemes are the evidence and this
 * file is the claim.
 */
function main() {
  const t = (subject: string, component: string) =>
    getComponentMarkingType(subject, component)

  // --- Economics 9708: corrected against extraction --------------------------
  // Papers 1 and 3 are multiple choice. 339 and 240 extracted rows, every one
  // carrying an answer key and none a marks array.
  for (const c of ['11', '12', '13']) {
    assert.equal(t('9708', c), 'mcq', `9708/${c} is multiple choice`)
  }
  for (const c of ['31', '32']) {
    assert.equal(
      t('9708', c),
      'mcq',
      `9708/${c} is multiple choice — declaring it level_of_response marked lettered answers as essays`
    )
  }
  // Paper 2 carries both point-based and level-of-response questions, so it is
  // genuinely mixed rather than purely one or the other.
  for (const c of ['21', '22']) {
    assert.equal(t('9708', c), 'mixed', `9708/${c} mixes point and band marking`)
  }
  // Paper 4 is the essay paper and was never in dispute.
  assert.equal(t('9708', '41'), 'level_of_response')

  // --- Accounting 9706 paper 1 is multiple choice -----------------------------
  // 90 extracted rows, every one an answer key. The subject default is
  // point_based and was being applied to paper 1 as well.
  for (const c of ['11', '12', '13']) {
    assert.equal(t('9706', c), 'mcq', `9706/${c} is multiple choice`)
  }
  // The rest of Accounting genuinely is point-based.
  assert.equal(t('9706', '21'), 'point_based')

  // --- science paper 1s are multiple choice ----------------------------------
  // Confirmed by extraction: every cached row for these carries an answer key.
  for (const subject of ['9700', '9701', '9702']) {
    for (const c of ['11', '12', '13']) {
      assert.equal(t(subject, c), 'mcq', `${subject}/${c} is multiple choice`)
    }
  }

  // --- maths is point-based throughout ---------------------------------------
  // Method and accuracy marks; there is no band judgement to make.
  for (const c of ['11', '12', '31', '41', '51', '61']) {
    assert.equal(t('9709', c), 'point_based', `9709/${c} awards method marks`)
  }

  console.log('component-types.evidence.test.ts: ok')
}

main()
