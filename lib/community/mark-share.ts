/**
 * Turning "post your marks" into a ten-second action.
 *
 * The threshold threads ask readers to write a comment. Research on lurker
 * conversion is consistent that the first contribution has to be tiny,
 * low-risk and visibly worthwhile — a prose box asking for an opinion is none
 * of those. Picking a paper and typing a number is all three, and the reply it
 * produces is exactly the first-hand, specific content that makes forum pages
 * worth ranking: a real mark against a real threshold, not another opinion.
 */

export type MarkComponent = {
  component: string
  paper: string
  max: number
  thresholds: Record<string, number>
}

export type MarkGap = {
  /** Highest grade the raw mark reaches on this component, or null if below E. */
  grade: string | null
  /** Marks to the next grade up, or null when already at the top. */
  toNext: number | null
  nextGrade: string | null
  /**
   * Headroom: marks above the threshold just cleared, i.e. how many could be
   * lost before dropping. Null when no grade was reached.
   */
  margin: number | null
  /** The grade that headroom protects against falling to. */
  dropsTo: string | null
}

/** Best to worst, so the first match is the grade achieved. */
const GRADE_ORDER = ['A*', 'A', 'B', 'C', 'D', 'E'] as const

/**
 * Where a raw mark sits against a component's published thresholds.
 *
 * Deliberately reports the component only. A candidate's overall grade comes
 * from the total across their papers, and implying otherwise on a thread people
 * read while deciding whether to pay for a remark would be worse than saying
 * nothing.
 */
export function markGap(component: MarkComponent, raw: number): MarkGap {
  const ladder = GRADE_ORDER.filter((g) => Number.isFinite(component.thresholds[g])).map((g) => ({
    grade: g as string,
    at: component.thresholds[g],
  }))

  const reachedIndex = ladder.findIndex((l) => raw >= l.at)
  const reached = reachedIndex === -1 ? null : ladder[reachedIndex]
  const next = reachedIndex === -1 ? ladder[ladder.length - 1] : ladder[reachedIndex - 1]
  const below = reachedIndex === -1 ? null : ladder[reachedIndex + 1]

  return {
    grade: reached?.grade ?? null,
    toNext: next ? Math.max(next.at - raw, 0) : null,
    nextGrade: next?.grade ?? null,
    // Measured against the threshold actually cleared, not the one below it.
    // "57 is 6 above the B line" is the number that tells you how safe the B
    // is; distance to the C two rungs down tells you nothing you would act on.
    margin: reached ? raw - reached.at : null,
    dropsTo: below?.grade ?? null,
  }
}

/**
 * The comment a shared mark becomes.
 *
 * Written as the student's own words in the first person, because that is what
 * it is — the form is a shortcut for typing, not a byline change. It states the
 * component caveat every time, since this is the number people misread.
 */
export function markShareComment(component: MarkComponent, raw: number, gap: MarkGap): string {
  const lines = [
    `**${component.paper} (${component.component})** — I got **${raw}/${component.max}**.`,
    '',
  ]

  if (gap.grade) {
    lines.push(`That clears the **${gap.grade}** threshold on this component.`)
  } else {
    lines.push('That is below the lowest published threshold on this component.')
  }

  if (gap.toNext !== null && gap.nextGrade) {
    lines.push(
      gap.toNext === 0
        ? `Exactly on the **${gap.nextGrade}** line.`
        : `**${gap.toNext} mark${gap.toNext === 1 ? '' : 's'}** off the **${gap.nextGrade}**.`
    )
  }
  if (gap.margin !== null && gap.grade) {
    lines.push(
      gap.dropsTo
        ? `${gap.margin} clear of the ${gap.grade} line — ${gap.margin} more lost and it is a ${gap.dropsTo}.`
        : `${gap.margin} clear of the ${gap.grade} line.`
    )
  }

  lines.push('', '_Component threshold only — my overall grade comes from the total across papers._')
  return lines.join('\n')
}

/** Components worth offering: real max, and at least one usable threshold. */
export function usableComponents(components: MarkComponent[]): MarkComponent[] {
  return components
    .filter((c) => Number.isFinite(c.max) && c.max > 0)
    .filter((c) => GRADE_ORDER.some((g) => Number.isFinite(c.thresholds?.[g])))
    .sort((a, b) => a.paper.localeCompare(b.paper) || a.component.localeCompare(b.component))
}
