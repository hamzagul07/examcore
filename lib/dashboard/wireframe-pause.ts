'use client'

/** Global pause flag for WireframeBackground on dashboard (avoids dual WebGL load). */
let wireframePaused = false
const listeners = new Set<() => void>()

export function setWireframePaused(paused: boolean): void {
  if (wireframePaused === paused) return
  wireframePaused = paused
  listeners.forEach((fn) => fn())
}

export function getWireframePaused(): boolean {
  return wireframePaused
}

export function subscribeWireframePause(fn: () => void): () => void {
  listeners.add(fn)
  return () => listeners.delete(fn)
}
