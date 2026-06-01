'use client'

import dynamic from 'next/dynamic'
import { usePrefersReducedMotion } from '@/lib/hooks/usePrefersReducedMotion'

const WireframeBackground = dynamic(
  () =>
    import('@/components/design-system/WireframeBackground').then(
      (m) => m.WireframeBackground
    ),
  { ssr: false, loading: () => null }
)

/** Marketing routes only — see app/(marketing)/layout.tsx */
export function WireframeBackgroundGate() {
  const reduce = usePrefersReducedMotion()
  if (reduce) return null
  return <WireframeBackground />
}
