/** Env vars required for the app to boot and serve authenticated flows. */
export const REQUIRED_ENV = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
] as const

/** Recommended before production launch — app may degrade without these. */
export const RECOMMENDED_PRODUCTION_ENV = [
  'ANTHROPIC_API_KEY',
  'GEMINI_API_KEY',
  'STRIPE_SECRET_KEY',
  'STRIPE_WEBHOOK_SECRET',
  'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY',
  'NEXT_PUBLIC_SITE_URL',
  'RESEND_API_KEY',
] as const

export type EnvPresence = Record<string, boolean>

export function envPresence(keys: readonly string[]): EnvPresence {
  return Object.fromEntries(
    keys.map((key) => [key, Boolean(process.env[key]?.trim())])
  )
}

export function allPresent(presence: EnvPresence): boolean {
  return Object.values(presence).every(Boolean)
}
