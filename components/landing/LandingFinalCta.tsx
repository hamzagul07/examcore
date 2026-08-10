import { LoadingLink } from '@/components/ui/LoadingLink'
import {
  ExamSheet,
  ExamSheetLine,
  InkScribble,
  MarginNote,
} from '@/components/margin-notes'
import { MARK_DURATION_SINGLE_SHORT } from '@/lib/copy/product-lexicon'

interface LandingFinalCtaProps {
  markHref: string
}

export function LandingFinalCta({ markHref }: LandingFinalCtaProps) {
  return (
    <section className="ms-pg ms-sec">
      <div className="ms-final-cta ms-final-cta--desk">
        <div className="ms-final-cta__copy">
          <h2 className="ms-h2 ms-final-cta__title">
            One question.{' '}
            <em>
              <InkScribble>Then you can&apos;t unsee it.</InkScribble>
            </em>
          </h2>
          <p className="ms-lead ms-final-cta__lead">
            The stamp lands. The leak appears. Suddenly revision has a target — and Max turns
            that target into a desk, a Cinema beat, and a Sunday coach. Start free. Keep every
            script.
          </p>
          <div className="ms-cta-row ms-cta-row--center ms-final-cta__actions">
            <LoadingLink
              href={markHref}
              className="ec-btn-primary brand-pulse"
              loadingText="Opening mark…"
            >
              Mark one question free
            </LoadingLink>
            <LoadingLink href="/pricing#plans" className="ec-btn-ghost ec-btn-ghost--sm">
              Unlock Max
            </LoadingLink>
            <LoadingLink href="/courses" className="ec-btn-ghost ec-btn-ghost--sm">
              Free courses
            </LoadingLink>
          </div>
          <p className="ms-micro ms-final-cta__micro">
            NO CARD · KEEP THE SCRIPT · CANCEL ANY TIME
          </p>
        </div>

        <div className="ms-final-cta__sheet" aria-hidden>
          <MarginNote className="ms-final-cta__note" style={{ top: '-22px', right: '6%' }}>
            your turn
          </MarginNote>
          <ExamSheet
            head="Blank script — waiting"
            headRight="your paper"
            tally="? / ?"
          >
            <ExamSheetLine work="write or photograph your answer" mark="…" ok stampDelayMs={200} />
            <ExamSheetLine
              work={`stamps land here in ${MARK_DURATION_SINGLE_SHORT}`}
              mark="M1 ✓"
              ok
              stampDelayMs={520}
            />
          </ExamSheet>
        </div>
      </div>
    </section>
  )
}
