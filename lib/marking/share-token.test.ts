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

  // ── Links already in the wild ─────────────────────────────────────────────
  // Everything mailed before MARK_SHARE_SECRET existed was signed with
  // CRON_SECRET or the service-role key. Setting the new secret must not turn
  // those into "invalid link" for the parents holding them: legacy keys are
  // accepted for VERIFICATION only, until those links expire on their own.
  const env = process.env as Record<string, string | undefined>
  const saved = {
    NODE_ENV: env.NODE_ENV,
    MARK_SHARE_SECRET: env.MARK_SHARE_SECRET,
    CRON_SECRET: env.CRON_SECRET,
    SUPABASE_SERVICE_ROLE_KEY: env.SUPABASE_SERVICE_ROLE_KEY,
  }
  const restore = () => {
    for (const [k, v] of Object.entries(saved)) {
      if (v === undefined) delete env[k]
      else env[k] = v
    }
  }
  try {
    // Sign as the old deploy did: no MARK_SHARE_SECRET, CRON_SECRET fallback.
    delete env.MARK_SHARE_SECRET
    env.NODE_ENV = 'development'
    env.CRON_SECRET = 'old-cron-secret'
    delete env.SUPABASE_SERVICE_ROLE_KEY
    const legacyMark = createMarkShareToken(attemptId, { subjectCode: '9706' })
    const legacyProgress = createProgressShareToken(userId)

    // …and the service-role fallback, which some deploys used.
    delete env.CRON_SECRET
    env.SUPABASE_SERVICE_ROLE_KEY = 'old-service-role-key'
    const legacyMarkSrk = createMarkShareToken(attemptId)

    // Now the new secret is set (production). Old links still verify.
    env.NODE_ENV = 'production'
    env.MARK_SHARE_SECRET = 'brand-new-share-secret'
    env.CRON_SECRET = 'old-cron-secret'
    assert.equal(
      verifyMarkShareToken(legacyMark)?.attemptId,
      attemptId,
      'a mark link signed with CRON_SECRET still resolves after MARK_SHARE_SECRET is set'
    )
    assert.equal(
      verifyProgressShareToken(legacyProgress)?.userId,
      userId,
      'a progress link signed with CRON_SECRET still resolves'
    )
    assert.equal(
      verifyMarkShareToken(legacyMarkSrk)?.attemptId,
      attemptId,
      'a mark link signed with the service-role key still resolves'
    )
    // New links are signed with the new secret only — never with a legacy key.
    const fresh = createMarkShareToken(attemptId)
    assert.equal(verifyMarkShareToken(fresh)?.attemptId, attemptId)
    delete env.CRON_SECRET
    delete env.SUPABASE_SERVICE_ROLE_KEY
    assert.equal(
      verifyMarkShareToken(fresh)?.attemptId,
      attemptId,
      'a fresh link verifies with MARK_SHARE_SECRET alone'
    )
    assert.equal(
      verifyMarkShareToken(legacyMark),
      null,
      'once the legacy key is gone, a legacy link no longer verifies'
    )
    // A legacy key that no longer signs anything is not silently trusted for
    // signing: production without MARK_SHARE_SECRET refuses to mint links.
    delete env.MARK_SHARE_SECRET
    env.CRON_SECRET = 'old-cron-secret'
    assert.throws(
      () => createMarkShareToken(attemptId),
      /MARK_SHARE_SECRET is required in production/,
      'signing in production needs the explicit secret'
    )
    assert.equal(
      verifyMarkShareToken(legacyMark)?.attemptId,
      attemptId,
      'verification of an old link does not need the explicit secret'
    )

    // No key at all: the /r and /p pages must render their invalid-link
    // state, not throw a 500 from a server component.
    delete env.CRON_SECRET
    delete env.SUPABASE_SERVICE_ROLE_KEY
    assert.doesNotThrow(() => verifyMarkShareToken(fresh))
    assert.equal(verifyMarkShareToken(fresh), null)
    assert.doesNotThrow(() => verifyProgressShareToken(legacyProgress))
    assert.equal(verifyProgressShareToken(legacyProgress), null)
  } finally {
    restore()
  }

  console.log('share-token: all assertions passed')
}

void main()
