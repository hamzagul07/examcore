export type EnforcementMode = 'off' | 'warn' | 'enforce'

/**
 * Whether the "defaulted to enforce" warning has been printed by this process.
 *
 * Module-level on purpose: the mode is read on every gate, so logging on each
 * read would turn one misconfiguration into a log line per mark. Once per
 * process is enough to be noticed and not enough to drown anything.
 */
let warnedDefault = false

/** Test seam: forget that the warning was already printed. */
export function resetEnforcementModeWarning(): void {
  warnedDefault = false
}

/**
 * Read at REQUEST TIME (not module load) so a flag change takes effect on the
 * next request without a code change. In production this still requires a
 * Vercel env var update + redeploy; in dev a server restart is enough.
 *
 * Production defaults to 'enforce'. It used to default to 'off', which meant
 * that an unset or misspelt ENFORCEMENT_MODE on a production deploy silently
 * switched every cap off — the metering kept counting, nothing ever blocked,
 * and the only symptom was a Gemini bill that did not match the subscriber
 * count. A missing flag is the one state a billing gate must not treat as
 * "let everyone through".
 *
 * Dev and test keep 'off': local marking must not need a billing setup, and the
 * unit suites exercise the allowance shapes without a database.
 *
 * `env` is injectable for the unit test only; callers never pass it.
 */
export function getEnforcementMode(
  env: { ENFORCEMENT_MODE?: string; NODE_ENV?: string } = process.env
): EnforcementMode {
  const mode = env.ENFORCEMENT_MODE?.trim()
  if (mode === 'off' || mode === 'warn' || mode === 'enforce') return mode
  if (env.NODE_ENV === 'production') {
    if (!warnedDefault) {
      warnedDefault = true
      console.warn(
        `[enforcement] ENFORCEMENT_MODE is ${
          mode ? `unrecognised (${JSON.stringify(mode)})` : 'unset'
        } in production — defaulting to 'enforce'. Set it explicitly to silence this.`
      )
    }
    return 'enforce'
  }
  return 'off'
}

export function shouldShowApproachingLimitBanner(): boolean {
  return getEnforcementMode() !== 'off'
}

export function shouldBlockAtCap(): boolean {
  return getEnforcementMode() === 'enforce'
}
