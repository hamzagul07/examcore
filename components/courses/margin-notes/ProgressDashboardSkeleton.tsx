'use client'

import { MarginNotesPageShell } from '@/components/courses/margin-notes/MarginNotesPageShell'

export function ProgressDashboardSkeleton() {
  return (
    <MarginNotesPageShell>
      <main className="dash-page" aria-busy="true" aria-label="Loading progress">
        <div className="pg">
          <div className="mn-skeleton mn-skeleton-crumb" />
          <header className="dash-hero">
            <div className="mn-skeleton-block mn-skeleton-hero" />
            <div className="mn-skeleton-block mn-skeleton-streak card" />
          </header>
          <div className="dash-stats">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="mn-skeleton-block mn-skeleton-stat card" />
            ))}
          </div>
          <div className="mn-skeleton-block mn-skeleton-sheet card" />
        </div>
      </main>
    </MarginNotesPageShell>
  )
}
