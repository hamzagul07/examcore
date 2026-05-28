'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { Grid3X3 } from 'lucide-react'
import {
  MASTERY_STYLES,
  type AttemptLite,
  type TopicMastery,
} from '@/lib/mastery'
import { CAMBRIDGE_9709_SYLLABUS, type SyllabusPaper } from '@/lib/syllabus'
import { EmptyState } from './EmptyState'

type Props = {
  masteries: TopicMastery[]
  attempts: AttemptLite[]
  hasAnyData: boolean
}

const PAPERS: SyllabusPaper[] = ['P1', 'P2', 'P3', 'P4', 'P5', 'P6']

function chipClass(level: TopicMastery['level']): string {
  switch (level) {
    case 'exam_ready':
      return 'ec-chip ec-chip-success'
    case 'proficient':
      return 'ec-chip ec-chip-warning'
    case 'critical':
      return 'ec-chip ec-chip-critical'
    default:
      return 'ec-chip ec-chip-neutral'
  }
}

export function MasteryMatrix({ masteries, attempts, hasAnyData }: Props) {
  const [selected, setSelected] = useState<TopicMastery | null>(null)

  const byPaper = useMemo(() => {
    const map = new Map<SyllabusPaper, TopicMastery[]>()
    for (const paper of PAPERS) map.set(paper, [])
    for (const m of masteries) {
      map.get(m.paper)?.push(m)
    }
    return map
  }, [masteries])

  if (!hasAnyData) {
    return (
      <section className="ec-card-premium p-5 sm:p-7">
        <EmptyState
          icon={Grid3X3}
          title="Mastery matrix"
          body="Mark questions to see your topic-by-topic strength."
          inline
        />
      </section>
    )
  }

  return (
    <>
      <section className="ec-card-premium p-5 sm:p-7">
        <div className="mb-5 flex items-center gap-2">
          <Grid3X3 className="h-4 w-4" style={{ color: 'var(--ec-brand)' }} />
          <p className="ec-label-tech">MASTERY MATRIX</p>
        </div>
        <h2 className="text-2xl font-bold tracking-tight">Topic-by-topic strength</h2>
        <p className="mt-1 text-sm" style={{ color: 'var(--ec-text-secondary)' }}>
          Tap a topic to see recent attempts. Colors map to exam readiness.
        </p>

        <div className="mt-6 space-y-6">
          {PAPERS.map((paper) => {
            const topics = byPaper.get(paper) || []
            if (topics.length === 0) return null
            return (
              <div key={paper}>
                <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider">
                  <span className="ec-text-gradient">{paper}</span>
                  <span className="ml-2 font-normal normal-case" style={{ color: 'var(--ec-text-secondary)' }}>
                    {topics[0]?.paperName}
                  </span>
                </h3>
                <div className="flex flex-wrap gap-2">
                  {topics.map((topic) => {
                    const style = MASTERY_STYLES[topic.level]
                    return (
                      <button
                        key={topic.code}
                        type="button"
                        onClick={() => setSelected(topic)}
                        className={`${chipClass(topic.level)} transition-all duration-300 hover:-translate-y-0.5`}
                        title={`${topic.name} — ${style.label}`}
                      >
                        <span className={`h-1.5 w-1.5 rounded-full ${style.dot}`} />
                        <span className="font-mono opacity-70">{topic.code}</span>
                        <span>{Math.round(topic.percentage)}%</span>
                      </button>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {selected && (
        <TopicDetailModal
          topic={selected}
          attempts={attempts.filter((a) =>
            (a.syllabus_tags || []).includes(selected.code)
          )}
          onClose={() => setSelected(null)}
        />
      )}
    </>
  )
}

function TopicDetailModal({
  topic,
  attempts,
  onClose,
}: {
  topic: TopicMastery
  attempts: AttemptLite[]
  onClose: () => void
}) {
  const meta = CAMBRIDGE_9709_SYLLABUS.find((t) => t.code === topic.code)
  const style = MASTERY_STYLES[topic.level]

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="ec-card relative w-full max-w-lg overflow-hidden p-6">
        <p className="ec-label-tech mb-2">{topic.code}</p>
        <h3 className="text-xl font-bold">{topic.name}</h3>
        <p className="mt-1 text-sm" style={{ color: 'var(--ec-text-secondary)' }}>
          {meta?.paperName} ·{' '}
          <span className={chipClass(topic.level)}>{style.label}</span>
        </p>

        <div className="mt-4 grid grid-cols-3 gap-3 text-center">
          <Stat label="Score" value={`${Math.round(topic.percentage)}%`} />
          <Stat label="Attempts" value={String(topic.attemptsCount)} />
          <Stat
            label="Marks"
            value={`${topic.totalMarksEarned}/${topic.totalMarksAvailable}`}
          />
        </div>

        {attempts.length > 0 ? (
          <ul className="mt-4 max-h-48 space-y-2 overflow-y-auto text-sm">
            {attempts.slice(0, 8).map((a) => (
              <li
                key={a.id}
                className="flex items-center justify-between rounded-lg border px-3 py-2"
                style={{ borderColor: 'var(--ec-border)' }}
              >
                <span style={{ color: 'var(--ec-text-secondary)' }}>
                  {new Date(a.created_at).toLocaleDateString()}
                </span>
                <span className="font-semibold">
                  {a.marks_earned}/{a.total_marks}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-4 text-sm" style={{ color: 'var(--ec-text-secondary)' }}>
            No attempts tagged to this topic yet.
          </p>
        )}

        <Link
          href="/mark"
          className="ec-btn-primary mt-5 w-full justify-center"
          onClick={onClose}
        >
          Practice this topic
        </Link>
      </div>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div
      className="rounded-xl border px-2 py-3"
      style={{ borderColor: 'var(--ec-border)', background: 'var(--ec-surface-raised)' }}
    >
      <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--ec-text-secondary)' }}>
        {label}
      </p>
      <p className="mt-1 text-lg font-bold">{value}</p>
    </div>
  )
}
