/**
 * Live Max Vault topic banks — pull full stems from mark_schemes by
 * syllabus_tags so students can sit a question, then mark answer-only.
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import type { TopicTarget } from '@/lib/insights/recommendations'
import type { Recommendation } from '@/lib/insights/types'
import { resolveBoard } from '@/lib/courses/board'
import {
  buildVaultQuestionBank,
  buildVaultQuestionBanks,
  getTopicQuestionPages,
  type VaultBankQuestion,
  type VaultQuestionBank,
  type VaultTopicGroup,
} from '@/lib/max/vault-question-bank'
import { pastPaperMarkHref } from '@/lib/marking/past-paper-mark-href'
import { normalizePaperSession } from '@/lib/marking/normalize-paper-session'

export type { VaultTopicGroup }

type SchemeRow = {
  paper_code: string | null
  paper_session: string | null
  question_number: string | null
  question_text: string | null
  total_marks: number | null
  syllabus_tags: string[] | null
}

async function fetchTaggedQuestions(
  supabase: SupabaseClient,
  subjectCode: string,
  topicCode: string,
  limit: number
): Promise<SchemeRow[]> {
  const { data, error } = await supabase
    .from('mark_schemes')
    .select(
      'paper_code, paper_session, question_number, question_text, total_marks, syllabus_tags'
    )
    .like('paper_code', `${subjectCode}%`)
    .contains('syllabus_tags', [topicCode])
    .not('question_text', 'is', null)
    .gte('total_marks', 2)
    .lte('total_marks', 12)
    .order('total_marks', { ascending: true })
    .limit(limit)

  if (error || !data?.length) return []
  return data as SchemeRow[]
}

function rowToBankQuestion(
  row: SchemeRow,
  subjectCode: string,
  subjectLabel: string,
  topicCode: string,
  topicLabel: string,
  source: VaultBankQuestion['source']
): VaultBankQuestion | null {
  if (!row.paper_code || !row.paper_session || !row.question_number) return null
  const session = normalizePaperSession(row.paper_session).label || row.paper_session
  const page = getTopicQuestionPages(subjectCode).find((p) => p.topicCode === topicCode)
  return {
    id: `live:${row.paper_code}:${row.paper_session}:${row.question_number}`,
    subjectCode,
    subjectLabel,
    topicCode,
    topicLabel,
    paperCode: row.paper_code,
    paperSession: session,
    questionNumber: row.question_number,
    totalMarks: row.total_marks,
    stem: row.question_text,
    reason: `${subjectCode} · ${topicLabel} — sit it, then mark against the official scheme.`,
    source,
    attemptHref: pastPaperMarkHref({
      paperCode: row.paper_code,
      paperSession: session,
      questionNumber: row.question_number,
      pattern: `${subjectCode} · ${topicLabel}`,
      reason: `Practice ${topicLabel} for ${subjectCode}.`,
      returnTo: 'vault',
    }),
    topicHubHref: page
      ? `/past-papers/${encodeURIComponent(subjectCode)}/${encodeURIComponent(page.topicSlug)}`
      : `/past-papers/${encodeURIComponent(subjectCode)}`,
  }
}

function topicTargetsForSubject(
  subjectCode: string,
  weakTopics: TopicTarget[]
): TopicTarget[] {
  if (weakTopics.length > 0) return weakTopics.slice(0, 5)
  // No mastery yet — stock from topical cache titles so the desk isn't empty.
  return getTopicQuestionPages(subjectCode)
    .slice(0, 5)
    .map((p) => ({
      code: p.topicCode,
      name: p.title,
      reason: `Syllabus topic ${p.topicCode} — build marks here.`,
    }))
}

async function enrichCambridgeBank(
  supabase: SupabaseClient,
  base: VaultQuestionBank,
  weakTopics: TopicTarget[],
  perTopic = 4
): Promise<VaultQuestionBank & { topics: VaultTopicGroup[] }> {
  const targets = topicTargetsForSubject(base.subjectCode, weakTopics)
  const topics: VaultTopicGroup[] = []
  const flat: VaultBankQuestion[] = []
  const seen = new Set<string>()

  // Prefer weakness drills that already point at real papers (keep at top).
  for (const q of base.questions.filter((x) => x.source === 'weakness')) {
    if (seen.has(q.id)) continue
    seen.add(q.id)
    flat.push(q)
  }

  const fetched = await Promise.all(
    targets.map(async (t) => {
      const rows = await fetchTaggedQuestions(
        supabase,
        base.subjectCode,
        t.code,
        perTopic
      )
      return { t, rows }
    })
  )

  for (const { t, rows } of fetched) {
    const qs: VaultBankQuestion[] = []
    for (const row of rows) {
      const item = rowToBankQuestion(
        row,
        base.subjectCode,
        base.subjectLabel,
        t.code,
        t.name,
        weakTopics.some((w) => w.code === t.code) ? 'weakness' : 'syllabus'
      )
      if (!item || seen.has(item.id)) continue
      seen.add(item.id)
      qs.push(item)
      flat.push(item)
    }
    if (qs.length > 0) {
      topics.push({ topicCode: t.code, topicLabel: t.name, questions: qs })
    }
  }

  topics.sort((a, b) =>
    a.topicCode.localeCompare(b.topicCode, undefined, { numeric: true })
  )

  return {
    ...base,
    questions: flat.slice(0, 24),
    topics,
    note:
      flat.length > 0
        ? `Live ${base.subjectCode} bank from your tagged papers. Sit a question, then Mark — answer only.`
        : base.note,
  }
}

/**
 * Build desks for every profile subject; Cambridge shelves get live topic groups.
 */
export async function loadVaultQuestionBanks(opts: {
  supabase: SupabaseClient
  shelves: Array<{
    code: string
    name: string
    weakTopics: TopicTarget[]
    drills: Recommendation[]
  }>
  focusCode: string | null
}): Promise<Array<VaultQuestionBank & { topics?: VaultTopicGroup[] }>> {
  const bases = buildVaultQuestionBanks(opts.shelves, {
    limitPerSubject: 6,
    focusCode: opts.focusCode,
  })

  const out: Array<VaultQuestionBank & { topics?: VaultTopicGroup[] }> = []
  for (const base of bases) {
    if (resolveBoard(base.subjectCode) !== 'cambridge') {
      out.push({ ...base, topics: undefined })
      continue
    }
    const shelf = opts.shelves.find((s) => s.code === base.subjectCode)
    const enriched = await enrichCambridgeBank(
      opts.supabase,
      base,
      shelf?.weakTopics ?? [],
      4
    )
    out.push(enriched)
  }

  // Keep focus first (buildVaultQuestionBanks already sorts; preserve).
  return out
}

/** Sync helper kept for tests — live path uses loadVaultQuestionBanks. */
export function buildEmptyTopicBank(
  subjectCode: string,
  subjectLabel: string,
  weakTopics: TopicTarget[],
  drills: Recommendation[]
): VaultQuestionBank | null {
  return buildVaultQuestionBank({
    subjectCode,
    subjectLabel,
    weakTopics,
    drills,
    limit: 6,
  })
}
