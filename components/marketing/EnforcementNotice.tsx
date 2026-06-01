import { getEnforcementMode } from '@/lib/billing/enforcement-mode'

/** Shown on pricing when metering is active — sets expectations before checkout. */
export function EnforcementNotice() {
  const mode = getEnforcementMode()
  if (mode === 'off') return null

  const copy =
    mode === 'warn'
      ? 'Usage limits are in warning mode — you can still submit when over cap while we tune the experience.'
      : 'Usage limits are enforced — marking, whole papers, and Omni pause at your monthly cap unless you upgrade or use credits.'

  return (
    <p
      className={`mx-auto mb-8 max-w-2xl rounded-2xl border px-4 py-3 text-center text-sm leading-relaxed ${
        mode === 'warn' ? 'ec-highlight-warning-panel ec-score-mid' : 'ec-tint-critical-panel ec-score-low'
      }`}
    >
      {copy}
    </p>
  )
}
