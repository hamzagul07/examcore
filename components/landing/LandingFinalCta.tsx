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
            Try one question.{' '}
            <em>
              <InkScribble>About a minute.</InkScribble>
            </em>
          </h2>
          <p className="ms-lead ms-final-cta__lead">
            No card, no commitment. Mark a question and keep the inked script — then browse free
            courses or join Exam Room when you&apos;re ready.
          </p>
          <div className="ms-cta-row ms-cta-row--center ms-final-cta__actions">
            <LoadingLink
              href={markHref}
              className="ec-btn-primary brand-pulse"
              loadingText="Opening mark…"
            >
              Mark your first question
            </LoadingLink>
            <LoadingLink href="/courses" className="ec-btn-ghost ec-btn-ghost--sm">
              Free courses
            </LoadingLink>
            <LoadingLink href="/community" className="ec-btn-ghost ec-btn-ghost--sm">
              Exam Room
            </LoadingLink>
          </div>
          <p className="ms-micro ms-final-cta__micro">
            NO CARD · FREE PLAN FOREVER · CANCEL ANY TIME
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
