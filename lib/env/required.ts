/** Env vars required for the app to boot and serve authenticated flows. */
export const REQUIRED_ENV = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
] as const

/** Recommended before production launch — app may degrade without these. */
export function geminiEnvSatisfied(): boolean {
  const useVertex = ['true', '1', 'yes'].includes(
    (process.env.USE_VERTEX_AI ?? '').trim().toLowerCase()
  )
  if (useVertex) return Boolean(process.env.GOOGLE_CLOUD_PROJECT?.trim())
  return Boolean(process.env.GEMINI_API_KEY?.trim())
}

export const RECOMMENDED_PRODUCTION_ENV = [
  'GEMINI_API_KEY', // or USE_VERTEX_AI + GOOGLE_CLOUD_PROJECT
  'POLAR_ACCESS_TOKEN',
  'POLAR_WEBHOOK_SECRET',
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
