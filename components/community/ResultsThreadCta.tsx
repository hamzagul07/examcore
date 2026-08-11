import 'server-only'

import Link from 'next/link'

import { getResultsDayPhase } from '@/lib/seo/results-day'
import { anyJune2026DataAvailable, hasJune2026Session } from '@/lib/seo/grade-boundaries-data'

type Props = {
  /** Where the block sits, so the UTM can tell blog from hub traffic. */
  source: string
  /** Subject in context, so the copy only claims data we actually hold. */
  subjectCode?: string | null
  className?: string
}

/**
 * Pulls results-week readers into the community thread.
 *
 * The copy is phase-aware because the useful question changes mid-week: before
 * the threshold tables land nobody knows how close they were, and after they
 * land the question becomes what to do about the gap. A single evergreen
 * "join our community" would be ignored in both phases.
 */
export function ResultsThreadCta({ source, subjectCode = null, className = '' }: Props) {
  const phase = getResultsDayPhase()

  // "Stop guessing at the gap" is only true if we hold the June 2026 numbers
  // for this subject. IGCSE codes still have nothing until 18 August, so
  // without this check the post-threshold copy would overpromise on them.
  const boundariesLive = subjectCode
    ? hasJune2026Session(subjectCode)
    : anyJune2026DataAvailable()

  const copy = {
    'pre-alevel': {
      overline: 'Community · open thread',
      title: 'Results land on 11 August. Thresholds follow around the 13th.',
      body: 'Post your subject in the thread now and you get the boundary read the morning the tables drop, instead of refreshing spreadsheets for two days.',
    },
    'alevel-results': {
      overline: 'Community · open thread',
      title: 'Your grade is out. The boundaries are not.',
      body: 'Threshold tables usually land around 13 August. Post your subject code and raw marks in the thread and we will work out what the boundary would have to do for your grade to move.',
    },
    'threshold-week': boundariesLive
      ? {
          overline: 'Community · thresholds live',
          title: 'Now you can stop guessing at the gap.',
          body: 'The June 2026 thresholds are in. Post your component and raw mark and we work out how far you were from the grade above and below — one mark off is a completely different week from fifteen.',
        }
      : {
          overline: 'Community · open thread',
          title: 'Your grade is out. These thresholds are not.',
          body: 'A Level tables are live but this series has not published yet. Post your subject and raw marks in the thread and you get the boundary read the moment the table lands.',
        },
    'post-igcse': {
      overline: 'Community · open thread',
      title: 'Still deciding on a remark or a resit?',
      body: 'Post your component and the gap. Students who have been through an EAR or the October series are answering in the thread.',
    },
  }[phase]

  // Deep-links the thread rather than the feed home: the button says "post in
  // the thread", so dropping the reader on a mixed feed loses exactly the
  // intent the copy just built. /community/thread/<code> resolves which thread
  // that is at click time; hub pages with no syllabus in context use the
  // reserved "results" slug and get the pinned cross-subject thread.
  const utm = `utm_source=${encodeURIComponent(source)}&utm_medium=internal&utm_campaign=results-2026`
  const href = `/community/thread/${encodeURIComponent(subjectCode ?? 'results')}?${utm}`

  return (
    <aside
      className={`ms-results-day-banner ms-results-day-banner--paper ${className}`.trim()}
      aria-label="Results week community thread"
    >
      <div className="ms-results-day-banner__stamp" aria-hidden="true">
        <span className="ms-results-day-banner__stamp-code">ASK</span>
        <span className="ms-results-day-banner__stamp-label">thread</span>
      </div>
      <div className="ms-results-day-banner__body">
        <p className="ms-overline" style={{ color: 'var(--ec-brand)', marginBottom: 6 }}>
          {copy.overline}
        </p>
        <h2 className="ms-h3" style={{ fontSize: '1.1rem', margin: 0 }}>
          {copy.title}
        </h2>
        <p className="ms-body-2" style={{ marginTop: 8, marginBottom: 0, maxWidth: 640 }}>
          {copy.body}
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link href={href} className="ec-btn-primary ec-btn-primary--sm">
            Post in the thread
            <span className="h-4 w-4" aria-hidden>-&gt;</span>
          </Link>
          <Link href="/community" className="ec-btn-ghost ec-btn-ghost--sm">
            Browse the community
          </Link>
        </div>
      </div>
    </aside>
  )
}
