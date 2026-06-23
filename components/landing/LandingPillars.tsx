import Link from 'next/link'
import { LoadingLink } from '@/components/ui/LoadingLink'
import { isCommunityEnabled } from '@/lib/community/enabled'

type Pillar = {
  id: 'mark' | 'learn' | 'discuss'
  glyph: string
  kicker: string
  title: string
  body: string
  bullets: string[]
  href: string
  cta: string
  featured?: boolean
  anchor?: string
  secondaryHref?: string
  secondaryCta?: string
  community?: boolean
}

const PILLARS: Pillar[] = [
  {
    id: 'mark',
    glyph: '✓',
    kicker: 'Mark',
    title: 'Past-paper marking',
    body: 'Photograph your script. We score it mark-by-mark against the official scheme — not a chatbot guess.',
    bullets: [
      "Examiner's Ink on your handwriting",
      'B1 / M1 / A1 and essay bands',
      'Single questions or whole papers',
    ],
    href: '/mark',
    cta: 'Mark a question — free',
    featured: true,
  },
  {
    id: 'learn',
    glyph: '📚',
    kicker: 'Learn',
    title: 'Free courses',
    body: 'Syllabus-aligned lessons for Cambridge and IB — theory, practice, then one-click into marking.',
    bullets: [
      'Notes, diagrams & flashcards',
      'Real past-paper Q per topic',
      'A-Level, O-Level & IB HL/SL',
    ],
    href: '/courses',
    cta: 'Browse courses',
    anchor: '#courses',
  },
  {
    id: 'discuss',
    glyph: '💬',
    kicker: 'Discuss',
    title: 'Exam Room',
    body: 'Reddit-style communities with separate boards for Cambridge A-Level and IB Diploma.',
    bullets: [
      'Board → subject → post',
      'Doubts, notes & PDFs',
      'Hot / New / Top feeds',
    ],
    href: '/community',
    cta: 'Open Exam Room',
    secondaryHref: '/community/submit',
    secondaryCta: 'Start a post',
    anchor: '#community',
    community: true,
  },
]

export function LandingPillars() {
  const communityLive = isCommunityEnabled()

  return (
    <section
      id="platform"
      className="ms-pg ms-pillars-wrap ec-section-tint ec-section-tint--mark"
      aria-label="What MarkScheme offers"
    >
      <p className="ms-overline">Three ways to revise</p>
      <h2 className="ms-h2 ms-pillars-heading">
        Mark. Learn. <em>Discuss.</em>
      </h2>
      <p className="ms-lead ms-pillars-lead">
        One platform for examiner-style feedback, free syllabus courses, and subject communities —
        built for Cambridge and IB students.
      </p>
      <div className="ms-pillars">
        {PILLARS.map((pillar) => {
          const discussOff = pillar.community && !communityLive
          return (
            <article
              key={pillar.id}
              className={`ms-pillar ec-card ms-pillar--${pillar.id}${pillar.featured ? ' ms-pillar--featured' : ''}`}
              id={pillar.id === 'mark' ? 'marking' : pillar.id === 'learn' ? 'learn' : 'discuss'}
            >
              <div className="ms-pillar-band">
                <span className="ms-pillar-watermark" aria-hidden>
                  {pillar.glyph}
                </span>
                <div className="ms-pillar-top">
                  <span className="ms-pillar-glyph" aria-hidden>
                    {pillar.glyph}
                  </span>
                  <span className="ms-pillar-kicker">{pillar.kicker}</span>
                  {discussOff ? <span className="ms-pillar-badge">Launching soon</span> : null}
                </div>
              </div>
              <h3 className="ms-h3">{pillar.title}</h3>
              <p className="ms-body-2">{pillar.body}</p>
              <ul className="ms-pillar-bullets">
                {pillar.bullets.map((b) => (
                  <li key={b}>{b}</li>
                ))}
              </ul>
              <div className="ms-pillar-actions">
                <LoadingLink
                  href={discussOff ? '/community' : pillar.href}
                  className={
                    pillar.featured
                      ? 'ec-btn-primary ec-btn-primary--sm'
                      : 'ec-btn-ghost ec-btn-ghost--sm'
                  }
                  loadingText="Opening…"
                >
                  {discussOff ? 'Preview Exam Room' : pillar.cta}
                </LoadingLink>
                {pillar.secondaryHref && communityLive ? (
                  <Link href={pillar.secondaryHref} className="ec-btn-underline" style={{ fontSize: 14 }}>
                    {pillar.secondaryCta} →
                  </Link>
                ) : null}
                {pillar.anchor && pillar.id !== 'mark' ? (
                  <Link href={pillar.anchor} className="ec-btn-underline" style={{ fontSize: 14 }}>
                    Full detail ↓
                  </Link>
                ) : null}
              </div>
            </article>
          )
        })}
      </div>
    </section>
  )
}
