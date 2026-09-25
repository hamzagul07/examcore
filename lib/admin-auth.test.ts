import assert from 'node:assert/strict'
import { getAdminEmails, isAdminEmail } from './admin-auth'

// The bug: a hard-coded founder Gmail was the production admin whenever
// ADMIN_EMAILS was unset. Production must now grant nobody in that case.
const env = process.env as Record<string, string | undefined>
const saved = { NODE_ENV: env.NODE_ENV, ADMIN_EMAILS: env.ADMIN_EMAILS }
try {
  delete env.ADMIN_EMAILS
  env.NODE_ENV = 'production'
  assert.deepEqual(getAdminEmails(), [], 'production with no ADMIN_EMAILS has no admins')
  assert.equal(isAdminEmail('hg9256970@gmail.com'), false, 'the founder fallback is gone in production')

  env.ADMIN_EMAILS = ' Ops@Example.com, second@example.com ,'
  assert.deepEqual(getAdminEmails(), ['ops@example.com', 'second@example.com'])
  assert.equal(isAdminEmail('OPS@example.com'), true, 'case-insensitive')
  assert.equal(isAdminEmail('hg9256970@gmail.com'), false, 'the fallback is not appended to an explicit list')

  env.ADMIN_EMAILS = '   '
  assert.deepEqual(getAdminEmails(), [], 'whitespace is unset')

  // Outside production the founder convenience stays.
  delete env.ADMIN_EMAILS
  env.NODE_ENV = 'development'
  assert.deepEqual(getAdminEmails(), ['hg9256970@gmail.com'])
  env.NODE_ENV = 'test'
  assert.equal(isAdminEmail('hg9256970@gmail.com'), true)
  assert.equal(isAdminEmail(null), false)
  assert.equal(isAdminEmail(''), false)
} finally {
  for (const [k, v] of Object.entries(saved)) {
    if (v === undefined) delete env[k]
    else env[k] = v
  }
}

console.log('admin-auth: ok')
