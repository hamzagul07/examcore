'use client'

import type { ReactNode } from 'react'

/**
 * Dashboard shell wrapper (DB-02 / PERF-01).
 * No entry opacity hide — server HTML stays visible immediately.
 */
export function DashboardEntry({ children }: { children: ReactNode }) {
  return <>{children}</>
}
