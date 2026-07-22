import { GradeTargetTrack } from '@/components/dashboard/GradeTargetTrack'
import { buildGradeTarget } from '@/lib/dashboard/grade-target'

export const metadata = {
  title: 'Grade target — dev',
  robots: { index: false, follow: false },
}

const NOW = new Date('2026-07-22T09:00:00Z')

function marks(pcts: number[]) {
  return pcts.map((p, i) => {
    const d = new Date(NOW)
    d.setUTCDate(d.getUTCDate() - i)
    return { marks_earned: p, total_marks: 100, created_at: d.toISOString() }
  })
}

const CASES = [
  {
    title: 'Chasing an A, six points short, exam in the autumn',
    attempts: marks([64, 66, 62, 68, 61]),
    targetGrade: 'A',
    examDate: '2026-09-01',
  },
  {
    title: 'Ahead of target',
    attempts: marks([88, 84, 91]),
    targetGrade: 'A',
    examDate: '2026-08-10',
  },
  {
    title: 'No target set — the prompt is the point',
    attempts: marks([57, 61, 54]),
    targetGrade: null,
    examDate: null,
  },
  {
    title: 'IB numeric target — no invented percentage boundary',
    attempts: marks([72, 69]),
    targetGrade: '7',
    examDate: '2026-11-02',
  },
  {
    title: 'Single mark — labelled as early',
    attempts: marks([48]),
    targetGrade: 'C',
    examDate: null,
  },
]

export default function GradePreviewPage() {
  return (
    <div className="mx-auto max-w-[880px] px-4 py-10">
      <h1 className="ms-h2 mb-2">Grade target track</h1>
      <p className="ms-body-2 mb-8 text-[var(--ec-text-secondary)]">
        Fixture states, pinned to 2026-07-22.
      </p>
      {CASES.map((c) => {
        const data = buildGradeTarget({
          attempts: c.attempts,
          targetGrade: c.targetGrade,
          examDate: c.examDate,
          now: NOW,
        })
        return (
          <div key={c.title} className="mb-8">
            <p className="ec-eyebrow mb-3">{c.title}</p>
            {data ? <GradeTargetTrack data={data} /> : <p>renders nothing</p>}
          </div>
        )
      })}
    </div>
  )
}
