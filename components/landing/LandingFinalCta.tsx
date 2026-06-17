import Link from 'next/link'
import { InkScribble } from '@/components/margin-notes'

interface LandingFinalCtaProps {
  markHref: string
}

export function LandingFinalCta({ markHref }: LandingFinalCtaProps) {
  return (
    <section className="ms-pg ms-sec">
      <div className="ms-final-cta">
        <h2
          className="ms-h2"
          style={{ fontSize: 'clamp(34px, 4.5vw, 52px)', textAlign: 'center' }}
        >
          Try one question.{' '}
          <em>
            <InkScribble>About a minute.</InkScribble>
          </em>
        </h2>
        <p className="ms-lead" style={{ margin: '18px auto 34px', textAlign: 'center' }}>
          No card, no commitment. Mark something you already wrote and see what examiner-style
          feedback looks like.
        </p>
        <Link href={markHref} className="ec-btn-primary">
          Mark your first question
        </Link>
        <p className="ms-micro" style={{ marginTop: 26 }}>
          7-DAY FREE TRIAL · NO CARD · FREE PLAN FOREVER
        </p>
      </div>
    </section>
  )
}
