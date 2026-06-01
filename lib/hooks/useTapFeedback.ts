/** Light haptic pulse for primary actions on supported mobile browsers. */
export function triggerPrimaryHaptic(): void {
  if (typeof window === 'undefined') return
  if (!window.navigator?.vibrate) return
  try {
    window.navigator.vibrate(10)
  } catch {
    // vibrate blocked or unsupported
  }
}
