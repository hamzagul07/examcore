import Link from 'next/link'
import type { ErrorGroup } from '@/lib/teacher/types'
import { LoadingLink } from '@/components/ui/LoadingLink'
import { PREFILL_MAX_STUDENTS, composerHref } from '@/components/teacher/assignments/links'
import {
  errorGroupMeta,
  errorGroupStamp,
  groupStudentsLine,
} from '@/components/teacher/assignments/set-display'

/**
 * Students losing marks the same way (docs/TEACHER_SYSTEM_SPEC.md §4:
 * ErrorGroupsPanel, from `T/groups`; "Set a drill for this group" → composer
 * `?source=error_group&students=`), one `.ms-error-group` slip per group.
 *
 * Takes the groups as buildErrorGroups (P1) returns them — the class page
 * loads them server-side from the same read as `T/groups`; the Gaps page may
 * pass the route's response — with a map of display names. A topic-bound
 * group also prefills its syllabus code, so the drill is on that topic.
 *
 * Hook-free: renders from a server component or a client one.
 */
export function ErrorGroupsPanel({
  classroomId,
  groups,
  names,
  canSetWork = true,
  limit = 5,
  truncated = false,
  gapsHref,
  headingId = 'error-groups-title',
}: {
  classroomId: string
  groups: readonly ErrorGroup[]
  /** student id → display name. */
  names: Readonly<Record<string, string>>
  /** False for an archived class or with v2 off. */
  canSetWork?: boolean
  limit?: number
  /** The groups were built from the newest part of a long history. */
  truncated?: boolean
  /** Where "more groups" leads (the Gaps tab); omitted on the Gaps page itself. */
  gapsHref?: string
  headingId?: string
}) {
  const shown = groups.slice(0, Math.max(1, limit))
  const rest = groups.length - shown.length

  return (
    <section aria-labelledby={headingId} className="mb-8">
      <div className="ms-class-due__head">
        <div className="min-w-0">
          <h2 id={headingId} className="ms-class-due__title">
            Shared mistakes
          </h2>
          <p className="ms-class-due__sub">
            Two or more students losing marks the same way — one drill for the group beats the same comment on each
            script.
            {truncated ? ' Based on the class’s most recent marked work.' : ''}
          </p>
        </div>
      </div>

      {shown.length === 0 ? (
        <div className="ms-teacher-empty">
          <span className="ms-teacher-empty__icon" aria-hidden>
            ERR
          </span>
          <h3 className="ms-teacher-empty__title">No shared mistakes yet</h3>
          <p className="ms-teacher-empty__body">
            Groups appear once two or more students drop marks the same way — the same misunderstanding on a topic,
            or the same kind of slip across topics.
          </p>
        </div>
      ) : (
        <div>
          {shown.map((g) => {
            const students = g.student_ids.length
            const href = composerHref(classroomId, {
              source: 'error_group',
              students: students <= PREFILL_MAX_STUDENTS ? g.student_ids : [],
              codes: g.leaf_code ? [g.leaf_code] : [],
              group: g.key,
            })
            return (
              <article key={g.key} className="ms-error-group" aria-labelledby={`group-${g.key}`}>
                <span className="ms-error-group__stamp" aria-hidden>
                  {errorGroupStamp(g.classification)}
                </span>
                <div className="ms-error-group__body">
                  <h3 id={`group-${g.key}`} className="ms-error-group__label">
                    {g.label}
                  </h3>
                  <p className="ms-error-group__meta">{errorGroupMeta(students, g.evidence_count)}</p>
                  <p className="ms-error-group__students">{groupStudentsLine(g.student_ids, names)}</p>
                </div>
                {canSetWork ? (
                  <div className="ms-error-group__action">
                    <LoadingLink
                      href={href}
                      loadingText="Opening…"
                      className="ec-btn-secondary inline-flex min-h-[44px] items-center justify-center text-sm"
                    >
                      Set a drill for this group
                    </LoadingLink>
                  </div>
                ) : null}
              </article>
            )
          })}
          {rest > 0 ? (
            <p className="mt-3 text-sm text-[var(--ec-text-secondary)]">
              {rest} more {rest === 1 ? 'group' : 'groups'}
              {gapsHref ? (
                <>
                  {' — '}
                  <Link href={gapsHref} className="ec-link">
                    see them all under Gaps
                  </Link>
                </>
              ) : null}
              .
            </p>
          ) : null}
        </div>
      )}
    </section>
  )
}
