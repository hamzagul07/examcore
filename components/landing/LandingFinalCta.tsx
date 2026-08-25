import { CTA_MARK } from '@/lib/copy/product-lexicon'
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
          {/* "a desk, a Cinema beat, and a Sunday coach" was three internal
              names with no definitions in the closing pitch. Plain benefits
              here; the names get introduced with their gloss on /pricing. */}
          <p className="ms-lead ms-final-cta__lead">
            The stamp lands. The leak appears. Suddenly revision has a target — and Max builds
            the plan around it: a revision desk per subject, animated concept replays, a weekly
            coach email. Start free. Keep every script.
          </p>
          <div className="ms-cta-row ms-cta-row--center ms-final-cta__actions">
            <LoadingLink
              href={markHref}
              prefetch={false}
              className="ec-btn-primary brand-pulse"
              loadingText="Opening mark…"
            >
              {CTA_MARK}
            </LoadingLink>
            <LoadingLink href="/pricing#plans" className="ec-btn-ghost ec-btn-ghost--sm">
              Unlock Max
            </LoadingLink>
            <LoadingLink href="/courses" prefetch={false} className="ec-btn-ghost ec-btn-ghost--sm">
              Free courses
            </LoadingLink>
          </div>
          <p className="ms-micro ms-final-cta__micro">
            NO CARD · KEEP THE SCRIPT · CANCEL ANY TIME
          </p>
        </div>

        <div className="ms-final-cta__sheet" aria-hidden>
          {/* Was top-right — exactly where ExamSheet renders its tally chip, so
              the handwriting collided with "? / ?" at desktop widths. The
              sheet's top-left corner is empty. */}
          <MarginNote className="ms-final-cta__note" style={{ top: '-24px', left: '6%' }}>
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
