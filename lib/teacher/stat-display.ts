/**
 * How teacher-facing numbers are rendered when there is nothing to average.
 *
 * A class or a student with no marked work does not score 0% — the figure is
 * unknown. Rendering `accuracy.toFixed(0)}%` regardless put "0% avg" beside the
 * name of every student who had joined but not yet submitted anything, which a
 * teacher reads as a child who is failing rather than one who has not started.
 * On the classroom header it told every new teacher their class averaged 0%.
 *
 * Counts are still true at zero and are shown as numbers; only derived figures
 * become a dash.
 */

/** Shown in place of a percentage that cannot be computed. */
export const NO_DATA = '—'

/**
 * A percentage, or a dash when there is no evidence behind it.
 *
 * Gated on the count of marked attempts rather than on the value, because a
 * student who genuinely scored 0% should see 0%.
 */
export function percentOrDash(value: number | null | undefined, attempts: number): string {
  if (!Number.isFinite(attempts) || attempts <= 0) return NO_DATA
  if (value == null || !Number.isFinite(value)) return NO_DATA
  return `${Math.round(value)}%`
}

/** True when a figure derived from marked work can be shown at all. */
export function hasMarkedWork(attempts: number | null | undefined): boolean {
  return Number.isFinite(attempts) && (attempts as number) > 0
}

/**
 * The "3 attempts · 72% avg" line under a student's name.
 *
 * Says "not started" rather than "0 attempts · 0% avg", because the two mean
 * very different things to a teacher deciding who needs help.
 */
export function attemptSummary(attempts: number, accuracy: number | null | undefined): string {
  if (!hasMarkedWork(attempts)) return 'Not started'
  const plural = attempts === 1 ? 'attempt' : 'attempts'
  return `${attempts} ${plural} · ${percentOrDash(accuracy, attempts)} avg`
}
