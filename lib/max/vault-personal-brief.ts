/**
 * Max Vault personal briefing — built from recent attempts on the focus subject.
 * No email; in-Vault only.
 */
import type { AttemptWithPaper } from '@/lib/syllabi/attempts'
import { getAttemptSubjectCode } from '@/lib/syllabi/attempts'
import { getSyllabusByCode } from '@/lib/syllabi'
import { courseHubHref, pastPaperHubHref } from '@/lib/max/paper-practice-links'

export type VaultPersonalBrief = {
  focusCode: string
  focusName: string
  headline: string
  lines: string[]
  recentAvgPct: number | null
  attemptCount: number
  nextHref: string
  nextLabel: string
}

function topicTitle(subjectCode: string, code: string): string {
  const topics = getSyllabusByCode(subjectCode) ?? []
  return topics.find((t) => t.code === code)?.name ?? code
}

function defaultShowcaseNext(focusCode: string): { href: string; label: string } {
  if (focusCode === '9708') {
    return {
      href: '/courses/9708/1-1-scarcity-choice-and-opportunity-cost',
      label: 'Open scarcity & opportunity cost →',
    }
  }
  if (focusCode === '9706') {
    return {
      href: '/courses/9706/1-6-2-calculation-and-evaluation-of-ratios',
      label: 'Open ratios lesson →',
    }
  }
  return { href: courseHubHref(focusCode), label: `Open ${focusCode} courses →` }
}

/**
 * Build a short, honest desk briefing for the focus subject from recent marks.
 */
export function buildVaultPersonalBrief(opts: {
  focusCode: string | null
  focusName: string | null
  attempts: AttemptWithPaper[]
  preferredSubjectCodes: string[]
  targetGrade?: string | null
  /** Prefer the first course-path lesson (wired from vault-data). */
  nextLesson?: { href: string; title: string } | null
}): VaultPersonalBrief | null {
  const focusCode = opts.focusCode
  if (!focusCode) return null
  const focusName = opts.focusName || focusCode
  const focusAttempts = opts.attempts.filter(
    (a) => getAttemptSubjectCode(a, opts.preferredSubjectCodes) === focusCode
  )
  const recent = focusAttempts.slice(0, 5)
  const scored = recent.filter(
    (a) => typeof a.marks_earned === 'number' && typeof a.total_marks === 'number' && a.total_marks > 0
  )
  const recentAvgPct =
    scored.length > 0
      ? Math.round(
          scored.reduce((s, a) => s + (100 * (a.marks_earned as number)) / (a.total_marks as number), 0) /
            scored.length
        )
      : null

  const tagCounts = new Map<string, number>()
  for (const a of focusAttempts) {
    for (const t of a.syllabus_tags ?? []) {
      tagCounts.set(t, (tagCounts.get(t) ?? 0) + 1)
    }
  }
  const topTagEntries = [...tagCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3)
  const topTags = topTagEntries.map(([code]) => topicTitle(focusCode, code))

  const lines: string[] = []
  if (scored.length === 0) {
    lines.push(
      `Your ${focusName} desk is ready — mark a question to stock weak-topic drills and models.`
    )
  } else {
    lines.push(
      `Last ${scored.length} mark${scored.length === 1 ? '' : 's'} on ${focusName}: ~${recentAvgPct}% average.`
    )
    if (opts.targetGrade) {
      lines.push(
        recentAvgPct != null && recentAvgPct >= 85
          ? `Target ${opts.targetGrade} — you're posting strong scripts; keep the evaluation sharp.`
          : `Target ${opts.targetGrade} — close gaps with topical practice, then rematch.`
      )
    }
    if (topTags.length > 0) {
      lines.push(`Topics showing up in your scripts: ${topTags.join(' · ')}.`)
    }
    if (focusCode === '9708') {
      lines.push(
        'Economics Max tip: label every diagram, define in syllabus words, then evaluate with a reasoned judgement.'
      )
    }
  }

  const showcase = defaultShowcaseNext(focusCode)
  const nextHref =
    opts.nextLesson?.href ??
    (scored.length > 0 ? showcase.href : pastPaperHubHref(focusCode))
  const nextLabel = opts.nextLesson
    ? `Open ${opts.nextLesson.title} →`
    : scored.length > 0
      ? showcase.label
      : `Browse ${focusCode} papers →`

  const headline =
    scored.length === 0
      ? `${focusName} — your Max desk`
      : recentAvgPct != null && recentAvgPct >= 80
        ? `${focusName} — keep the A* pace`
        : `${focusName} — built around your recent marks`

  return {
    focusCode,
    focusName,
    headline,
    lines,
    recentAvgPct,
    attemptCount: focusAttempts.length,
    nextHref,
    nextLabel,
  }
}

/**
 * When mastery is thin, seed desk targets from tags on recent attempts.
 * Prefer tags from weaker scripts (low %) over frequently practiced strengths.
 */
export function weakTopicsFromAttemptTags(
  subjectCode: string,
  attempts: AttemptWithPaper[],
  preferredSubjectCodes: string[],
  limit = 4
): Array<{ code: string; name: string; reason: string }> {
  const scores = new Map<string, { weight: number; n: number }>()
  for (const a of attempts) {
    if (getAttemptSubjectCode(a, preferredSubjectCodes) !== subjectCode) continue
    const earned = typeof a.marks_earned === 'number' ? a.marks_earned : null
    const total = typeof a.total_marks === 'number' && a.total_marks > 0 ? a.total_marks : null
    const pct = earned != null && total != null ? (100 * earned) / total : 55
    // Lower % → higher weight; still count unscored attempts lightly.
    const attemptWeight = Math.max(8, 100 - pct)
    for (const t of a.syllabus_tags ?? []) {
      const cur = scores.get(t) ?? { weight: 0, n: 0 }
      cur.weight += attemptWeight
      cur.n += 1
      scores.set(t, cur)
    }
  }
  return [...scores.entries()]
    .sort((a, b) => b[1].weight - a[1].weight)
    .slice(0, limit)
    .map(([code, { n }]) => ({
      code,
      name: topicTitle(subjectCode, code),
      reason:
        n === 1
          ? `Showed up in a recent ${subjectCode} script — worth another pass.`
          : `Appeared in ${n} recent scripts — lock this topic in.`,
    }))
}
