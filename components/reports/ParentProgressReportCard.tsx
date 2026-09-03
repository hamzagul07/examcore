import type { ParentProgressReport } from '@/lib/reports/parent-report'

/**
 * The page a student hands to a parent.
 *
 * Written for a reader who has never seen the product, is not the one revising,
 * and wants one question answered: is the work actually happening? So the
 * effort figures lead and the grade talk follows. Nothing here can embarrass
 * its subject — no individual scores, no examiner comments, nothing they wrote
 * — because a report that can embarrass its subject does not get shared, and an
 * unshared report converts nobody.
 *
 * Server-rendered: it is a document, not an app.
 */

function formatMonth(iso: string | null): string | null {
  if (!iso) return null
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return null
  return d.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
}

function plural(n: number, one: string, many = `${one}s`): string {
  return n === 1 ? one : many
}

export function ParentProgressReportCard({
  report,
  studentFirstName,
}: {
  report: ParentProgressReport
  /** First name only, and only when the student chose to include it. */
  studentFirstName?: string | null
}) {
  const since = formatMonth(report.firstMarkedAt)
  const who = studentFirstName?.trim() || null
  const subjectLine = report.subjects
    .slice(0, 4)
    .map((s) => s.label)
    .join(' · ')

  return (
    <article className="ms-parent-report ec-card ec-card--paper mx-auto max-w-xl p-6 sm:p-8">
      <p className="ec-label-tech mb-3">EXAMINER&apos;S INK · PROGRESS REPORT</p>
      <h1 className="text-2xl font-semibold tracking-tight text-[var(--ec-text-primary)] sm:text-3xl">
        The work behind the grade
      </h1>
      <p className="mt-2 font-mono text-xs text-[var(--ec-text-secondary)]">
        {who ? `${who} · ` : ''}
        {subjectLine || 'Exam practice'}
        {since ? ` · since ${since}` : ''}
      </p>

      {/* ── The effort figure ─────────────────────────────────────────────── */}
      <p className="mt-6 text-5xl font-bold tracking-tight text-[var(--ec-brand)]">
        {report.marksCompleted}
      </p>
      <p className="mt-1 text-base font-semibold text-[var(--ec-text-primary)]">
        {plural(report.marksCompleted, 'question')} marked against the official
        mark {plural(report.marksCompleted, 'scheme')}
      </p>

      {report.marksRecent > 0 ? (
        <p className="mt-2 text-sm text-[var(--ec-text-secondary)]">
          {report.marksRecent} in the last 30 days, across{' '}
          <strong className="text-[var(--ec-text-primary)]">
            {report.activeDaysRecent} separate {plural(report.activeDaysRecent, 'day')}
          </strong>
          .
        </p>
      ) : report.marksCompleted > 0 ? (
        <p className="mt-2 text-sm text-[var(--ec-text-secondary)]">
          Nothing marked in the last 30 days.
        </p>
      ) : null}

      {/* ── Standing, only when there is enough to be honest about ────────── */}
      {report.hasEnoughForTrajectory && report.averagePercentage !== null ? (
        <div className="mt-6 grid gap-3 border-t border-dashed border-[var(--ec-border)] pt-5 sm:grid-cols-2">
          <div>
            <p className="ms-micro mb-1">AVERAGE SCORE</p>
            <p className="text-2xl font-bold text-[var(--ec-text-primary)]">
              {report.averagePercentage}%
              {report.averageDelta !== null && Math.abs(report.averageDelta) >= 1 ? (
                <span
                  className="ml-2 align-middle text-sm font-bold"
                  style={{
                    color:
                      report.averageDelta > 0
                        ? 'var(--ec-success, #2f7d4f)'
                        : 'var(--ec-text-secondary)',
                  }}
                >
                  {report.averageDelta > 0 ? '▲' : '▼'}
                  {Math.abs(report.averageDelta)} pts
                </span>
              ) : null}
            </p>
            <p className="ms-micro mt-1">
              {report.averageDelta !== null && Math.abs(report.averageDelta) >= 1
                ? 'against the month before'
                : 'across recent papers'}
            </p>
          </div>

          {report.targetGrade ? (
            <div>
              <p className="ms-micro mb-1">AIMING FOR</p>
              <p className="text-2xl font-bold text-[var(--ec-text-primary)]">
                Grade {report.targetGrade}
              </p>
              <p className="ms-micro mt-1">
                {report.onTrackForTarget
                  ? 'on track on current form'
                  : report.pointsToTarget
                    ? `${report.pointsToTarget} percentage points to go`
                    : 'target set'}
              </p>
            </div>
          ) : report.examDaysLeft !== null ? (
            <div>
              <p className="ms-micro mb-1">FIRST PAPER</p>
              <p className="text-2xl font-bold text-[var(--ec-text-primary)]">
                {report.examDaysLeft} {plural(report.examDaysLeft, 'day')}
              </p>
              <p className="ms-micro mt-1">until the exam</p>
            </div>
          ) : null}
        </div>
      ) : null}

      {/* ── Where the next marks are ──────────────────────────────────────── */}
      {report.weakTopics.length ? (
        <section className="mt-6 border-t border-dashed border-[var(--ec-border)] pt-5">
          <p className="ms-micro mb-3">WHERE THE NEXT MARKS ARE</p>
          <ul className="space-y-2">
            {report.weakTopics.map((t) => (
              <li
                key={`${t.subjectLabel ?? ''}-${t.name}`}
                className="flex items-baseline justify-between gap-4 text-sm"
              >
                <span className="text-[var(--ec-text-primary)]">
                  {t.name}
                  {t.subjectLabel ? (
                    <span className="text-[var(--ec-text-secondary)]"> · {t.subjectLabel}</span>
                  ) : null}
                </span>
                <span className="shrink-0 font-mono text-xs text-[var(--ec-text-secondary)]">
                  {t.percentage}%
                </span>
              </li>
            ))}
          </ul>
          <p className="ms-micro mt-3">
            Ranked by the marks being lost, not by difficulty.
          </p>
        </section>
      ) : null}

      {/* ── Subjects ──────────────────────────────────────────────────────── */}
      {report.subjects.length > 1 ? (
        <section className="mt-6 border-t border-dashed border-[var(--ec-border)] pt-5">
          <p className="ms-micro mb-3">BY SUBJECT</p>
          <ul className="space-y-1.5">
            {report.subjects.map((s) => (
              <li
                key={s.code}
                className="flex items-baseline justify-between gap-4 text-sm"
              >
                <span className="text-[var(--ec-text-primary)]">{s.label}</span>
                <span className="shrink-0 font-mono text-xs text-[var(--ec-text-secondary)]">
                  {s.marks} {plural(s.marks, 'question')}
                  {s.averagePercentage !== null ? ` · ${s.averagePercentage}%` : ''}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <p className="mt-7 border-t border-[var(--ec-border)] pt-4 text-xs leading-relaxed text-[var(--ec-text-secondary)]">
        Every figure here comes from answers marked against the real Cambridge or
        IB mark scheme for that question — the same scheme an examiner uses. No
        answers, comments or personal details are included in this report.
      </p>
    </article>
  )
}
