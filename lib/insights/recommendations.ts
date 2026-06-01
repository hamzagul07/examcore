/**
 * Practice recommendations. Every recommendation points at a REAL row in
 * mark_schemes (matched by syllabus tag, then by subject) so the "Drill this"
 * loop can never deep-link to a question that doesn't exist.
 *
 * Uses the same `.contains('syllabus_tags', [...])` lookup already proven in
 * lib/omni-ai/hydrate-actions.ts.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import type { LeafMastery } from '@/lib/mastery'
import { MIN_ATTEMPTS_FOR_CONFIDENT_MASTERY } from '@/lib/mastery'
import type { Recommendation } from './types'

type SchemeRow = {
  paper_code: string | null
  paper_session: string | null
  question_number: string | null
  total_marks: number | null
  syllabus_tags: string[] | null
}

export type TopicTarget = {
  code: string
  name: string
  /** Honest reason this topic is worth practising now. */
  reason: string
}

/**
 * Rank topics worth practising: confirmed-critical leaves first (weakest %),
 * then under-sampled leaves the student has touched but not confirmed. Blind
 * spots (zero attempts) are deliberately excluded — we recommend reinforcing
 * real weaknesses, not guessing at untouched topics.
 */
export function topicTargetsFromMasteries(
  masteries: LeafMastery[],
  limit = 5
): TopicTarget[] {
  const critical = masteries
    .filter(
      (m) =>
        m.level === 'critical' &&
        m.attemptsCount >= MIN_ATTEMPTS_FOR_CONFIDENT_MASTERY
    )
    .sort((a, b) => a.percentage - b.percentage)
    .map((m) => ({
      code: m.code,
      name: m.name,
      reason: `You're at ${Math.round(m.percentage)}% on ${m.code} — the biggest mark gap to close.`,
    }))

  const sampled = masteries
    .filter((m) => m.level === 'sampled')
    .sort((a, b) => a.percentage - b.percentage)
    .map((m) => ({
      code: m.code,
      name: m.name,
      reason: `Only ${m.attemptsCount} attempt${m.attemptsCount === 1 ? '' : 's'} so far — one more confirms where ${m.name} really stands.`,
    }))

  return [...critical, ...sampled].slice(0, limit)
}

function toRecommendation(
  row: SchemeRow,
  target: { label: string; reason: string; topicCode?: string }
): Recommendation | null {
  if (!row.paper_code || !row.paper_session || !row.question_number) return null
  return {
    paperCode: row.paper_code,
    paperSession: row.paper_session,
    questionNumber: row.question_number,
    totalMarks: typeof row.total_marks === 'number' ? row.total_marks : 0,
    reason: target.reason,
    targetLabel: target.label,
    topicCode: target.topicCode,
  }
}

function dedupeKey(r: Recommendation): string {
  return `${r.paperCode}|${r.paperSession}|${r.questionNumber}`
}

/**
 * Topic-targeted recommendations for active users. Runs one tag lookup per
 * target in parallel, prefers short (2-6 mark) questions, and de-dupes.
 */
export async function fetchTopicRecommendations(
  supabase: SupabaseClient,
  targets: TopicTarget[],
  limit = 3
): Promise<Recommendation[]> {
  if (targets.length === 0) return []

  const results = await Promise.all(
    targets.slice(0, limit + 2).map(async (t) => {
      const { data } = await supabase
        .from('mark_schemes')
        .select(
          'paper_code, paper_session, question_number, total_marks, syllabus_tags'
        )
        .contains('syllabus_tags', [t.code])
        .gte('total_marks', 2)
        .lte('total_marks', 8)
        .limit(1)
      const row = (data?.[0] as SchemeRow | undefined) ?? null
      return row
        ? toRecommendation(row, {
            label: t.name,
            reason: t.reason,
            topicCode: t.code,
          })
        : null
    })
  )

  const seen = new Set<string>()
  const out: Recommendation[] = []
  for (const r of results) {
    if (!r) continue
    const key = dedupeKey(r)
    if (seen.has(key)) continue
    seen.add(key)
    out.push(r)
    if (out.length >= limit) break
  }
  return out
}

/**
 * Generic subject recommendations for low-attempt users (no personalisation
 * yet). Pulls real short questions from the subject's papers.
 */
export async function fetchGenericRecommendations(
  supabase: SupabaseClient,
  subjectCode: string,
  subjectLabel: string,
  limit = 3
): Promise<Recommendation[]> {
  const { data } = await supabase
    .from('mark_schemes')
    .select(
      'paper_code, paper_session, question_number, total_marks, syllabus_tags'
    )
    .like('paper_code', `${subjectCode}/%`)
    .gte('total_marks', 2)
    .lte('total_marks', 6)
    .limit(12)

  const rows = (data as SchemeRow[] | null) ?? []
  const seen = new Set<string>()
  const out: Recommendation[] = []
  for (const row of rows) {
    const rec = toRecommendation(row, {
      label: subjectLabel,
      reason: `A short ${subjectLabel} question to get more signal into your profile.`,
    })
    if (!rec) continue
    const key = dedupeKey(rec)
    if (seen.has(key)) continue
    seen.add(key)
    out.push(rec)
    if (out.length >= limit) break
  }
  return out
}
