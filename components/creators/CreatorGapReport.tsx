import { GAP_REPORT_MIN_SCRIPTS } from '@/lib/creators/codes'
import { headlineGap, type CohortGapReport } from '@/lib/teacher/cohort-gaps'

/**
 * Where a creator's followers lose marks — the teacher cohort report, keyed
 * to the creator's code. Locked until there is enough marked work for the
 * percentages to mean something; a tips creator will post whatever number we
 * hand them, so we do not hand them a number built on six scripts.
 */
export function CreatorGapReport({
  report,
  handle,
}: {
  report: CohortGapReport
  handle: string
}) {
  const unlocked = !report.insufficientEvidence && report.scripts >= GAP_REPORT_MIN_SCRIPTS

  if (!unlocked) {
    const progress = Math.min(1, report.scripts / GAP_REPORT_MIN_SCRIPTS)
    const remaining = Math.max(0, GAP_REPORT_MIN_SCRIPTS - report.scripts)
    return (
      <div className="ms-cr-gap ms-cr-gap__locked">
        <p className="ms-cr-gap__headline">
          Unlocks at <em>{GAP_REPORT_MIN_SCRIPTS}</em> marked answers
        </p>
        <div
          className="ms-cr-progress"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={GAP_REPORT_MIN_SCRIPTS}
          aria-valuenow={Math.min(report.scripts, GAP_REPORT_MIN_SCRIPTS)}
          aria-label="Marked answers towards the gap report"
        >
          <div className="ms-cr-progress__fill" style={{ width: `${progress * 100}%` }} />
        </div>
        <p className="ms-cr-gap__sub">
          {report.scripts.toLocaleString('en-GB')} so far · {remaining} to go. Then you get the
          one mark most of your followers drop, with the examiner&apos;s most common note — the
          follow-up video nobody else can give you.
        </p>
      </div>
    )
  }

  const headline = headlineGap(report)
  const rows = report.markTypes.slice(0, 6)
  const missed = report.mostMissed.slice(0, 5)

  return (
    <div className="ms-cr-gap">
      {headline ? (
        <p className="ms-cr-gap__headline">
          Your followers earn only <em>{headline.earnedPct}%</em> of the {headline.label} marks.
        </p>
      ) : (
        <p className="ms-cr-gap__headline">
          Your followers earn <em>{report.averagePct}%</em> overall — no single mark type is
          collapsing.
        </p>
      )}
      <p className="ms-cr-gap__sub">
        {report.scripts.toLocaleString('en-GB')} marked answers with your code · average{' '}
        {report.averagePct}% · aggregate only, no one&apos;s script is shown to anyone.
      </p>

      {rows.length ? (
        <div className="ms-cr-gap__rows" role="list" aria-label="Marks earned by mark type">
          {rows.map((t) => (
            <div
              key={t.code}
              role="listitem"
              className={`ms-cr-gap__row${t.earnedPct < 60 ? ' ms-cr-gap__row--low' : ''}${
                t.thinEvidence ? ' ms-cr-gap__row--thin' : ''
              }`}
            >
              <span className="ms-cr-gap__label">{t.label}</span>
              <span className="ms-cr-gap__track" aria-hidden>
                <span
                  className="ms-cr-gap__fill"
                  style={{ display: 'block', width: `${Math.max(2, t.earnedPct)}%` }}
                />
              </span>
              <span className="ms-cr-gap__pct">
                {t.earnedPct}%{t.thinEvidence ? '*' : ''}
              </span>
            </div>
          ))}
        </div>
      ) : null}
      {rows.some((t) => t.thinEvidence) ? (
        <p className="ms-cr-gap__sub">* too few of these marks yet to lean on.</p>
      ) : null}

      {missed.length ? (
        <div className="ms-cr-gap__notes">
          <p className="ms-cr-section__note" style={{ marginBottom: 6 }}>
            What the examiner wrote most often
          </p>
          {missed.map((m) => (
            <p key={m.note} className="ms-cr-gap__note">
              <span className="ms-cr-gap__note-count" aria-label={`${m.students} followers`}>
                {m.students}×
              </span>
              <span>{m.note}</span>
            </p>
          ))}
          <p className="ms-cr-gap__sub" style={{ marginTop: 10 }}>
            Say this back to @{handle}&apos;s followers in one video and the number moves.
          </p>
        </div>
      ) : null}
    </div>
  )
}
