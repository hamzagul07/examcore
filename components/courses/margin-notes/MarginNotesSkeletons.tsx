'use client'

import { MarginNotesPageShell } from '@/components/courses/margin-notes/MarginNotesPageShell'

export function CatalogPageSkeleton() {
  return (
    <MarginNotesPageShell showReadingProgress={false}>
      <main className="catalog-page" aria-busy="true" aria-label="Loading courses">
        <header className="catalog-hero pg">
          <div className="mn-skeleton-block mn-skeleton-catalog-hero" />
        </header>
        <div className="pg">
          <div className="mn-skeleton-block mn-skeleton-continue card" />
          <div className="mn-skeleton-block mn-skeleton-filters" />
          <div className="catalog-grid">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="mn-skeleton-block mn-skeleton-scard card" />
            ))}
          </div>
        </div>
      </main>
    </MarginNotesPageShell>
  )
}

export function SubjectsPageSkeleton() {
  return (
    <MarginNotesPageShell showReadingProgress={false}>
      <main className="subjects-page" aria-busy="true" aria-label="Loading subjects">
        <div className="pg">
          <div className="mn-skeleton-block mn-skeleton-subjects-hero" />
          <div className="mn-skeleton-block mn-skeleton-filters" />
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="mn-skeleton-block mn-skeleton-subj-row card" />
          ))}
        </div>
      </main>
    </MarginNotesPageShell>
  )
}

export function LessonPageSkeleton() {
  return (
    <MarginNotesPageShell showReadingProgress={false}>
      <main className="lesson-page" aria-busy="true" aria-label="Loading lesson">
        <div className="pg">
          <div className="mn-skeleton mn-skeleton-crumb" />
          <div className="mn-skeleton-block mn-skeleton-lesson-hero" />
          <div className="mn-skeleton-block mn-skeleton-modebar" />
          <div className="lesson-layout pg">
            <div className="mn-skeleton-block mn-skeleton-toc card" />
            <div className="mn-skeleton-block mn-skeleton-article" />
          </div>
        </div>
      </main>
    </MarginNotesPageShell>
  )
}

export function HubPageSkeleton() {
  return (
    <MarginNotesPageShell showReadingProgress={false}>
      <main className="hub-page" aria-busy="true" aria-label="Loading course">
        <div className="pg">
          <div className="mn-skeleton mn-skeleton-crumb" />
          <div className="mn-skeleton-block mn-skeleton-hub-hero" />
          <div className="paper-tabs">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="mn-skeleton-block mn-skeleton-paper-tab card" />
            ))}
          </div>
        </div>
      </main>
    </MarginNotesPageShell>
  )
}
