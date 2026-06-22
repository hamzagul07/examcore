import Link from 'next/link'
import { getSubjectLeaderboard } from '@/lib/community/leaderboard'

type Props = {
  subjectCode: string
  subjectName: string
}

export async function SubjectLeaderboard({ subjectCode, subjectName }: Props) {
  const leaders = await getSubjectLeaderboard(subjectCode, 8)
  if (!leaders.length) return null

  return (
    <section className="exam-room-section" style={{ marginTop: 32 }}>
      <h2>Top contributors · {subjectName}</h2>
      <p className="exam-room-section-sub">Subject-scoped reputation — not a global leaderboard.</p>
      <ol className="exam-room-leaderboard">
        {leaders.map((row) => (
          <li key={row.userId} className="exam-room-leader-row">
            <span className="exam-room-leader-rank">{row.rank}</span>
            {row.username ? (
              <Link href={`/u/${row.username}`} className="exam-room-leader-name">
                @{row.username}
              </Link>
            ) : (
              <span className="exam-room-leader-name">Student</span>
            )}
            <span className="exam-room-leader-rep">{row.reputation} rep</span>
          </li>
        ))}
      </ol>
    </section>
  )
}
