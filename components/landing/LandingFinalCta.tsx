import Link from 'next/link'
import { LoadingLink } from '@/components/ui/LoadingLink'
import { InkScribble } from '@/components/margin-notes'

interface LandingFinalCtaProps {
  markHref: string
}

export function LandingFinalCta({ markHref }: LandingFinalCtaProps) {
  return (
    <section className="ms-pg ms-sec">
      <div className="ms-final-cta ec-page-mesh ec-page-mesh--dual">
        <h2
          className="ms-h2"
          style={{ fontSize: 'clamp(34px, 4.5vw, 52px)', textAlign: 'center' }}
        >
          Try one question.{' '}
          <em>
            <InkScribble>About a minute.</InkScribble>
          </em>
        </h2>
        <p className="ms-lead" style={{ margin: '18px auto 34px', textAlign: 'center', fontWeight: 500 }}>
          No card, no commitment. Mark a question, browse free courses, or join a subject
          discussion in Exam Room.
        </p>
        <div className="ms-cta-row ms-cta-row--center">
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
        <p className="ms-micro" style={{ marginTop: 26 }}>
          7-DAY FREE TRIAL · NO CARD · FREE PLAN FOREVER
        </p>
      </div>
    </section>
  )
}
