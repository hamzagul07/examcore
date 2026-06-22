import Link from 'next/link'
import type { ExamRoomFeed, FeedItem } from '@/lib/community/feed'
import { CommunityBrowser, type BrowserSubject } from '@/components/community/CommunityBrowser'

function FeedSection({ title, sub, items }: { title: string; sub?: string; items: FeedItem[] }) {
  if (!items.length) return null
  return (
    <section className="exam-room-section">
      <h2>{title}</h2>
      {sub ? <p className="exam-room-section-sub">{sub}</p> : null}
      <ul className="exam-room-feed">
        {items.map((item) => (
          <li key={`${item.kind}-${item.id}`}>
            <Link href={item.href} className="exam-room-card">
              {item.anchor ? <span className="exam-room-anchor">{item.anchor}</span> : null}
              <div className="exam-room-card-title">{item.title}</div>
              <div className="exam-room-card-meta">{item.meta}</div>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}

type Props = {
  feed: ExamRoomFeed
  cambridge: BrowserSubject[]
  ib: BrowserSubject[]
  signedIn?: boolean
  initialSubjectId?: string
  askOpen?: boolean
  questionId?: string | null
}

export function ExamRoomHome({
  feed,
  cambridge,
  ib,
  signedIn,
  initialSubjectId,
  askOpen,
  questionId,
}: Props) {
  return (
    <div className="exam-room-home">
      <FeedSection
        title={signedIn ? 'Your subjects' : 'Latest doubts'}
        sub={signedIn ? 'Recent activity in subjects on your profile.' : 'Recently asked across Cambridge & IB.'}
        items={feed.yourSubjects}
      />
      <FeedSection
        title="You can help"
        sub="Unanswered doubts waiting for someone who knows the topic."
        items={feed.youCanHelp}
      />
      <FeedSection
        title="Might help you"
        sub="Answered threads other students found useful."
        items={feed.mightHelpYou}
      />
      <FeedSection
        title="Trending cheat sheets"
        sub="Top-voted notes this week."
        items={feed.trendingNotes}
      />
      <section className="exam-room-section">
        <h2>Browse by subject</h2>
        <p className="exam-room-section-sub">Pick a subject to read, ask, or contribute.</p>
        <CommunityBrowser
          cambridge={cambridge}
          ib={ib}
          initialSubjectId={initialSubjectId}
          askOpen={askOpen}
          questionId={questionId}
        />
      </section>
    </div>
  )
}
