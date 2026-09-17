'use client'

/**
 * The feasibility report as the student reads it: one state chip, one
 * headline, a row per subject, the plain-sentence tradeoffs, and how much
 * time is in hand. It states what the engine found and nothing more — the
 * options that change the answer are buttons the wizard owns, so the same
 * card can sit on the roadmap screen later without a form around it.
 */

import { FEASIBILITY_LABEL, type FeasibilityReport, type FeasibilitySubject } from '@/lib/plan/roadmap-types'

const LATER_SHOWN = 3

export const LATER_LABEL = 'Left for later'
export const STARTED_LABEL = 'Started, marked question still to come'
export const REVIEW_ONLY_LINE = 'Review only — nothing new is planned before this paper.'

/**
 * Time in hand per study day, rounded to five: capacity minus what was laid
 * (work and breaks), over the study days. Falls back to the ratio when an
 * older report carries no capacity figures.
 */
export function bufferMinutesPerDay(
  report: Pick<FeasibilityReport, 'supplyMinutes' | 'utilisation' | 'subjects'> & Partial<Pick<FeasibilityReport, 'capacityMinutes' | 'laidMinutes' | 'studyDays'>>
): number {
  if (typeof report.capacityMinutes === 'number' && typeof report.laidMinutes === 'number' && typeof report.studyDays === 'number') {
    if (report.studyDays <= 0) return 0
    return Math.max(0, Math.round((report.capacityMinutes - report.laidMinutes) / report.studyDays / 5) * 5)
  }
  const days = Math.max(1, ...report.subjects.map((s) => s.daysToPaper))
  if (report.utilisation <= 0 || report.utilisation >= 1) return 0
  const capacity = report.supplyMinutes / report.utilisation
  return Math.max(0, Math.round((capacity - report.supplyMinutes) / days / 5) * 5)
}

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

function SubjectRow({ s }: { s: FeasibilitySubject }) {
  // "Reached" is measured against the must-cover loops that fit before the paper, not the whole band.
  const reachable = typeof s.mustReachable === 'number' ? s.mustReachable : s.mustTopics
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
            <strong>{Math.min(s.plannedTopics, reachable)}</strong> of <strong>{reachable}</strong> must-cover topics reached before the paper
            {s.minutes > 0 ? <span className="ms-rm-setup-feas__minutes"> · about {Math.round(s.minutes / 60)} h planned</span> : null}
          </p>
          {s.mustTopics > reachable ? (
            <p className="ms-rm-setup-feas__later">
              {s.mustTopics} topics are must-cover in this mode; {reachable} fit in the study days before the paper.
            </p>
          ) : null}
          <NameList label={STARTED_LABEL} names={s.started ?? []} />
          <NameList label={LATER_LABEL} names={s.later} />
        </>
      )}
    </li>
  )
}

export function FeasibilityCard({ report }: { report: FeasibilityReport }) {
  const inHand = bufferMinutesPerDay(report)
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
      {report.tradeoffs.length > 0 ? (
        <ul className="ms-rm-setup-feas__tradeoffs">
          {report.tradeoffs.map((t, i) => (
            <li key={i}>{t}</li>
          ))}
        </ul>
      ) : null}
      <p className="ms-rm-setup-feas__util">
        {inHand > 0 ? `About ${inHand} min a day in hand.` : 'Every study day is laid out to the edge of its windows.'}
      </p>
    </section>
  )
}
