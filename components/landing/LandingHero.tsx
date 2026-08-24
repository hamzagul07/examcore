'use client'

import { CTA_MARK } from '@/lib/copy/product-lexicon'
import { useEffect } from 'react'
import { LoadingLink } from '@/components/ui/LoadingLink'
import { trackFunnelEvent } from '@/lib/analytics/funnel'
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
        <ExamSheetLine work="dy/dx = 3x² − 12x + 9" mark="M1 ✓" ok stampDelayMs={180} />
        <ExamSheetLine work="3x² − 12x + 9 = 0" mark="M1 ✓" ok stampDelayMs={420} />
        <ExamSheetLine work="x = 1, x = 3" mark="A1 ✓" ok stampDelayMs={680} />
        <ExamSheetLine
          work="min at x = 1"
          mark="A0 ✗"
          ok={false}
          note="check d²y/dx² — x = 1 is the maximum ↑"
          stampDelayMs={980}
        />
      </ExamSheet>
      <p className="ms-sheet-caption">real Examiner&apos;s Ink on typed or handwritten work</p>
    </div>
  )
}

interface LandingHeroProps {
  markHref: string
}

export function LandingHero({ markHref }: LandingHeroProps) {
  useEffect(() => {
    trackFunnelEvent('landing_view', { source: 'home' })
  }, [])

  return (
    <section className="ms-pg ms-hero ms-hero--energized ec-page-mesh ec-no-annot-mobile">
      <div className="ms-fade-in">
        <p className="ms-hero-kicker ec-kicker-accent">
          Cambridge · IB · the ink that tells the truth
        </p>
        <h1 className="ms-h-display">
          Watch your script get <InkCircle>stamped</InkCircle> like an{' '}
          <em>
            <InkScribble>examiner</InkScribble>
          </em>{' '}
          just left the room.
          <MarginNote style={{ top: '-44px', right: '-10px' }}>this step earns M1!</MarginNote>
        </h1>
        <p className="ms-lead ms-hero-lead">
          Type it or photograph the page. Green for marks earned. Crimson where they slipped.
          Real scheme codes in your margins — then Max rebuilds the path around every leak.
        </p>
        <div className="ms-hero-ctas">
          <LoadingLink
            href={markHref}
            className="ec-btn-primary brand-pulse"
            loadingText="Opening mark…"
            onNavigate={() => trackFunnelEvent('mark_cta_clicked', { source: 'home_hero' })}
          >
            {CTA_MARK}
          </LoadingLink>
          {/* One dominant CTA — the other paths stay quiet text links so the
              primary action doesn't compete with two more buttons.

              This one pointed at /pricing#plans, which asks a first-time visitor
              to weigh plans before they have seen what the paid half does. /demo
              is a worked example account — mastery map, gap drills, weekly
              report, Vault — i.e. the coach, which is what paid actually sells.
              It was reachable only from /pricing, the post-mark result, and a
              Max teaser: all downstream of someone who has already marked or
              already priced. Pricing stays one tap away in the nav. */}
          <LoadingLink href="/demo" className="ec-btn-underline" loadingText="Loading demo…">
            See the full product
          </LoadingLink>
          <LoadingLink href="/courses" className="ec-btn-underline" loadingText="Loading courses…">
            Free courses
          </LoadingLink>
        </div>
        <p className="ms-micro ms-hero-micro">
          ONE QUESTION · REAL SCHEME · NO CARD · KEEP THE INK
        </p>
      </div>
      <div className="ms-fade-in ms-stag-2">
        <LandingHeroSheet />
      </div>
    </section>
  )
}
