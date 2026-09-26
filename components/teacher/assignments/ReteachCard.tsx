import Link from 'next/link'
import type { AssignmentKind } from '@/lib/teacher/types'
import { LoadingLink } from '@/components/ui/LoadingLink'
import { composerHref, printHref, setHref } from '@/components/teacher/assignments/links'
import { KIND_LABEL } from '@/components/teacher/assignments/set-display'

/**
 * The reteach prompt (docs/TEACHER_SYSTEM_SPEC.md §4: `.ms-reteach`,
 * dual-ink rule; "headline gap of last closed set; 'Print handout' / 'Set a
 * drill' → composer ?source=reteach&codes=").
 *
 * The gap is the kind of mark the class dropped most on its last completed
 * set ("Analysis — 17% of marks earned", from the cohort gap report). "Set a
 * drill" opens the composer on the topics that set covered; "Print handout"
 * prints that set's questions to go through in class.
 *
 * Rendered only when there is a gap to reteach; a class with no completed
 * set, or one whose marks were spread out, has no card rather than an
 * empty one.
 */
export function ReteachCard({
  classroomId,
  set,
  gap,
  topics,
  handedIn,
  totalStudents,
  classMeanPct,
  canSetWork,
}: {
  classroomId: string
  set: { id: string; title: string; kind: AssignmentKind }
  gap: string
  /** The set's topics, as { code, label } ("Definite integrals (5.4)"). */
  topics: ReadonlyArray<{ code: string; label: string }>
  handedIn: number
  totalStudents: number
  classMeanPct: number | null
  canSetWork: boolean
}) {
  const mean = classMeanPct !== null && Number.isFinite(classMeanPct) ? `, class mean ${Math.round(classMeanPct)}%` : ''
  const covered =
    topics.length === 0
      ? null
      : topics.length <= 3
        ? topics.map((t) => t.label).join(', ')
        : `${topics
            .slice(0, 3)
            .map((t) => t.label)
            .join(', ')} and ${topics.length - 3} more`

  return (
    <section className="ms-reteach" aria-labelledby="reteach-gap">
      <p className="ms-reteach__eyebrow">Reteach</p>
      <h2 id="reteach-gap" className="ms-reteach__gap">
        {gap}
      </h2>
      <p className="ms-reteach__evidence">
        The mark the class dropped most on <strong>{set.title}</strong> ({KIND_LABEL[set.kind].toLowerCase()},{' '}
        {handedIn} of {totalStudents} handed in{mean}).
        {covered ? ` It covered ${covered}.` : null}
      </p>
      <span className="ms-reteach__note" aria-hidden>
        worth ten minutes before the next set
      </span>
      <div className="ms-reteach__actions">
        {canSetWork ? (
          <LoadingLink
            href={composerHref(classroomId, {
              source: 'reteach',
              codes: topics.map((t) => t.code),
              set: set.id,
            })}
            loadingText="Opening…"
            className="ec-btn-primary inline-flex min-h-[44px] items-center justify-center"
          >
            Set a drill
          </LoadingLink>
        ) : null}
        <Link
          href={printHref(classroomId, set.id)}
          className="ec-btn-secondary inline-flex min-h-[44px] items-center justify-center"
        >
          Print handout
        </Link>
        <Link href={setHref(classroomId, set.id)} className="ec-btn-ghost inline-flex min-h-[44px] items-center justify-center">
          See the set
        </Link>
      </div>
    </section>
  )
}
