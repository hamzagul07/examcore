/**
 * Max Vault Cambridge question bank — real past-paper questions from
 * mark_schemes recommendations + topical stem cache, attempted via /mark
 * against the official Cambridge mark scheme.
 *
 * Reads the topical JSON cache directly (not via lib/seo/topic-questions) so
 * Vault assembly stays free of server-only SEO import chains.
 */
import cache from '@/lib/past-paper-topics-cache.json'
import type { Recommendation } from '@/lib/insights/types'
import { drillHref, topicDrillHref } from '@/lib/insights/drill-link'
import type { TopicTarget } from '@/lib/insights/recommendations'
import { isIbSubjectCode } from '@/lib/ib/marking-config'
import { pastPaperHubHref } from '@/lib/max/paper-practice-links'

type TopicQuestion = {
  stem: string
  marks: number | null
  sessionLabel: string
  paperCode: string
  questionNumber: string
  markHref: string
}

type TopicQuestionPage = {
  topicCode: string
  topicSlug: string
  title: string
  questions: TopicQuestion[]
}

const TOPIC_CACHE = cache as Record<string, TopicQuestionPage[]>

function getTopicQuestionPages(code: string): TopicQuestionPage[] {
  return TOPIC_CACHE[code] ?? []
}

export type VaultBankQuestion = {
  id: string
  subjectCode: string
  subjectLabel: string
  topicCode: string | null
  topicLabel: string
  paperCode: string
  paperSession: string
  questionNumber: string
  totalMarks: number | null
  stem: string | null
  reason: string
  source: 'weakness' | 'syllabus'
  /** Attempt on /mark — checked against the Cambridge mark scheme. */
  attemptHref: string
  /** Browse more topical questions for this topic (when available). */
  topicHubHref: string | null
}

export type VaultQuestionBank = {
  subjectCode: string
  subjectLabel: string
  /** Cambridge past-papers hub or IB desk. */
  papersHubHref: string
  questions: VaultBankQuestion[]
  /** Honest coverage note for empty / thin banks. */
  note: string
}

/** Map profile subject → Cambridge topical cache code when possible. */
export function topicalCatalogCode(subjectCode: string): string | null {
  if (getTopicQuestionPages(subjectCode).length > 0) return subjectCode
  if (isIbSubjectCode(subjectCode)) {
    const base = subjectCode.replace(/^ib-/, '').replace(/-(hl|sl)$/, '')
    const map: Record<string, string> = {
      'maths-aa': '9709',
      'maths-ai': '9709',
      physics: '9702',
      chemistry: '9701',
      biology: '9700',
      economics: '9708',
    }
    const code = map[base]
    return code && getTopicQuestionPages(code).length > 0 ? code : null
  }
  if (/^wma|^wme|^wst|^9ma/i.test(subjectCode)) {
    return getTopicQuestionPages('9709').length > 0 ? '9709' : null
  }
  if (/^wph|^9ph/i.test(subjectCode)) {
    return getTopicQuestionPages('9702').length > 0 ? '9702' : null
  }
  if (/^wch|^9ch/i.test(subjectCode)) {
    return getTopicQuestionPages('9701').length > 0 ? '9701' : null
  }
  if (/^wbi|^9bi/i.test(subjectCode)) {
    return getTopicQuestionPages('9700').length > 0 ? '9700' : null
  }
  return null
}

function topicHubForCode(catalogCode: string, topicCode: string | null | undefined): string | null {
  if (!topicCode) return `/past-papers/${encodeURIComponent(catalogCode)}`
  const page = getTopicQuestionPages(catalogCode).find((p) => p.topicCode === topicCode)
  if (page) {
    return `/past-papers/${encodeURIComponent(catalogCode)}/${encodeURIComponent(page.topicSlug)}`
  }
  return `/past-papers/${encodeURIComponent(catalogCode)}`
}

function fromRecommendation(
  rec: Recommendation,
  subjectCode: string,
  subjectLabel: string,
  catalogCode: string | null
): VaultBankQuestion {
  return {
    id: `rec:${rec.paperCode}:${rec.paperSession}:${rec.questionNumber}`,
    subjectCode,
    subjectLabel,
    topicCode: rec.topicCode ?? null,
    topicLabel: rec.targetLabel,
    paperCode: rec.paperCode,
    paperSession: rec.paperSession,
    questionNumber: rec.questionNumber,
    totalMarks: rec.totalMarks,
    stem: null,
    reason: rec.reason,
    source: 'weakness',
    attemptHref: drillHref(rec, rec.targetLabel, { returnTo: 'vault' }),
    topicHubHref: catalogCode ? topicHubForCode(catalogCode, rec.topicCode) : null,
  }
}

/** Convert topical cache links into practice deep-links (/mark uses `q`, not `question`). */
export function topicalAttemptHref(
  q: TopicQuestion,
  opts?: { pattern?: string; reason?: string }
): string {
  const params = new URLSearchParams({
    practice: '1',
    paper: q.paperCode,
    session: q.sessionLabel,
    q: q.questionNumber,
    return: 'vault',
    pattern: opts?.pattern || 'Cambridge question bank',
    reason:
      opts?.reason ||
      'Sit this Cambridge past-paper question, then mark against the official scheme.',
  })
  // Prefer short session codes when markHref already has them (e.g. w24).
  try {
    const fromCache = new URL(q.markHref, 'https://markscheme.app')
    const shortSession = fromCache.searchParams.get('session')
    if (shortSession && !/\s+\d{4}$/.test(shortSession) && shortSession.length <= 8) {
      params.set('session', shortSession)
    }
  } catch {
    /* keep sessionLabel */
  }
  return `/mark?${params.toString()}`
}

function fromTopicCache(
  subjectCode: string,
  subjectLabel: string,
  catalogCode: string,
  q: TopicQuestion,
  topicCode: string,
  topicTitle: string,
  topicSlug: string
): VaultBankQuestion {
  return {
    id: `top:${q.paperCode}:${q.sessionLabel}:${q.questionNumber}`,
    subjectCode,
    subjectLabel,
    topicCode,
    topicLabel: topicTitle,
    paperCode: q.paperCode,
    paperSession: q.sessionLabel,
    questionNumber: q.questionNumber,
    totalMarks: q.marks,
    stem: q.stem,
    reason: `Cambridge ${catalogCode} topical question — sit it, then mark against the official scheme.`,
    source: 'syllabus',
    attemptHref: topicalAttemptHref(q, {
      pattern: topicTitle,
      reason: `Practice ${topicTitle} from the Cambridge topical bank.`,
    }),
    topicHubHref: `/past-papers/${encodeURIComponent(catalogCode)}/${encodeURIComponent(topicSlug)}`,
  }
}

/**
 * Build a Max-only question bank for the focus subject.
 * Prefer weakness-matched drills; fill from topical Cambridge cache.
 */
export function buildVaultQuestionBank(opts: {
  subjectCode: string | null
  subjectLabel: string | null
  weakTopics: TopicTarget[]
  drills: Recommendation[]
  limit?: number
}): VaultQuestionBank | null {
  const subjectCode = opts.subjectCode
  if (!subjectCode) return null
  const subjectLabel = opts.subjectLabel || subjectCode
  const limit = opts.limit ?? 8
  const papersHubHref = pastPaperHubHref(subjectCode)

  if (isIbSubjectCode(subjectCode)) {
    const questions: VaultBankQuestion[] = opts.weakTopics.slice(0, limit).map((t) => ({
      id: `ib:${subjectCode}:${t.code}`,
      subjectCode,
      subjectLabel,
      topicCode: t.code,
      topicLabel: t.name,
      paperCode: subjectCode,
      paperSession: 'topic drill',
      questionNumber: t.code,
      totalMarks: null,
      stem: null,
      reason: t.reason,
      source: 'weakness' as const,
      attemptHref: topicDrillHref(subjectCode, t.code, { returnTo: 'vault' }),
      topicHubHref: papersHubHref,
    }))
    return {
      subjectCode,
      subjectLabel,
      papersHubHref,
      questions,
      note:
        questions.length > 0
          ? 'IB drills generate a practice question for your weak topic, then mark it on MarkScheme.'
          : 'Mark a few IB questions so we can pin topic drills here. Licensed past papers stay on the IB desk.',
    }
  }

  const catalog = topicalCatalogCode(subjectCode)
  const out: VaultBankQuestion[] = []
  const seen = new Set<string>()

  for (const rec of opts.drills) {
    const item = fromRecommendation(rec, subjectCode, subjectLabel, catalog)
    if (seen.has(item.id)) continue
    seen.add(item.id)
    out.push(item)
    if (out.length >= limit) break
  }

  if (catalog && out.length < limit) {
    const pages = getTopicQuestionPages(catalog)
    const weakCodes = new Set(opts.weakTopics.map((t) => t.code))
    const preferred = [
      ...pages.filter((p) => weakCodes.has(p.topicCode)),
      ...pages.filter((p) => !weakCodes.has(p.topicCode)),
    ]

    for (const page of preferred) {
      for (const q of page.questions) {
        const item = fromTopicCache(
          subjectCode,
          subjectLabel,
          catalog,
          q,
          page.topicCode,
          page.title,
          page.topicSlug
        )
        if (seen.has(item.id)) continue
        seen.add(item.id)
        out.push(item)
        if (out.length >= limit) break
      }
      if (out.length >= limit) break
    }
  }

  const note =
    out.length > 0
      ? `Real Cambridge questions. Attempt on MarkScheme — checked against the official mark scheme${catalog ? ` for ${catalog}` : ''}.`
      : 'Mark a few questions so we can stock this bank from your weak topics. Cambridge topical coverage expands as more papers are imported.'

  return {
    subjectCode,
    subjectLabel,
    papersHubHref,
    questions: out,
    note,
  }
}
