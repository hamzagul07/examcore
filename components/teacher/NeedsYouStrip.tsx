import { LoadingLink } from '@/components/ui/LoadingLink'
import type { TeacherOverview } from '@/lib/teacher/types'

type Tile = {
  key: string
  count: number
  label: [singular: string, plural: string]
  hint: string
  clearHint: string
  href: string
}

function plural(n: number, [one, many]: [string, string]): string {
  return n === 1 ? one : many
}

/**
 * "Needs you" — the three things on the desk that wait for the teacher, as
 * spine tiles (`.ms-needs-you`): hand-ins to review, students overdue on an
 * open set, and classes that have gone quiet. A tile with work behind it gets
 * the crimson spine; an empty one is muted and says so, so a clear desk reads
 * as good news rather than as missing data.
 *
 * Counts follow lib/teacher/overview.ts, which the desk and the API share.
 * The hrefs are chosen by the page, which knows whether the work is in one
 * class (go straight there) or spread across several.
 */
export function NeedsYouStrip({
  needsYou,
  hrefs,
}: {
  needsYou: TeacherOverview['needs_you']
  hrefs: { unreviewed: string; late: string; silent: string }
}) {
  const tiles: Tile[] = [
    {
      key: 'unreviewed',
      count: needsYou.unreviewed,
      label: ['script to review', 'scripts to review'],
      hint: 'handed in, not yet checked',
      clearHint: 'all checked',
      href: hrefs.unreviewed,
    },
    {
      key: 'late',
      count: needsYou.late_students,
      label: ['student overdue', 'students overdue'],
      hint: 'past the deadline, work missing',
      clearHint: 'nobody behind',
      href: hrefs.late,
    },
    {
      key: 'silent',
      count: needsYou.silent_classes,
      label: ['class gone quiet', 'classes gone quiet'],
      hint: 'no marked work in 14 days',
      clearHint: 'every class marking',
      href: hrefs.silent,
    },
  ]

  return (
    <nav aria-label="Needs you">
      <ul className="ms-needs-you">
        {tiles.map((t) => {
          const clear = t.count === 0
          const label = plural(t.count, t.label)
          return (
            <li key={t.key}>
              <LoadingLink
                href={t.href}
                variant="card"
                className={`ms-needs-you__tile ${clear ? 'ms-needs-you__tile--clear' : 'ms-needs-you__tile--urgent'}`}
                aria-label={`${t.count} ${label}${clear ? '' : ` — ${t.hint}`}`}
              >
                <span className="ms-needs-you__count" aria-hidden>
                  {t.count}
                </span>
                <span className="ms-needs-you__label" aria-hidden>
                  {label}
                </span>
                <span className="ms-needs-you__hint" aria-hidden>
                  {clear ? t.clearHint : t.hint}
                </span>
              </LoadingLink>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
