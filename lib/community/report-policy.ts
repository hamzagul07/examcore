/**
 * Pure rules for community reports — who counts toward auto-hiding content
 * and how many reports one account may file a day.
 *
 * Why (code review 2026-09-25, §2 Community): the threshold was two reports
 * with no reporter-quality gate and no per-user cap, so two throwaway
 * accounts could suppress any post on the site instantly. Hiding is now a
 * three-reporter decision, and only established accounts get a vote.
 *
 * No server imports; exercised by report-policy.test.ts.
 */

/** Distinct qualifying reporters before content is hidden pending review. */
export const FLAG_THRESHOLD = 3
/** Accounts younger than this do not count toward the threshold. */
export const MIN_REPORTER_ACCOUNT_AGE_MS = 3 * 24 * 60 * 60 * 1000
/** Reputation below this (a moderation penalty) disqualifies a reporter. */
export const MIN_REPORTER_REPUTATION = 0
/** Reports one account may file in a rolling 24 hours. */
export const DAILY_REPORT_CAP = 10

export type ReporterProfile = {
  /** Null when the profile row predates the column — treated as established. */
  createdAt: string | null
  reputation: number | null
}

export type OpenReport = {
  reporterId: string | null
}

/**
 * Number of DISTINCT reporters whose reports count, excluding the content's
 * own author (a self-report is a deletion request, not a signal), accounts
 * with no profile at all, accounts younger than three days, and accounts
 * carrying a negative reputation.
 */
export function countQualifyingReporters(
  reports: OpenReport[],
  profiles: Map<string, ReporterProfile>,
  opts: { authorId: string | null; now?: number }
): number {
  const now = opts.now ?? Date.now()
  const counted = new Set<string>()
  for (const r of reports) {
    const id = r.reporterId
    if (!id || counted.has(id)) continue
    if (opts.authorId && id === opts.authorId) continue
    const profile = profiles.get(id)
    if (!profile) continue
    if (profile.createdAt) {
      const created = Date.parse(profile.createdAt)
      if (Number.isNaN(created) || now - created < MIN_REPORTER_ACCOUNT_AGE_MS) continue
    }
    if ((profile.reputation ?? 0) < MIN_REPORTER_REPUTATION) continue
    counted.add(id)
  }
  return counted.size
}

/** True once enough qualifying reporters have flagged the target. */
export function shouldAutoHide(qualifyingReporters: number): boolean {
  return qualifyingReporters >= FLAG_THRESHOLD
}
