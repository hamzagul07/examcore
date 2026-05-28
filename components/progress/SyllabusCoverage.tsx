import { Target } from 'lucide-react'
import {
  countMasteries,
  MASTERY_STYLES,
  type TopicMastery,
} from '@/lib/mastery'
import { Card } from '@/components/ui/Card'
import { Progress } from '@/components/ui/Progress'
import { AnimatedCoverageNumber } from './SyllabusCoverage.client'

type Props = {
  masteries: TopicMastery[]
  coverage: number
  hasAnyData: boolean
  subjectLabel: string
  totalTopics: number
}

export function SyllabusCoverage({
  masteries,
  coverage,
  hasAnyData,
  subjectLabel,
  totalTopics,
}: Props) {
  const counts = countMasteries(masteries)
  const mastered = counts.proficient + counts.exam_ready
  const pct = Math.round(coverage)

  return (
    <Card
      variant="brand-glow"
      padding="lg"
      className="relative overflow-hidden"
    >
      <div
        className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-emerald-500/25 blur-[100px]"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute -bottom-20 -left-20 h-56 w-56 rounded-full bg-violet-500/20 blur-[100px]"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute right-1/3 top-1/3 h-48 w-48 rounded-full bg-cyan-500/15 blur-[80px]"
        aria-hidden="true"
      />

      <div className="relative">
        <div className="mb-6 flex items-center gap-2">
          <Target className="h-4 w-4 text-emerald-400" aria-hidden="true" />
          <p className="ec-label-tech">SYLLABUS COVERAGE</p>
        </div>

        <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="flex items-baseline gap-3">
              <AnimatedCoverageNumber value={pct} />
              <span className="text-3xl font-bold text-slate-600 sm:text-4xl">%</span>
            </div>
            <p className="mt-3 max-w-md text-base font-medium text-slate-200 sm:text-lg">
              {subjectLabel} syllabus mastered
            </p>
            <p className="mt-1 text-sm text-slate-500">
              {hasAnyData ? (
                <>
                  {mastered} of {totalTopics} topics at{' '}
                  <span className="font-semibold text-slate-300">
                    Proficient or Exam Ready
                  </span>
                </>
              ) : (
                <>Mark your first questions to start building coverage.</>
              )}
            </p>
          </div>

          <CoverageStats counts={counts} />
        </div>

        <div className="mt-8">
          <Progress
            value={Math.max(2, pct)}
            variant="spectrum"
            size="lg"
            ariaLabel="Syllabus coverage"
          />
          <div className="mt-2 flex justify-between font-mono text-[10px] font-semibold uppercase tracking-wider text-slate-600">
            <span>0%</span>
            <span>50%</span>
            <span>100%</span>
          </div>
        </div>
      </div>
    </Card>
  )
}

function CoverageStats({
  counts,
}: {
  counts: ReturnType<typeof countMasteries>
}) {
  const items: Array<{ key: keyof typeof counts; label: string }> = [
    { key: 'exam_ready', label: 'Exam Ready' },
    { key: 'proficient', label: 'Proficient' },
    { key: 'critical', label: 'Critical' },
    { key: 'unattempted', label: 'Unattempted' },
  ]
  return (
    <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4 sm:gap-3">
      {items.map(({ key, label }) => {
        const style = MASTERY_STYLES[key]
        return (
          <div
            key={key}
            className="rounded-2xl border border-white/10 bg-dark-900/60 px-3 py-3 text-center backdrop-blur"
          >
            <div className="flex items-center justify-center gap-1.5">
              <span className={`h-2 w-2 rounded-full ${style.dot}`} />
              <span className="font-mono text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                {label}
              </span>
            </div>
            <div className="mt-1 text-2xl font-extrabold tracking-tight text-white">
              {counts[key]}
            </div>
          </div>
        )
      })}
    </div>
  )
}
