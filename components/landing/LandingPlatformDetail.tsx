import Link from 'next/link'
import { Chip } from '@/components/margin-notes'
import { capForTier } from '@/lib/billing/caps'
import { isCommunityEnabled } from '@/lib/community/enabled'

const MARK_BULLETS = [
  'Official mark scheme for your exact paper and question number',
  'B1 / M1 / A1 step marks, MCQ keys, and essay band descriptors',
  "Examiner's Ink — stamps and margin notes on your handwriting",
  'Single questions or whole papers with projected grades',
  'Photos, camera, and multi-page PDF uploads',
]

const LEARN_BULLETS = [
  'Notes, formulas, and worked examples for every syllabus point',
  'Live interactive diagrams and concept maps (Pro trial)',
  'Past-paper practice, flashcards, and quick-check quizzes',
  'One real exam question linked per topic — jump straight to marking',
  'Cambridge A-Level, O-Level, and IB Diploma HL/SL courses',
]

const DISCUSS_BULLETS = [
  'Pick Cambridge A-Level or IB Diploma first — separate boards, separate rooms',
  'Every subject is its own subreddit (e.g. s/9702, s/math-aa-hl)',
  'Post discussions, doubts, or resources with PDF and image attachments',
  'Upvote, threaded replies, Hot/New/Top feeds — like Reddit',
  'Grade boundaries chat, IA ideas, cheat sheets, and past-paper help',
]

export function LandingPlatformDetail() {
  const communityLive = isCommunityEnabled()
  const freeCap = capForTier('free')

  return (
    <section className="ms-pg ms-platform-detail-wrap">
      <p className="ms-overline">In depth</p>
      <h2 className="ms-h2">
        Everything you need for <em>exam season</em>
      </h2>
      <p className="ms-lead ms-platform-detail-lead">
        MarkScheme isn&apos;t just a grader. It&apos;s marking tied to real schemes, free syllabus
        courses that link into practice, and student communities split by exam board.
      </p>

      <div className="ms-platform-detail">
        {/* ── Mark ─────────────────────────────────────────────── */}
        <article className="ms-detail-panel ec-card" id="marking-detail">
          <header className="ms-detail-head">
            <span className="ms-detail-icon" aria-hidden>✓</span>
            <div>
              <p className="ms-detail-kicker">Mark</p>
              <h3 className="ms-h3">Past-paper marking</h3>
            </div>
          </header>
          <p className="ms-body-2 ms-detail-intro">
            Upload a photo of your handwritten answer — or an entire paper. We pull the{' '}
            <strong>real Cambridge mark scheme</strong> for that question and score every line of
            working. Not a generic AI grade; criteria cited from the actual MS.
          </p>
          <ul className="ms-detail-list">
            {MARK_BULLETS.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          <div className="ms-detail-chips">
            <Chip variant="ok">M1 ✓</Chip>
            <Chip variant="no">A0 ✗</Chip>
            <Chip variant="outline">9709/12 · Q7(b)</Chip>
          </div>
          <p className="ms-detail-foot">
            Free tier: {freeCap} questions/month, no card. Whole-paper marking on paid plans.
          </p>
          <div className="ms-detail-actions">
            <Link href="/mark" className="ec-btn-primary ec-btn-primary--sm">
              Try marking now
            </Link>
            <Link href="/how-it-works" className="ec-btn-underline" style={{ fontSize: 14 }}>
              Full walkthrough →
            </Link>
          </div>
        </article>

        {/* ── Learn ────────────────────────────────────────────── */}
        <article className="ms-detail-panel ec-card" id="courses-detail">
          <header className="ms-detail-head">
            <span className="ms-detail-icon" aria-hidden>📚</span>
            <div>
              <p className="ms-detail-kicker">Learn</p>
              <h3 className="ms-h3">Free syllabus courses</h3>
            </div>
          </header>
          <p className="ms-body-2 ms-detail-intro">
            Every lesson follows your board&apos;s syllabus order — not random YouTube topics.
            Read the theory, see it diagrammed, practise with flashcards, then hit{' '}
            <strong>Mark this question</strong> on a real past-paper item for that exact point.
          </p>
          <ul className="ms-detail-list">
            {LEARN_BULLETS.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          <div className="ms-detail-boards">
            <span className="ms-detail-board-tag ms-detail-board-tag--caie">Cambridge A-Level</span>
            <span className="ms-detail-board-tag ms-detail-board-tag--caie">O-Level</span>
            <span className="ms-detail-board-tag ms-detail-board-tag--ib">IB Diploma</span>
          </div>
          <p className="ms-detail-foot">
            Notes and worked examples are free forever. Live diagrams and practice unlock with Pro
            trial or paid plan.
          </p>
          <div className="ms-detail-actions">
            <Link href="/courses" className="ec-btn-primary ec-btn-primary--sm">
              Browse courses
            </Link>
            <Link href="/subjects" className="ec-btn-underline" style={{ fontSize: 14 }}>
              All subjects →
            </Link>
          </div>
        </article>

        {/* ── Discuss ──────────────────────────────────────────── */}
        <article className="ms-detail-panel ec-card" id="community-detail">
          <header className="ms-detail-head">
            <span className="ms-detail-icon" aria-hidden>💬</span>
            <div>
              <p className="ms-detail-kicker">Discuss</p>
              <h3 className="ms-h3">Exam Room community</h3>
            </div>
          </header>
          <p className="ms-body-2 ms-detail-intro">
            <strong>Exam Room</strong> is a Reddit-style feed for students. Cambridge and IB are
            kept separate — when you post, you choose your board first, then your subject room.
            No mixing A-Level Physics threads with IB Physics HL.
          </p>
          <ol className="ms-detail-steps">
            <li>
              <strong>Choose board</strong> — Cambridge A-Level or IB Diploma
            </li>
            <li>
              <strong>Pick subject</strong> — e.g. 9702 Physics or Math AA HL
            </li>
            <li>
              <strong>Post</strong> — discussion, doubt, or resource (PDFs &amp; images)
            </li>
          </ol>
          <ul className="ms-detail-list">
            {DISCUSS_BULLETS.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          {!communityLive ? (
            <p className="ms-detail-foot ms-detail-foot--muted">
              Exam Room is rolling out now — preview the layout and subject rooms.
            </p>
          ) : (
            <p className="ms-detail-foot">Free for everyone. Pick a username and start posting.</p>
          )}
          <div className="ms-detail-actions">
            <Link href="/community" className="ec-btn-primary ec-btn-primary--sm">
              {communityLive ? 'Open Exam Room' : 'Preview Exam Room'}
            </Link>
            {communityLive ? (
              <Link href="/community/submit" className="ec-btn-underline" style={{ fontSize: 14 }}>
                Create a post →
              </Link>
            ) : null}
            <Link href="/community/guidelines" className="ec-btn-underline" style={{ fontSize: 14 }}>
              Guidelines →
            </Link>
          </div>
        </article>
      </div>
    </section>
  )
}
