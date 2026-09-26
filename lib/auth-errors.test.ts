import assert from 'node:assert/strict'
import { formatAuthError } from '@/lib/auth-errors'

/**
 * With leaked-password protection on, Supabase refuses a breached password
 * with the same weak_password code as a short one. The copy must say which.
 */
function main() {
  const pwned = formatAuthError({
    code: 'weak_password',
    message: 'Password is known to be weak and easy to guess, please choose a different one.',
    status: 422,
    reasons: ['pwned'],
  })
  assert.match(pwned, /data breach/, 'a breached password is named as such')
  assert.doesNotMatch(pwned, /8 characters/, 'not the length advice')

  // Detected from the message alone too (older clients drop `reasons`).
  assert.match(
    formatAuthError({ code: 'weak_password', message: 'Password is known to be weak and easy to guess' }),
    /data breach/
  )

  // A short password still gets the length advice.
  const short = formatAuthError({
    code: 'weak_password',
    message: 'Password should be at least 8 characters.',
    reasons: ['length'],
  })
  assert.match(short, /at least 8 characters/)

  // Other mappings unchanged.
  assert.match(formatAuthError({ code: 'invalid_credentials', message: 'Invalid login credentials' }), /incorrect/)
  assert.match(formatAuthError({ message: 'Too many requests', status: 429 }), /Too many attempts/)

  console.log('auth-errors: ok')
}

main()
