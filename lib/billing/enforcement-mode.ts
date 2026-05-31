export type EnforcementMode = 'off' | 'warn' | 'enforce'

/**
 * Read at REQUEST TIME (not module load) so a flag change takes effect on the
 * next request without a code change. In production this still requires a
 * Vercel env var update + redeploy; in dev a server restart is enough.
 *
 * Fail-safe default is 'off' — anything unrecognized means no blocking.
 */
export function getEnforcementMode(): EnforcementMode {
  const mode = process.env.ENFORCEMENT_MODE
  if (mode === 'warn' || mode === 'enforce') return mode
  return 'off'
}

export function shouldShowApproachingLimitBanner(): boolean {
  return getEnforcementMode() !== 'off'
}

export function shouldBlockAtCap(): boolean {
  return getEnforcementMode() === 'enforce'
}
