/**
 * Community feature flag. Ships dark by default so the code can deploy before the
 * DB migrations are applied. Set COMMUNITY_ENABLED=true (server env) once the
 * community_* migrations are live on Supabase to turn it on.
 */
export function isCommunityEnabled(): boolean {
  return process.env.COMMUNITY_ENABLED === 'true'
}

/** Client-safe flag (course pages are client components). Set NEXT_PUBLIC_COMMUNITY_ENABLED=true. */
export function isCommunityEnabledClient(): boolean {
  return process.env.NEXT_PUBLIC_COMMUNITY_ENABLED === 'true'
}
