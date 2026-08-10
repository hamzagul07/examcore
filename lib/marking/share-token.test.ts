import assert from 'node:assert/strict'

process.env.MARK_SHARE_SECRET ||= 'test-mark-share-secret'
process.env.NEXT_PUBLIC_SITE_URL ||= 'https://markscheme.app'

async function main() {
  const {
    createMarkShareToken,
    verifyMarkShareToken,
    markShareUrl,
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

  console.log('share-token: all assertions passed')
}

void main()
