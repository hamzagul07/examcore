'use client'

/**
 * The feasibility report as the student reads it: one state chip, one
 * headline, a row per subject and the plain-sentence tradeoffs. It states
 * what the engine found and nothing more — the options that change the
 * answer are buttons the wizard owns, so the same card can sit on the
 * roadmap screen later without a form around it.
 *
 * Each fact is printed once. A subject row says how many of its priority
 * topics get their past-paper question in before the paper, and names the
 * ones that are started or waiting; the tradeoffs below are the engine's
 * sentences about the whole plan, never a repeat of the rows. The engine's
 * own words for the priority band ("must") stay in the report's fields and
 * never reach the page.
 */

import { FEASIBILITY_LABEL, type FeasibilityReport, type FeasibilitySubject } from '@/lib/plan/roadmap-types'

const LATER_SHOWN = 3

export const LATER_LABEL = 'Waits until later'
export const STARTED_LABEL = 'Started, past-paper question still to come'
export const REVIEW_ONLY_LINE = 'Review only — nothing new is planned before this paper.'

function NameList({ label, names }: { label: string; names: string[] }) {
  const shown = names.slice(0, LATER_SHOWN)
  const more = names.length - shown.length
  if (shown.length === 0) return null
  return (
    <p className="ms-rm-setup-feas__later">
      <span className="ms-rm-setup-feas__later-label">{label}:</span> {shown.join(', ')}
      {more > 0 ? ` and ${more} more` : ''}
    </p>
  )
}

/** "about 11 h", or minutes under an hour, for the row's planned time. */
function hoursLabel(minutes: number): string {
  if (minutes < 60) return `about ${Math.max(5, Math.round(minutes / 5) * 5)} min`
  return `about ${Math.round(minutes / 60)} h`
}

function SubjectRow({ s }: { s: FeasibilitySubject }) {
  // What the calendar can hold before the taper, never fewer than it actually holds: an older report
  // could under-count the reachable band, and "5 of 5" beside a row that lists seven would not be true.
  const reachable = Math.max(typeof s.mustReachable === 'number' ? s.mustReachable : s.mustTopics, s.plannedTopics)
  const proved = Math.min(s.plannedTopics, s.mustTopics)
  return (
    <li className="ms-rm-setup-feas__subject">
      <div className="ms-rm-setup-feas__subject-head">
        <span className="ms-rm-setup-feas__subject-name">{s.label}</span>
        <span className="ms-rm-setup-feas__subject-meta">
          {s.daysToPaper} {s.daysToPaper === 1 ? 'day' : 'days'} to the paper
        </span>
      </div>
      {s.reviewOnly ? (
        <p className="ms-rm-setup-feas__reach">{REVIEW_ONLY_LINE}</p>
      ) : (
        <>
          <p className="ms-rm-setup-feas__reach">
            <strong>{proved}</strong> of {s.mustTopics} priority {s.mustTopics === 1 ? 'topic gets its' : 'topics get their'} past-paper question in before the
            paper
            {s.minutes > 0 ? <span className="ms-rm-setup-feas__minutes"> · {hoursLabel(s.minutes)}</span> : null}
            {s.mustTopics > reachable ? (
              <span className="ms-rm-setup-feas__clause">
                {' '}
                ({s.mustTopics} priority topics in this style; {reachable} fit in the time before the paper)
              </span>
            ) : null}
          </p>
          <NameList label={STARTED_LABEL} names={s.started ?? []} />
          <NameList label={LATER_LABEL} names={s.later} />
        </>
      )}
    </li>
  )
}

export function FeasibilityCard({ report }: { report: FeasibilityReport }) {
  // The same sentence never appears twice, whatever the report carries.
  const tradeoffs = [...new Set(report.tradeoffs)]
  return (
    <section className={`ms-rm-setup-feas is-${report.state}`} aria-labelledby="rm-feas-headline">
      <p className="ms-rm-setup-feas__chip">{FEASIBILITY_LABEL[report.state]}</p>
      <h3 id="rm-feas-headline" className="ms-rm-setup-feas__headline">
        {report.headline}
      </h3>
      {report.subjects.length > 0 ? (
        <ul className="ms-rm-setup-feas__subjects">
          {report.subjects.map((s) => (
            <SubjectRow key={s.code} s={s} />
          ))}
        </ul>
      ) : null}
      {tradeoffs.length > 0 ? (
        <ul className="ms-rm-setup-feas__tradeoffs">
          {tradeoffs.map((t) => (
            <li key={t}>{t}</li>
          ))}
        </ul>
      ) : null}
    </section>
  )
}
