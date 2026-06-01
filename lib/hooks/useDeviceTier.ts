'use client'

import { useEffect, useState } from 'react'

export type DeviceTier = 'low' | 'mid' | 'high'

function detectWebGL(): boolean {
  if (typeof document === 'undefined') return false
  try {
    const c = document.createElement('canvas')
    return !!(c.getContext('webgl') || c.getContext('experimental-webgl'))
  } catch {
    return false
  }
}

export function detectDeviceTier(): DeviceTier {
  if (typeof navigator === 'undefined') return 'mid'

  const conn = (navigator as Navigator & { connection?: { saveData?: boolean } })
    .connection
  if (conn?.saveData) return 'low'

  const mem = (navigator as Navigator & { deviceMemory?: number }).deviceMemory
  const cores = navigator.hardwareConcurrency ?? 4
  const webgl = detectWebGL()

  if (!webgl) return 'low'
  if ((mem !== undefined && mem <= 2) || cores <= 4) return 'low'
  if ((mem !== undefined && mem >= 8) && cores >= 8) return 'high'
  return 'mid'
}

export function useDeviceTier(): DeviceTier {
  const [tier, setTier] = useState<DeviceTier>('mid')
  useEffect(() => {
    setTier(detectDeviceTier())
  }, [])
  return tier
}

export function artDimensions(tier: DeviceTier): { width: number; height: number } {
  switch (tier) {
    case 'low':
      return { width: 512, height: 384 }
    case 'high':
      return { width: 1024, height: 768 }
    default:
      return { width: 768, height: 576 }
  }
}

export function useWebGLBook(tier: DeviceTier): boolean {
  return tier !== 'low' && detectWebGL()
}
