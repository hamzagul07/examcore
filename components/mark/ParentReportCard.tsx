'use client'

import type { ParentScoreSlipInput } from '@/lib/marking/parent-score-slip'

/** On-page parent/tutor report — same content as the print slip, shareable URL. */
export function ParentReportCard({
  report,
  showPrint = true,
}: {
  report: ParentScoreSlipInput
  showPrint?: boolean
}) {
  const lost = (report.marks ?? []).filter((m) => !m.earned).slice(0, 8)
  const earnedMarks = (report.marks ?? []).filter((m) => m.earned)
  const topics = (report.topics ?? []).slice(0, 6)

  return (
    <article className="ms-parent-report ec-card ec-card--paper mx-auto max-w-md p-6 sm:p-7">
      <p className="ec-label-tech mb-3">EXAMINER&apos;S INK · PARENT REPORT</p>
      <h1 className="text-2xl font-semibold tracking-tight text-[var(--ec-text-primary)]">
        Effort on the page
      </h1>
      <p className="mt-1 font-mono text-xs text-[var(--ec-text-secondary)]">
        {report.subjectLabel || 'Marked attempt'}
        {report.paperRef ? ` · ${report.paperRef}` : ''}
      </p>

      <p className="mt-5 text-4xl font-bold tracking-tight text-[var(--ec-brand)]">
        {report.marksEarned}
        <span className="text-xl font-semibold text-[var(--ec-text-secondary)]">
          {' '}
          / {report.totalMarks}
        </span>
      </p>
      <p className="mt-1 text-base font-bold text-[var(--ec-text-primary)]">
        {report.bandLabel}
      </p>
      <p className="text-sm text-[var(--ec-text-secondary)]">
        {report.percentage}%
        {report.grade ? ` · predicted ${report.grade}` : ''}
      </p>
      {report.nextGrade && report.nextGrade.marksNeeded > 0 ? (
        <p className="mt-3 border border-[var(--ec-brand-border)] bg-[var(--ec-brand-soft,rgba(25,119,77,0.07))] px-3 py-2 text-sm">
          <strong>{report.nextGrade.marksNeeded}</strong> mark
          {report.nextGrade.marksNeeded === 1 ? '' : 's'} from{' '}
          {report.nextGrade.nextGrade}
        </p>
      ) : null}

      <p className="mt-3 font-mono text-[11px] text-[var(--ec-text-secondary)]">
        {earnedMarks.length} earned · {lost.length} missed
      </p>

      {report.summary ? (
        <section className="mt-6 border-t border-dashed border-[var(--ec-border)] pt-4">
          <p className="ms-micro mb-2">EXAMINER NOTE</p>
          <p className="text-sm leading-relaxed text-[var(--ec-text-primary)]">
            {report.summary}
          </p>
        </section>
      ) : null}

      <section className="mt-6 border-t border-dashed border-[var(--ec-border)] pt-4">
        <p className="ms-micro mb-2">WHERE MARKS GOT AWAY</p>
        {lost.length === 0 ? (
          <p className="text-sm text-[var(--ec-brand)]">
            Every mark point earned on this attempt.
          </p>
        ) : (
          <ul className="space-y-2">
            {lost.map((m) => (
              <li key={m.label + (m.reason || '')} className="text-sm leading-snug">
                <span className="ec-ink-stamp ec-ink-stamp--inline mr-2" aria-hidden>
                  {m.label}
                </span>
                <span className="text-[var(--ec-text-secondary)]">
                  {m.reason || 'Not earned'}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {earnedMarks.length > 0 ? (
        <section className="mt-6 border-t border-dashed border-[var(--ec-border)] pt-4">
          <p className="ms-micro mb-2">MARKS EARNED</p>
          <ul className="flex flex-wrap gap-2">
            {earnedMarks.slice(0, 12).map((m) => (
              <li key={`ok-${m.label}`}>
                <span className="ec-ink-stamp ec-ink-stamp--inline">{m.label}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {topics.length > 0 ? (
        <section className="mt-6 border-t border-dashed border-[var(--ec-border)] pt-4">
          <p className="ms-micro mb-2">TOPICS TOUCHED</p>
          <div className="flex flex-wrap gap-2">
            {topics.map((t) => (
              <span
                key={t}
                className="border border-[var(--ec-border)] bg-[var(--ec-paper,var(--ec-surface))] px-2 py-1 font-mono text-[11px]"
              >
                {t}
              </span>
            ))}
          </div>
        </section>
      ) : null}

      {showPrint ? (
        <div className="mt-6 flex flex-wrap gap-2">
          <button
            type="button"
            className="ec-btn-secondary text-sm"
            onClick={() => window.print()}
          >
            Print report
          </button>
        </div>
      ) : null}

      <p className="mt-6 border-t border-[var(--ec-border)] pt-4 text-xs leading-relaxed text-[var(--ec-text-secondary)]">
        Marked on <strong className="text-[var(--ec-text-primary)]">MarkScheme</strong>{' '}
        — examiner-style feedback. No account needed to open this link.
      </p>
    </article>
  )
}
