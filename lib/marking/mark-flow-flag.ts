/**
 * MarkFlow v2 preview gate.
 * Enable with `?flow=v2` or `localStorage.setItem('ms-mark-flow', 'v2')`.
 * Escape with `?flow=v1`.
 */
export const MARK_FLOW_STORAGE_KEY = 'ms-mark-flow'

export function isMarkFlowV2Enabled(): boolean {
  if (typeof window === 'undefined') return false
  try {
    const params = new URLSearchParams(window.location.search)
    const flow = params.get('flow')
    if (flow === 'v1') {
      window.localStorage.removeItem(MARK_FLOW_STORAGE_KEY)
      return false
    }
    if (flow === 'v2') {
      window.localStorage.setItem(MARK_FLOW_STORAGE_KEY, 'v2')
      return true
    }
    return window.localStorage.getItem(MARK_FLOW_STORAGE_KEY) === 'v2'
  } catch {
    return false
  }
}
