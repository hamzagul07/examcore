import { LoadingLink } from '@/components/ui/LoadingLink'
import { composerHref } from '@/components/teacher/assignments/links'
import { actionable, rankBlindspots, type BlindspotInput } from '@/lib/teacher/blindspots'

/**
 * Which syllabus topics this class is weak on — all of them, at once, in
 * the class's own subject.
 *
 * Comparing magnitude across named categories is a bar chart, horizontal
 * because topic names are long. Two facts per row, deliberately not merged:
 * how weak the class is, and how many of them it rests on. A topic
 * averaging 38% across 4 of 28 students is a different fact from 38% across
 * 24, and a teacher who cannot tell them apart will reteach on the strength
 * of four scripts. Thin rows are marked in words and in form (a paler bar),
 * never by colour alone.
 *
 * "Set a drill" opens the composer prefilled with the weakest topics that
 * have enough evidence to trust (`?source=blindspot&codes=`), replacing the
 * old one-click "intervention" test that nothing consumed.
 *
 * Hook-free: renders from a server component or a client one (the
 * /dev/blindspots preview).
 */

const LEVEL_TOKEN = {
  critical: 'critical',
  proficient: 'warning',
  secure: 'success',
} as const

const LEVEL_LABEL = {
  critical: 'Critical',
  proficient: 'Shaky',
  secure: 'Secure',
} as const

/** Topics a drill link carries: the three weakest trustworthy ones. */
const DRILL_TOPICS = 3

export function ClassBlindspots({
  classroomId,
  blindspots,
  canSetWork = true,
  headingId = 'class-blindspots-title',
}: {
  classroomId: string
  blindspots: BlindspotInput[]
  /** False for an archived class or with the teacher system v2 off: no composer link. */
  canSetWork?: boolean
  headingId?: string
}) {
  const ranked = rankBlindspots(blindspots)
  const targets = actionable(ranked).slice(0, DRILL_TOPICS)
  const worst = ranked[0]

  if (!worst) {
    return (
      <section className="ms-teacher-empty mb-8" aria-labelledby={headingId}>
        <span className="ms-teacher-empty__icon" aria-hidden>
          !
        </span>
        <h2 id={headingId} className="ms-teacher-empty__title">
          No weak topics to show yet
        </h2>
        <p className="ms-teacher-empty__body">
          A topic appears here once enough of the class has been marked on it in this subject. Setting a question set
          is the quickest way to fill it.
        </p>
      </section>
    )
  }

  return (
    <section className="ms-blindspots ec-card ec-card--paper mb-8 p-5 sm:p-8" aria-labelledby={headingId}>
      <div className="ms-blindspots__head">
        <div className="min-w-0">
          <div className="mb-2 flex items-center gap-2">
            <span className="ec-ink-stamp ec-ink-stamp--crimson ec-ink-stamp--inline" aria-hidden>
              !
            </span>
            <span className="ec-label-tech ec-score-low">Class blindspots</span>
          </div>
          <h2 id={headingId} className="ms-blindspots__title">
            Weakest first — {worst.name} at {Math.round(worst.avgMastery)}%
          </h2>
          <p className="ms-blindspots__sub">
            The class average on each syllabus topic, marks-weighted, across the students who have been marked on it.
          </p>
        </div>
      </div>

      <ol className="ms-blindspots__list" aria-label={`${ranked.length} topics, weakest first`}>
        {ranked.map((t) => (
          <li
            key={t.code}
            className="ms-bs-row"
            data-level={LEVEL_TOKEN[t.level]}
            data-thin={t.thinEvidence ? 'yes' : 'no'}
          >
            <div className="ms-bs-row__head">
              <span className="ms-bs-row__name">
                {t.name}
                <span className="sr-only">
                  {' '}
                  (syllabus {t.code}
                  {t.paper ? `, ${t.paper}` : ''})
                </span>
              </span>
              <span className="ms-bs-row__pct">{Math.round(t.avgMastery)}%</span>
            </div>

            <div className="ms-bs-row__track" aria-hidden>
              <span className="ms-bs-row__fill" style={{ width: `${Math.max(1.5, Math.min(100, t.avgMastery))}%` }} />
            </div>

            <p className="ms-bs-row__meta">
              <span className="ms-bs-row__level">{LEVEL_LABEL[t.level]}</span>
              <span aria-hidden="true">·</span>
              <span className="font-mono">{t.code}</span>
              <span aria-hidden="true">·</span>
              <span>
                {t.studentsAttempted} of {t.totalStudents} {t.totalStudents === 1 ? 'student' : 'students'}
              </span>
              {t.thinEvidence ? (
                <span className="ms-bs-row__thin">
                  <span className="font-mono text-[9px] font-bold" aria-hidden>
                    i
                  </span>
                  too few to act on yet
                </span>
              ) : null}
            </p>
          </li>
        ))}
      </ol>

      {canSetWork ? (
        <div className="ms-blindspots__foot">
          {targets.length > 0 ? (
            <LoadingLink
              href={composerHref(classroomId, { source: 'blindspot', codes: targets.map((t) => t.code) })}
              loadingText="Opening…"
              className="ec-btn-primary inline-flex min-h-[44px] items-center justify-center gap-2"
            >
              <span className="font-mono text-[11px] font-bold tracking-wide" aria-hidden>
                DRL
              </span>
              Set a drill on {targets.length === 1 ? 'this topic' : `these ${targets.length} topics`}
            </LoadingLink>
          ) : null}
          <p className="ms-blindspots__foot-note">
            {targets.length > 0
              ? `Drills ${targets.map((t) => t.name).join(', ')} — the weakest topics with enough students marked to trust.`
              : 'A drill needs at least one weak topic with enough of the class marked on it.'}
          </p>
        </div>
      ) : null}
    </section>
  )
}
