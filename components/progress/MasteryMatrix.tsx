'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { ChevronDown, ChevronRight, Grid3X3 } from 'lucide-react'
import {
  MASTERY_STYLES,
  formatParentLeafBreakdown,
  type AttemptLite,
  type LeafMastery,
  type ParentMastery,
} from '@/lib/mastery'
import { EmptyState } from './EmptyState'

type Props = {
  parentMasteries: ParentMastery[]
  attempts: AttemptLite[]
  hasAnyData: boolean
  subjectCode: string
  subjectLabel?: string
  emptyBanner?: boolean
}

function chipClass(level: LeafMastery['level']): string {
  switch (level) {
    case 'exam_ready':
      return 'ec-chip ec-chip-success'
    case 'proficient':
      return 'ec-chip ec-chip-warning'
    case 'critical':
      return 'ec-chip ec-chip-critical'
    case 'sampled':
      return 'ec-chip ec-chip-sampled'
    default:
      return 'ec-chip ec-chip-neutral'
  }
}

export function MasteryMatrix({
  parentMasteries,
  attempts,
  hasAnyData,
  subjectCode,
  subjectLabel,
  emptyBanner = false,
}: Props) {
  const [selected, setSelected] = useState<LeafMastery | null>(null)
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set())

  const isMathFlat = subjectCode === '9709'

  const papers = useMemo(() => {
    const seen = new Set<string>()
    const ordered: string[] = []
    const order = ['P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'AS', 'A2']
    for (const p of order) {
      if (parentMasteries.some((m) => m.paper === p)) {
        seen.add(p)
        ordered.push(p)
      }
    }
    for (const m of parentMasteries) {
      if (!seen.has(m.paper)) {
        seen.add(m.paper)
        ordered.push(m.paper)
      }
    }
    return ordered
  }, [parentMasteries])

  const byPaper = useMemo(() => {
    const map = new Map<string, ParentMastery[]>()
    for (const paper of papers) map.set(paper, [])
    for (const m of parentMasteries) {
      map.get(m.paper)?.push(m)
    }
    return map
  }, [parentMasteries, papers])

  const toggleParent = (code: string) => {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(code)) next.delete(code)
      else next.add(code)
      return next
    })
  }

  if (parentMasteries.length === 0) {
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
      <section id="mastery-matrix" className="ec-card-premium p-5 sm:p-7">
        {emptyBanner && (
          <div className="ec-banner-info-inline mb-5 rounded-xl px-4 py-3 text-sm">
            Mark questions in{' '}
            <strong>{subjectLabel || subjectCode}</strong>{' '}
            to start filling this in. Every topic you touch will appear here.
          </div>
        )}
        <div className="mb-5 flex items-center gap-2">
          <Grid3X3 className="h-4 w-4 ec-text-brand" />
          <p className="ec-label-tech">MASTERY MATRIX</p>
        </div>
        <h2 className="text-2xl font-bold tracking-tight">Topic-by-topic strength</h2>
        <p className="mt-1 text-sm ec-text-secondary">
          {isMathFlat
            ? 'Each topic is scored independently. Tap for attempt history.'
            : 'Expand a section to see leaf-level mastery. One tagged question affects only that leaf.'}
        </p>

        <div className="mt-6 space-y-6">
          {papers.map((paper) => {
            const parents = byPaper.get(paper) || []
            if (parents.length === 0) return null
            return (
              <div key={paper}>
                <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider">
                  <span className="ec-text-gradient">{paper}</span>
                  <span className="ml-2 font-normal normal-case ec-text-secondary">
                    {parents[0]?.paperName}
                  </span>
                </h3>
                <div className="space-y-2">
                  {parents.map((parent) => {
                    const style = MASTERY_STYLES[parent.level]
                    const isOpen =
                      expanded.has(parent.code) ||
                      (isMathFlat && parent.leaves.length <= 1)
                    const singleLeaf =
                      isMathFlat && parent.leaves.length === 1
                    const leaf = parent.leaves[0]

                    if (singleLeaf && leaf) {
                      const leafStyle = MASTERY_STYLES[leaf.level]
                      return (
                        <button
                          key={parent.code}
                          type="button"
                          onClick={() => setSelected(leaf)}
                          className={`flex w-full items-center gap-2 rounded-xl border ec-border-color px-3 py-2.5 text-left transition-all hover:-translate-y-0.5 ${chipClass(leaf.level)}`}
                          title={`${leaf.name} — ${leafStyle.label}`}
                        >
                          <span
                            className={`h-2 w-2 shrink-0 rounded-full ${leafStyle.dot}`}
                          />
                          <span className="font-mono text-xs opacity-70">
                            {leaf.code}
                          </span>
                          <span className="flex-1 truncate text-sm font-medium">
                            {leaf.name}
                          </span>
                          <span className="text-xs font-semibold">
                            {leaf.attemptsCount > 0
                              ? `${Math.round(leaf.percentage)}%`
                              : leafStyle.label}
                          </span>
                        </button>
                      )
                    }

                    return (
                      <div
                        key={parent.code}
                        className="overflow-hidden rounded-xl border ec-border-color"
                      >
                        <button
                          type="button"
                          onClick={() => toggleParent(parent.code)}
                          className="flex w-full items-center gap-3 px-3 py-3 text-left transition-colors hover:bg-[var(--ec-brand-muted)]"
                        >
                          {isOpen ? (
                            <ChevronDown className="h-4 w-4 shrink-0 text-[var(--ec-text-secondary)]" />
                          ) : (
                            <ChevronRight className="h-4 w-4 shrink-0 text-[var(--ec-text-secondary)]" />
                          )}
                          <span
                            className={`h-2 w-2 shrink-0 rounded-full ${style.dot}`}
                          />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold">
                              {parent.name}
                            </p>
                            <p className="mt-0.5 truncate text-xs ec-text-secondary">
                              {formatParentLeafBreakdown(parent.leafCounts)}
                            </p>
                          </div>
                          <span className={`shrink-0 text-xs ${chipClass(parent.level)}`}>
                            {style.label}
                          </span>
                        </button>
                        {isOpen && (
                          <div className="flex flex-wrap gap-2 border-t ec-border-color px-3 py-3">
                            {parent.leaves.map((leaf) => {
                              const leafStyle = MASTERY_STYLES[leaf.level]
                              return (
                                <button
                                  key={leaf.code}
                                  type="button"
                                  onClick={() => setSelected(leaf)}
                                  className={`${chipClass(leaf.level)} transition-all duration-300 hover:-translate-y-0.5`}
                                  title={`${leaf.name} — ${leafStyle.label} (${leaf.attemptsCount} attempts)`}
                                >
                                  <span
                                    className={`h-1.5 w-1.5 rounded-full ${leafStyle.dot}`}
                                  />
                                  <span className="font-mono opacity-70">
                                    {leaf.code}
                                  </span>
                                  <span className="max-w-[140px] truncate">
                                    {leaf.name}
                                  </span>
                                  {leaf.attemptsCount > 0 && (
                                    <span className="opacity-80">
                                      {Math.round(leaf.percentage)}%
                                    </span>
                                  )}
                                </button>
                              )
                            })}
                          </div>
                        )}
                      </div>
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
  topic: LeafMastery
  attempts: AttemptLite[]
  onClose: () => void
}) {
  const style = MASTERY_STYLES[topic.level]

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
    >
      <div
        className="absolute inset-0 ec-modal-backdrop"
        onClick={onClose}
      />
      <div className="ec-card relative w-full max-w-lg overflow-hidden p-6">
        <p className="ec-label-tech mb-2">{topic.code}</p>
        <h3 className="text-xl font-bold">{topic.name}</h3>
        <p className="mt-1 text-sm ec-text-secondary">
          {topic.parent.name} · {topic.paperName} ·{' '}
          <span className={chipClass(topic.level)}>{style.label}</span>
        </p>
        {topic.level === 'sampled' && (
          <p className="mt-2 text-xs text-[var(--ec-chip-sampled-text)]">
            Only {topic.attemptsCount} attempt
            {topic.attemptsCount === 1 ? '' : 's'} so far — mark 2+ more on this
            leaf to confirm mastery.
          </p>
        )}

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
                className="flex items-center justify-between rounded-lg border ec-border-color px-3 py-2"
              >
                <span className="ec-text-secondary">
                  {new Date(a.created_at).toLocaleDateString()}
                </span>
                <span className="font-semibold">
                  {a.marks_earned}/{a.total_marks}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-4 text-sm ec-text-secondary">
            No attempts tagged to this leaf yet.
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
    <div className="rounded-xl border ec-border-color ec-bg-surface-raised px-2 py-3">
      <p className="text-[10px] font-semibold uppercase tracking-wider ec-text-secondary">
        {label}
      </p>
      <p className="mt-1 text-lg font-bold">{value}</p>
    </div>
  )
}
