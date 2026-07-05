'use client'

import { LoadingLink } from '@/components/ui/LoadingLink'
import {
  ExamSheet,
  ExamSheetLine,
  InkCircle,
  InkScribble,
  MarginNote,
} from '@/components/margin-notes'

export function LandingHeroSheet() {
  return (
    <div className="ms-hero-sheet-wrap">
      <ExamSheet
        head="Q7 (b) — find and classify the stationary points"
        headRight="9709/12 · p.2"
        tally="4 / 5"
        cite="MS 9709/12/M/J/23 · Q7(b): M1 differentiate · M1 set = 0 · A1 both roots · A1 classification"
      >
        <ExamSheetLine work="dy/dx = 3x² − 12x + 9" mark="M1 ✓" ok stampDelayMs={80} />
        <ExamSheetLine work="3x² − 12x + 9 = 0" mark="M1 ✓" ok stampDelayMs={200} />
        <ExamSheetLine work="x = 1, x = 3" mark="A1 ✓" ok stampDelayMs={320} />
        <ExamSheetLine
          work="min at x = 1"
          mark="A0 ✗"
          ok={false}
          note="check d²y/dx² — x = 1 is the maximum ↑"
          stampDelayMs={440}
        />
      </ExamSheet>
      <p className="ms-sheet-caption">real Examiner&apos;s Ink, on your actual handwriting</p>
    </div>
  )
}

interface LandingHeroProps {
  markHref: string
}

export function LandingHero({ markHref }: LandingHeroProps) {
  return (
    <section className="ms-pg ms-hero ms-hero--energized ec-page-mesh ec-no-annot-mobile">
      <div className="ms-fade-in">
        <p className="ms-hero-kicker ec-kicker-accent">
          Cambridge A-Level, O-Level &amp; IB Diploma
        </p>
        <h1 className="ms-h-display">
          Your past papers, <InkCircle>marked</InkCircle> like the{' '}
          <em>
            <InkScribble>real exam</InkScribble>
          </em>
          .
          <MarginNote style={{ top: '-44px', right: '-10px' }}>this step earns M1!</MarginNote>
        </h1>
        <p className="ms-lead ms-hero-lead">
          Photograph your handwritten answer. We mark it point by point against the official
          mark scheme — with Examiner&apos;s Ink in your margins.
        </p>
        <div className="ms-hero-ctas">
          <LoadingLink
            href={markHref}
            className="ec-btn-primary brand-pulse"
            loadingText="Opening mark…"
          >
            Mark your first question — free
          </LoadingLink>
          {/* One dominant CTA — the other paths are quiet text links so the
              primary action doesn't compete with two more buttons. */}
          <LoadingLink href="/courses" className="ec-btn-underline" loadingText="Loading courses…">
            Browse free courses
          </LoadingLink>
          <LoadingLink href="/community" className="ec-btn-underline">
            Visit Exam Room
          </LoadingLink>
        </div>
        <p className="ms-micro ms-hero-micro">
          MARK · COURSES · EXAM ROOM · FREE TIER · NO CARD
        </p>
      </div>
      <div className="ms-fade-in ms-stag-2">
        <LandingHeroSheet />
      </div>
    </section>
  )
}
