/**
 * The Sunday examiner report, shown as it arrives — in an inbox.
 *
 * The real report is an email (`lib/email/weekly-report.ts`), so there is no web
 * component to reuse here; rendering the email template inside a page would
 * misrepresent where it actually shows up. The figures are the ones
 * `computeWeeklyReportData` derives — marks this week, movement against the
 * prior week, the topic holding the grade back, distance to target — passed in
 * by the page from the same seeded attempts everything else on /demo uses.
 *
 * It sits on the tour because it is the feature that makes a subscription a
 * habit rather than a tool: the student does nothing and the product still shows
 * up once a week with something true to say.
 */

export function DemoWeeklyReport({
  firstName,
  marksThisWeek,
  scriptsThisWeek,
  averageThisWeek,
  averageDelta,
  weakTopic,
  weakTopicPercentage,
  targetGrade,
  pointsToTarget,
  daysToExam,
}: {
  firstName: string
  marksThisWeek: number
  scriptsThisWeek: number
  averageThisWeek: number
  /** Percentage points against the previous week; negative is honest, not hidden. */
  averageDelta: number | null
  weakTopic: string | null
  weakTopicPercentage: number | null
  targetGrade: string
  pointsToTarget: number | null
  daysToExam: number
}) {
  const rising = averageDelta != null && averageDelta > 0
  return (
    <div className="demo-email">
      <div className="demo-email__bar">
        <span className="demo-email__from mono">MarkScheme</span>
        <span className="demo-email__meta mono">Sunday · 08:00</span>
      </div>

      <div className="demo-email__body">
        <p className="demo-email__subject serif">
          {firstName}, you closed {marksThisWeek} marks this week
        </p>

        <div className="demo-email__figures">
          <div className="demo-email__figure">
            <span className="demo-email__figure-n mono">{scriptsThisWeek}</span>
            <span className="demo-email__figure-l">scripts marked</span>
          </div>
          <div className="demo-email__figure">
            <span className="demo-email__figure-n mono">
              {Math.round(averageThisWeek)}%
            </span>
            <span className="demo-email__figure-l">
              average
              {averageDelta != null && (
                <span
                  className={
                    rising
                      ? 'demo-email__delta demo-email__delta--up'
                      : 'demo-email__delta demo-email__delta--down'
                  }
                >
                  {rising ? '▲' : '▼'} {Math.abs(Math.round(averageDelta))} pts
                </span>
              )}
            </span>
          </div>
          <div className="demo-email__figure">
            <span className="demo-email__figure-n mono">{daysToExam}</span>
            <span className="demo-email__figure-l">days to Paper 1</span>
          </div>
        </div>

        {weakTopic && (
          <p className="demo-email__line">
            <strong>{weakTopic}</strong> is still the topic holding the grade
            back
            {weakTopicPercentage != null && (
              <> — you are converting {Math.round(weakTopicPercentage)}% of the
              marks available on it</>
            )}
            . It has not moved since last Sunday.
          </p>
        )}

        {pointsToTarget != null && (
          <p className="demo-email__line">
            You are <strong>{pointsToTarget} percentage points</strong> from your
            target {targetGrade}. Three questions on the topic above is the
            shortest route there.
          </p>
        )}

        <p className="demo-email__cta mono">Open this week&rsquo;s drill →</p>
      </div>
    </div>
  )
}
