import assert from 'node:assert/strict'

process.env.MARK_SHARE_SECRET ||= 'test-mark-share-secret'
process.env.NEXT_PUBLIC_SITE_URL ||= 'https://markscheme.app'

async function main() {
  const {
    createMarkShareToken,
    verifyMarkShareToken,
    markShareUrl,
    createProgressShareToken,
    verifyProgressShareToken,
    progressShareUrl,
  } = await import('./share-token')

  const attemptId = 'b0b7f880-6d67-43b4-b62e-5a8ba75b44cd'
  const token = createMarkShareToken(attemptId, {
    subjectCode: '9706',
    paperRef: 'Practice Q4(d)',
  })
  assert.ok(token.includes('.'), 'token has signature segment')

  const verified = verifyMarkShareToken(token)
  assert.ok(verified)
  assert.equal(verified!.attemptId, attemptId)
  assert.equal(verified!.subjectCode, '9706')
  assert.equal(verified!.paperRef, 'Practice Q4(d)')

  assert.equal(verifyMarkShareToken('nope'), null)
  assert.equal(verifyMarkShareToken(token.slice(0, -2) + 'xx'), null)

  const url = markShareUrl(token)
  assert.ok(url.startsWith('https://markscheme.app/r/'))

  const { buildParentScoreSlipText } = await import('./parent-score-slip')
  const text = buildParentScoreSlipText({
    marksEarned: 6,
    totalMarks: 6,
    percentage: 100,
    bandLabel: 'Full marks',
    shareUrl: url,
    marks: [{ label: 'M1', earned: true }],
  })
  assert.match(text, /Full report:/)
  assert.match(text, /markscheme\.app\/r\//)

  const noLink = buildParentScoreSlipText({
    marksEarned: 6,
    totalMarks: 6,
    percentage: 100,
    bandLabel: 'Full marks',
    marks: [{ label: 'M1', earned: true }],
  })
  assert.doesNotMatch(
    noLink,
    /Full report:/,
    'must not claim a full report without a /r URL'
  )
  assert.doesNotMatch(noLink, /markscheme\.app\/mark/)

  // ── Progress links (the parent report) ────────────────────────────────────
  const userId = 'f4b5a4f0-91b1-4d3a-9a53-2c9b0e0d1f22'
  const progress = createProgressShareToken(userId)
  const verifiedProgress = verifyProgressShareToken(progress)
  assert.ok(verifiedProgress)
  assert.equal(verifiedProgress!.userId, userId)

  assert.equal(verifyProgressShareToken('nope'), null)
  assert.equal(verifyProgressShareToken(progress.slice(0, -2) + 'xx'), null)
  assert.ok(progressShareUrl(progress).startsWith('https://markscheme.app/p/'))

  // Both link types are signed with the same secret, so each verifier must
  // refuse the other's token on the `k` discriminator rather than on luck.
  assert.equal(
    verifyMarkShareToken(progress),
    null,
    'a progress link must not verify as a mark link'
  )
  assert.equal(
    verifyProgressShareToken(token),
    null,
    'a mark link must not verify as a progress link'
  )

  console.log('share-token: all assertions passed')
}

void main()
