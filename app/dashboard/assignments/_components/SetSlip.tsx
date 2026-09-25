import { LoadingLink } from '@/components/ui/LoadingLink'
import { LocalTime } from '@/components/teacher/assignments/LocalTime'
import { kindLabel, pctLabel, progressLabel, type StudentAssignment } from '@/lib/student/assignment-state'
import { SetChip } from './SetChip'

/**
 * One set on the student's list: title, class, kind, the student's own
 * deadline (their extension if they have one), progress, their own mark, and
 * the status chip. The whole slip is the link (44px+ target).
 */
export function SetSlip({ set, timeZone, now }: { set: StudentAssignment; timeZone: string; now: string }) {
  const pct = pctLabel(set.overall_pct)
  return (
    <li>
      <LoadingLink
        href={set.href}
        variant="card"
        className="ec-card ec-card--paper flex min-h-[44px] flex-col gap-3 p-4 transition-colors hover:border-[color-mix(in_srgb,var(--ec-brand)_40%,transparent)] sm:flex-row sm:items-center sm:justify-between sm:gap-4"
      >
        <span className="min-w-0 flex-1">
          <span className="block font-semibold text-[var(--ec-text-primary)] [overflow-wrap:anywhere]">
            {set.title}
          </span>
          <span className="mt-0.5 block text-sm text-[var(--ec-text-secondary)] [overflow-wrap:anywhere]">
            {set.classroom.name} · {kindLabel(set.kind)}
            {set.is_mock ? ' · Mock' : ''}
          </span>
          <span className="mt-0.5 block text-sm text-[var(--ec-text-secondary)]">
            {set.deadline ? (
              <>
                {set.phase === 'open' && set.state === 'overdue' ? 'Was due ' : 'Due '}
                <LocalTime iso={set.deadline} timeZone={timeZone} now={now} />
                {set.extended ? ' (extended)' : ''}
                {' · '}
              </>
            ) : null}
            {progressLabel(set)}
          </span>
        </span>
        <span className="flex shrink-0 items-center gap-3">
          {pct ? (
            <span className="font-mono text-sm font-bold text-[var(--ec-text-primary)]" aria-label={`Your mark so far ${pct}`}>
              {pct}
            </span>
          ) : null}
          <SetChip set={set} />
        </span>
      </LoadingLink>
    </li>
  )
}
