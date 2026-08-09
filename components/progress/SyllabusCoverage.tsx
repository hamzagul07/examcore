import {
  countMasteries,
  MASTERY_STYLES,
  type LeafMastery,
} from '@/lib/mastery'
import { Card } from '@/components/ui/Card'
import { Progress } from '@/components/ui/Progress'
import { AnimatedCoverageNumber } from './SyllabusCoverage.client'

type Props = {
  masteries: LeafMastery[]
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
      variant="solid"
      padding="lg"
      className="ms-syllabus-coverage ms-dash-card relative overflow-hidden border-[color-mix(in_srgb,var(--ec-brand)_35%,var(--ec-border))]"
    >

      <div className="relative">
        <div className="mb-6 flex items-center gap-2">
          <span
            className="inline-grid h-5 min-w-5 place-items-center rounded border border-[var(--ec-brand-border)] bg-[var(--ec-brand-muted)] px-1 font-mono text-[10px] font-bold tracking-wide text-[var(--ec-brand)]"
            aria-hidden
          >
            ¶
          </span>
          <p className="ms-overline" style={{ marginBottom: 0 }}>Syllabus coverage</p>
        </div>

        <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="flex items-baseline gap-3">
              <AnimatedCoverageNumber value={pct} />
              <span className="text-3xl font-bold text-[var(--ec-text-secondary)] sm:text-4xl">%</span>
            </div>
            <p className="mt-3 max-w-md ms-body-2 font-medium text-[var(--ec-text-primary)]">
              {subjectLabel} syllabus mastered
            </p>
            <p className="mt-1 text-sm text-[var(--ec-text-secondary)]">
              {hasAnyData ? (
                <>
                  {mastered} of {totalTopics} leaves at{' '}
                  <span className="font-semibold text-[var(--ec-text-secondary)]">
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
          <div className="mt-2 flex justify-between font-mono text-[10px] font-semibold uppercase tracking-wider text-[var(--ec-text-secondary)]">
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
    { key: 'sampled', label: 'Sampled' },
    { key: 'critical', label: 'Critical' },
    { key: 'unattempted', label: 'Unattempted' },
  ]
  return (
    <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-5 sm:gap-3">
      {items.map(({ key, label }) => {
        const style = MASTERY_STYLES[key]
        return (
          <div
            key={key}
            className="ec-card ec-card--paper border border-[var(--ec-border)] bg-[var(--ec-paper,var(--ec-surface-raised))] px-3 py-3 text-center"
          >
            <div className="flex items-center justify-center gap-1.5">
              <span className={`h-2 w-2 rounded-[2px] ${style.dot}`} />
              <span className="font-mono text-[10px] font-semibold uppercase tracking-wider text-[var(--ec-text-secondary)]">
                {label}
              </span>
            </div>
            <div className="mt-1 text-2xl font-semibold tracking-tight text-[var(--ec-text-primary)]">
              {counts[key]}
            </div>
          </div>
        )
      })}
    </div>
  )
}
