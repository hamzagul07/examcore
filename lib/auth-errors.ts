/**
 * Maps raw Supabase auth errors to actionable, student-friendly copy.
 * Unmapped errors fall through to the original message so real detail
 * is never hidden.
 */

type SupabaseAuthError = {
  message: string
  code?: string
  status?: number
}

export function formatAuthError(error: SupabaseAuthError): string {
  const code = error.code ?? ''
  const message = error.message ?? ''
  const lower = message.toLowerCase()

  if (code === 'invalid_credentials' || lower.includes('invalid login credentials')) {
    return 'Email or password is incorrect. Double-check them, or reset your password below.'
  }
  if (code === 'email_not_confirmed' || lower.includes('email not confirmed')) {
    return 'Confirm your email first — check your inbox (and spam) for the verification link.'
  }
  if (code === 'user_already_exists' || lower.includes('already registered')) {
    return 'An account with this email already exists. Sign in instead, or reset your password.'
  }
  if (code === 'weak_password' || lower.includes('password should')) {
    return 'That password is too weak. Use at least 8 characters with a mix of letters and numbers.'
  }
  if (
    code === 'over_email_send_rate_limit' ||
    code === 'over_request_rate_limit' ||
    error.status === 429 ||
    lower.includes('rate limit') ||
    lower.includes('too many requests')
  ) {
    return 'Too many attempts. Wait a couple of minutes, then try again.'
  }
  if (lower.includes('fetch') || lower.includes('network')) {
    return 'Could not reach the sign-in service. Check your connection and try again.'
  }
  return message || 'Something went wrong. Please try again.'
}
