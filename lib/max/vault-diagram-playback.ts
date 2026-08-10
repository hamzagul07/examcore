/**
 * Continuous playback scripts for Max Vault Concept Cinema.
 * Progress t ∈ [0,1] drives live diagram params + teaching-step index.
 */

export type VaultPlaybackTrack = {
  from: number
  to: number
  /** sine = ping-pong feel (good for SHM / oscillating ideas). */
  wave?: 'linear' | 'sine'
}

export type VaultDiagramPlayback = {
  durationMs: number
  params?: Record<string, VaultPlaybackTrack>
}

const PLAYBACK_BY_SLUG: Record<string, VaultDiagramPlayback> = {
  '1-7-differentiation': {
    durationMs: 12_000,
    params: {
      x0: { from: 0.9, to: 3.1, wave: 'sine' },
      n: { from: 2, to: 2 },
    },
  },
  '1-8-integration': {
    durationMs: 11_000,
    params: {
      a: { from: 0.6, to: 1.8, wave: 'sine' },
      b: { from: 2.8, to: 5.2, wave: 'sine' },
    },
  },
  '5-5-the-normal-distribution': {
    durationMs: 10_000,
    params: {
      mu: { from: -0.8, to: 0.8, wave: 'sine' },
      sigma: { from: 0.75, to: 1.55, wave: 'sine' },
    },
  },
  '17-1-simple-harmonic-oscillations': {
    durationMs: 9_000,
    params: {
      A: { from: 0.35, to: 1.05, wave: 'sine' },
    },
  },
  '10-3-potential-dividers': {
    durationMs: 9_500,
  },
  '8-1-stationary-waves': {
    durationMs: 9_500,
  },
}

export function getVaultDiagramPlayback(slug: string): VaultDiagramPlayback {
  return (
    PLAYBACK_BY_SLUG[slug] ?? {
      durationMs: 10_000,
    }
  )
}

function sampleTrack(track: VaultPlaybackTrack, t: number): number {
  const u =
    track.wave === 'sine' ? 0.5 + 0.5 * Math.sin(2 * Math.PI * t) : Math.min(1, Math.max(0, t))
  return track.from + (track.to - track.from) * u
}

/** Sample continuous params + discrete teaching step for progress t ∈ [0,1]. */
export function sampleVaultPlayback(
  slug: string,
  t: number,
  stepCount: number
): { params: Record<string, number>; stepIndex: number } {
  const playback = getVaultDiagramPlayback(slug)
  const clamped = ((t % 1) + 1) % 1
  const params: Record<string, number> = {}
  if (playback.params) {
    for (const [key, track] of Object.entries(playback.params)) {
      params[key] = sampleTrack(track, clamped)
    }
  }
  const n = Math.max(1, stepCount)
  const stepIndex = Math.min(n - 1, Math.floor(clamped * n))
  return { params, stepIndex }
}
