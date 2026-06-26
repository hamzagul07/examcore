import Link from 'next/link'
import { LoadingLink } from '@/components/ui/LoadingLink'
import { Chip } from '@/components/margin-notes'
import { capForTier } from '@/lib/billing/caps'
import { isCommunityEnabled } from '@/lib/community/enabled'

type PillarId = 'mark' | 'learn' | 'discuss'

type Pillar = {
  id: PillarId
  glyph: string
  kicker: string
  title: string
  body: string
  bullets: string[]
  href: string
  cta: string
  featured?: boolean
  anchorId: string
  secondaryHref?: string
  secondaryCta?: string
  community?: boolean
}

const PLATFORM_STATS = [
  { value: '15+', label: 'Syllabuses' },
  { value: 'B1·M1·A1', label: 'Real codes' },
  { value: '~60s', label: 'To feedback' },
  { value: 'Free', label: 'Tier to start' },
] as const

const FLOW_STEPS = [
  { id: 'mark', label: 'Mark', desc: 'Upload & score' },
  { id: 'learn', label: 'Learn', desc: 'Syllabus lessons' },
  { id: 'discuss', label: 'Discuss', desc: 'Subject rooms' },
] as const

const PILLARS: Pillar[] = [
  {
    id: 'mark',
    glyph: '✓',
    kicker: 'Mark',
    title: 'Past-paper marking',
    body: 'Upload a photo of your handwritten answer — or an entire paper. We pull the real Cambridge mark scheme for that question and score every line of working. Not a chatbot guess.',
    bullets: [
      "Examiner's Ink — stamps and margin notes on your handwriting",
      'B1 / M1 / A1 step marks, MCQ keys, and essay band descriptors',
      'Single questions or whole papers with projected grades',
      'Photos, camera, and multi-page PDF uploads',
    ],
    href: '/mark',
    cta: 'Mark a question — free',
    featured: true,
    anchorId: 'marking-detail',
  },
  {
    id: 'learn',
    glyph: '📚',
    kicker: 'Learn',
    title: 'Free syllabus courses',
    body: 'Every lesson follows your board\'s syllabus order — theory, diagrams, flashcards, then one tap into marking a real past-paper question for that exact point.',
    bullets: [
      'Notes, formulas, and worked examples for every syllabus point',
      'Live interactive diagrams and concept maps (Pro trial)',
      'Past-paper practice, flashcards, and quick-check quizzes',
      'Cambridge A-Level, O-Level, and IB Diploma HL/SL',
    ],
    href: '/courses',
    cta: 'Browse courses',
    anchorId: 'courses-detail',
  },
  {
    id: 'discuss',
    glyph: '💬',
    kicker: 'Discuss',
    title: 'Exam Room',
    body: 'Reddit-style communities with separate boards for Cambridge A-Level and IB Diploma — pick your board, then your subject room.',
    bullets: [
      'Board → subject → post (e.g. s/9702, s/math-aa-hl)',
      'Discussions, doubts, and resources with PDF & image attachments',
      'Upvote, threaded replies, Hot / New / Top feeds',
    ],
    href: '/community',
    cta: 'Open Exam Room',
    secondaryHref: '/community/submit',
    secondaryCta: 'Start a post',
    community: true,
    anchorId: 'community-detail',
  },
]

const DISCUSS_FLOW = [
  { step: '1', title: 'Choose board', desc: 'Cambridge A-Level or IB Diploma' },
  { step: '2', title: 'Pick subject', desc: '9702 Physics, Math AA HL, and more' },
  { step: '3', title: 'Post & reply', desc: 'Upvote, thread comments, attach files' },
]

const LEARN_FEATURES = [
  { icon: '📝', label: 'Notes' },
  { icon: '◇', label: 'Diagrams' },
  { icon: '🃏', label: 'Flashcards' },
  { icon: '→', label: 'Mark link' },
]

const POST_TYPES = ['Discussion', 'Question', 'Resource'] as const

export function LandingPillars() {
  const communityLive = isCommunityEnabled()
  const freeCap = capForTier('free')

  return (
    <section
      id="platform"
      className="ms-pg ms-platform-unified ec-section-tint"
      aria-label="What MarkScheme offers"
    >
      <p className="ms-overline">The platform</p>
      <h2 className="ms-h2 ms-pillars-heading">
        Mark. Learn. <em>Discuss.</em>
      </h2>
      <p className="ms-lead ms-pillars-lead">
        One place for examiner-style feedback, free syllabus courses, and subject communities —
        built for Cambridge A-Level, O-Level, and IB Diploma students.
      </p>

      <div className="ms-platform-stats" aria-label="Platform highlights">
        {PLATFORM_STATS.map((stat) => (
          <div key={stat.label} className="ms-platform-stat">
            <b>{stat.value}</b>
            <span>{stat.label}</span>
          </div>
        ))}
      </div>

      <div className="ms-platform-flow" aria-hidden>
        {FLOW_STEPS.map((step, i) => (
          <div key={step.id} className="ms-platform-flow-item">
            <span className={`ms-platform-flow-dot ms-platform-flow-dot--${step.id}`}>
              {step.label}
            </span>
            <span className="ms-platform-flow-desc">{step.desc}</span>
            {i < FLOW_STEPS.length - 1 ? (
              <span className="ms-platform-flow-arrow" aria-hidden>
                →
              </span>
            ) : null}
          </div>
        ))}
      </div>

      <div className="ms-pillars ms-pillars--unified">
        {PILLARS.map((pillar) => {
          const discussOff = pillar.community && !communityLive

          return (
            <article
              key={pillar.id}
              id={pillar.anchorId}
              className={`ms-pillar ec-card ms-pillar--${pillar.id}${pillar.featured ? ' ms-pillar--featured' : ''}`}
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

              {pillar.id === 'mark' ? (
                <div className="ms-pillar-extras">
                  <div className="ms-detail-chips">
                    <Chip variant="ok">M1 ✓</Chip>
                    <Chip variant="no">A0 ✗</Chip>
                    <Chip variant="outline">9709/12 · Q7(b)</Chip>
                  </div>
                  <p className="ms-pillar-foot">
                    Free tier: {freeCap} questions/month, no card. Whole-paper marking on paid plans.
                  </p>
                </div>
              ) : null}

              {pillar.id === 'learn' ? (
                <div className="ms-pillar-extras">
                  <div className="ms-pillar-feature-row">
                    {LEARN_FEATURES.map((f) => (
                      <span key={f.label} className="ms-pillar-feature-pill">
                        <span aria-hidden>{f.icon}</span> {f.label}
                      </span>
                    ))}
                  </div>
                  <div className="ms-detail-boards">
                    <span className="ms-detail-board-tag ms-detail-board-tag--caie">Cambridge A-Level</span>
                    <span className="ms-detail-board-tag ms-detail-board-tag--caie">O-Level</span>
                    <span className="ms-detail-board-tag ms-detail-board-tag--ib">IB Diploma</span>
                  </div>
                  <p className="ms-pillar-foot">
                    Notes and worked examples are free forever. Live diagrams unlock with Pro trial or
                    paid plan.
                  </p>
                </div>
              ) : null}

              {pillar.id === 'discuss' ? (
                <div className="ms-pillar-extras">
                  <div className="ms-community-flow ms-community-flow--compact">
                    {DISCUSS_FLOW.map((item) => (
                      <div key={item.step} className="ms-community-flow-step">
                        <span className="ms-community-flow-num">{item.step}</span>
                        <div>
                          <strong>{item.title}</strong>
                          <p>{item.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="ms-pillar-post-types">
                    {POST_TYPES.map((type) => (
                      <span key={type} className="ms-pillar-post-type">
                        {type}
                      </span>
                    ))}
                  </div>
                  <p className="ms-pillar-foot">
                    {discussOff
                      ? 'Exam Room is rolling out now — preview the layout and subject rooms.'
                      : 'Free for everyone. Pick a username and start posting.'}
                  </p>
                </div>
              ) : null}

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
                {pillar.id === 'mark' ? (
                  <Link href="#how-it-works" className="ec-btn-underline" style={{ fontSize: 14 }}>
                    How marking works ↓
                  </Link>
                ) : null}
                {pillar.id === 'learn' ? (
                  <Link href="#courses" className="ec-btn-underline" style={{ fontSize: 14 }}>
                    Course preview ↓
                  </Link>
                ) : null}
                {pillar.secondaryHref && communityLive ? (
                  <Link href={pillar.secondaryHref} className="ec-btn-underline" style={{ fontSize: 14 }}>
                    {pillar.secondaryCta} →
                  </Link>
                ) : null}
                {pillar.id === 'discuss' && communityLive ? (
                  <Link href="/community/guidelines" className="ec-btn-underline" style={{ fontSize: 14 }}>
                    Guidelines →
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
