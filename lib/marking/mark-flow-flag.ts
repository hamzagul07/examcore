/**
 * Mark flow v2 (R1) — Capture → Confirm → Marking → Result.
 * Enable with `?flow=v2` or localStorage `ms-mark-flow=v2`.
 */

export const MARK_FLOW_V2_STORAGE_KEY = 'ms-mark-flow'

export function isMarkFlowV2Enabled(search?: string | null): boolean {
  if (typeof window === 'undefined') {
    return typeof search === 'string' && /(?:^|[?&])flow=v2(?:&|$)/.test(search)
  }
  try {
    const params = new URLSearchParams(search ?? window.location.search)
    if (params.get('flow') === 'v2') return true
    if (params.get('flow') === 'v1') return false
    return window.localStorage.getItem(MARK_FLOW_V2_STORAGE_KEY) === 'v2'
  } catch {
    return false
  }
}

export function setMarkFlowV2Preference(enabled: boolean) {
  if (typeof window === 'undefined') return
  try {
    if (enabled) window.localStorage.setItem(MARK_FLOW_V2_STORAGE_KEY, 'v2')
    else window.localStorage.removeItem(MARK_FLOW_V2_STORAGE_KEY)
  } catch {
    /* ignore */
  }
}
