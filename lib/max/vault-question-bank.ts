/**
 * Max Vault per-subject question desks.
 *
 * Cambridge subjects get CAIE past-paper rows (mark_schemes + topical cache).
 * Other boards never see Cambridge papers — they get their own mark desk /
 * IB criterion drills only.
 */
import cache from '@/lib/past-paper-topics-cache.json'
import type { Recommendation } from '@/lib/insights/types'
import { drillHref, topicDrillHref } from '@/lib/insights/drill-link'
import type { TopicTarget } from '@/lib/insights/recommendations'
import { resolveBoard, type Board } from '@/lib/courses/board'
import { pastPaperHubHref } from '@/lib/max/paper-practice-links'
import { pastPaperMarkHref } from '@/lib/marking/past-paper-mark-href'
import { normalizePaperSession } from '@/lib/marking/normalize-paper-session'
import { edexcelMarkHref } from '@/lib/edexcel/marking'
import { aqaMarkHref } from '@/lib/aqa/marking'
import { oxfordaqaMarkHref } from '@/lib/oxfordaqa/marking'

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

export function getTopicQuestionPages(code: string): TopicQuestionPage[] {
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
  source: 'weakness' | 'syllabus' | 'desk'
  attemptHref: string
  topicHubHref: string | null
}

export type VaultTopicGroup = {
  topicCode: string
  topicLabel: string
  questions: VaultBankQuestion[]
}

export type VaultQuestionBank = {
  subjectCode: string
  subjectLabel: string
  /** cambridge | ib | edexcel | aqa | oxfordaqa | ap */
  board: Board
  /** Short board label for UI (CAIE, Edexcel, IB, …). */
  boardLabel: string
  /** Section eyebrow — subject-specific, never a generic "Cambridge bank". */
  eyebrow: string
  /** Section title. */
  title: string
  papersHubHref: string
  /** Primary board mark desk when the list is thin. */
  markDeskHref: string
  questions: VaultBankQuestion[]
  /** Live topic groups (Cambridge desks after DB enrich). */
  topics?: VaultTopicGroup[]
  note: string
}

function boardUiLabel(board: Board): string {
  switch (board) {
    case 'cambridge':
      return 'CAIE'
    case 'ib':
      return 'IB'
    case 'edexcel':
      return 'Edexcel'
    case 'aqa':
      return 'AQA'
    case 'oxfordaqa':
      return 'OxfordAQA'
    case 'ap':
      return 'AP'
    default:
      return 'Exam'
  }
}

function withVaultReturn(href: string): string {
  if (href.includes('return=')) return href
  return `${href}${href.includes('?') ? '&' : '?'}return=vault`
}

function markDeskHrefFor(board: Board, subjectCode: string): string {
  switch (board) {
    case 'edexcel':
      return withVaultReturn(edexcelMarkHref(subjectCode))
    case 'aqa':
      return withVaultReturn(aqaMarkHref(subjectCode))
    case 'oxfordaqa':
      return withVaultReturn(oxfordaqaMarkHref(subjectCode))
    case 'ib':
      return pastPaperHubHref(subjectCode)
    case 'ap':
      return withVaultReturn(
        `/mark?board=ap&subject=${encodeURIComponent(subjectCode)}`
      )
    case 'cambridge':
    default:
      return withVaultReturn(`/mark?subject=${encodeURIComponent(subjectCode)}`)
  }
}

/** Only Cambridge syllabus codes may use the CAIE topical cache — no board aliases. */
export function topicalCatalogCode(subjectCode: string): string | null {
  if (resolveBoard(subjectCode) !== 'cambridge') return null
  return getTopicQuestionPages(subjectCode).length > 0 ? subjectCode : null
}

function isCambridgePaperCode(paperCode: string): boolean {
  return /^\d{4}(\/|\b)/.test(paperCode.trim())
}

function drillAllowedForBoard(board: Board, rec: Recommendation): boolean {
  if (board === 'cambridge') return isCambridgePaperCode(rec.paperCode)
  if (board === 'edexcel') {
    // Edexcel units / papers — never CAIE 97xx rows.
    return !isCambridgePaperCode(rec.paperCode)
  }
  if (board === 'aqa' || board === 'oxfordaqa' || board === 'ap') {
    return !isCambridgePaperCode(rec.paperCode)
  }
  // IB uses topic drills, not past-paper recommendations.
  return false
}

function topicHubForCambridge(catalogCode: string, topicCode: string | null | undefined): string | null {
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
    topicHubHref: catalogCode ? topicHubForCambridge(catalogCode, rec.topicCode) : null,
  }
}

/** Convert topical cache rows into answer-only /mark deep-links. */
export function topicalAttemptHref(
  q: TopicQuestion,
  opts?: { pattern?: string; reason?: string }
): string {
  // Prefer full session label from cache; fall back to short code on markHref.
  let session = q.sessionLabel
  try {
    const fromCache = new URL(q.markHref, 'https://markscheme.app')
    const raw = fromCache.searchParams.get('session')
    if (raw && !normalizePaperSession(session).year && normalizePaperSession(raw).year) {
      session = raw
    }
  } catch {
    /* keep sessionLabel */
  }
  return pastPaperMarkHref({
    paperCode: q.paperCode,
    paperSession: session,
    questionNumber: q.questionNumber,
    pattern: opts?.pattern || 'Past-paper practice',
    reason:
      opts?.reason ||
      'Sit this past-paper question, then mark against the official scheme.',
    returnTo: 'vault',
  })
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
    reason: `${catalogCode} topical question — sit it, then mark against the official CAIE scheme.`,
    source: 'syllabus',
    attemptHref: topicalAttemptHref(q, {
      pattern: `${catalogCode} · ${topicTitle}`,
      reason: `Practice ${topicTitle} for ${catalogCode}.`,
    }),
    topicHubHref: `/past-papers/${encodeURIComponent(catalogCode)}/${encodeURIComponent(topicSlug)}`,
  }
}

function deskQuestion(
  subjectCode: string,
  subjectLabel: string,
  boardLabel: string,
  href: string,
  topic: TopicTarget | null
): VaultBankQuestion {
  return {
    id: `desk:${subjectCode}:${topic?.code ?? 'open'}`,
    subjectCode,
    subjectLabel,
    topicCode: topic?.code ?? null,
    topicLabel: topic?.name ?? `${boardLabel} mark desk`,
    paperCode: subjectCode,
    paperSession: boardLabel,
    questionNumber: topic?.code ?? '—',
    totalMarks: null,
    stem: null,
    reason:
      topic?.reason ??
      `Open the ${boardLabel} mark desk for ${subjectLabel} — your board, not another syllabus.`,
    source: 'desk',
    attemptHref: href,
    topicHubHref: null,
  }
}

/**
 * Build one subject's question desk. Board-scoped: Cambridge topical cache
 * never fills Edexcel / AQA / IB / AP shelves.
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
  const limit = opts.limit ?? 6
  const board = resolveBoard(subjectCode)
  const boardLabel = boardUiLabel(board)
  const papersHubHref = pastPaperHubHref(subjectCode)
  const markDeskHref = markDeskHrefFor(board, subjectCode)

  if (board === 'ib') {
    const questions: VaultBankQuestion[] = opts.weakTopics.slice(0, limit).map((t) => ({
      id: `ib:${subjectCode}:${t.code}`,
      subjectCode,
      subjectLabel,
      topicCode: t.code,
      topicLabel: t.name,
      paperCode: subjectCode,
      paperSession: 'IB topic',
      questionNumber: t.code,
      totalMarks: null,
      stem: null,
      reason: t.reason,
      source: 'weakness' as const,
      attemptHref: topicDrillHref(subjectCode, t.code, { returnTo: 'vault' }),
      topicHubHref: papersHubHref,
    }))
    if (questions.length === 0) {
      questions.push(
        deskQuestion(subjectCode, subjectLabel, boardLabel, papersHubHref, null)
      )
    }
    return {
      subjectCode,
      subjectLabel,
      board,
      boardLabel,
      eyebrow: `IB · ${subjectCode.replace(/^ib-/, '')}`,
      title: `${subjectLabel} criterion drills`,
      papersHubHref,
      markDeskHref: papersHubHref,
      questions,
      note:
        questions[0]?.source === 'desk'
          ? 'IB keeps licensed papers on the IB desk. Topic drills here mark against IB criteria — not CAIE schemes.'
          : 'IB topic drills for this subject — marked against IB criteria, not Cambridge papers.',
    }
  }

  if (board !== 'cambridge') {
    const out: VaultBankQuestion[] = []
    const seen = new Set<string>()
    for (const rec of opts.drills) {
      if (!drillAllowedForBoard(board, rec)) continue
      const item = fromRecommendation(rec, subjectCode, subjectLabel, null)
      if (seen.has(item.id)) continue
      seen.add(item.id)
      out.push(item)
      if (out.length >= limit) break
    }
    if (out.length === 0) {
      if (opts.weakTopics.length > 0) {
        for (const t of opts.weakTopics.slice(0, Math.min(3, limit))) {
          out.push(
            deskQuestion(subjectCode, subjectLabel, boardLabel, markDeskHref, t)
          )
        }
      } else {
        out.push(
          deskQuestion(subjectCode, subjectLabel, boardLabel, markDeskHref, null)
        )
      }
    }
    return {
      subjectCode,
      subjectLabel,
      board,
      boardLabel,
      eyebrow: `${boardLabel} · ${subjectCode}`,
      title: `${subjectLabel} practice desk`,
      papersHubHref,
      markDeskHref,
      questions: out,
      note: `${boardLabel} only — this shelf never shows Cambridge (CAIE) past papers. Mark on the ${boardLabel} desk for ${subjectCode}.`,
    }
  }

  // Cambridge / CAIE — this subject code only (no cross-board aliases).
  const catalog = topicalCatalogCode(subjectCode)
  const out: VaultBankQuestion[] = []
  const seen = new Set<string>()

  for (const rec of opts.drills) {
    if (!drillAllowedForBoard('cambridge', rec)) continue
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
        if (!isCambridgePaperCode(q.paperCode)) continue
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

  return {
    subjectCode,
    subjectLabel,
    board,
    boardLabel,
    eyebrow: `${subjectCode} · CAIE`,
    title: `${subjectLabel} past-paper desk`,
    papersHubHref,
    markDeskHref,
    questions: out,
    note:
      out.length > 0
        ? `Official CAIE questions for ${subjectCode} only. Attempt, then mark against the ${subjectCode} mark scheme.`
        : `No ${subjectCode} rows yet — mark a question once, or browse the ${subjectCode} paper hub. Other boards stay on their own shelves.`,
  }
}

/** One desk per profile subject (board-isolated). */
export function buildVaultQuestionBanks(
  shelves: Array<{
    code: string
    name: string
    weakTopics: TopicTarget[]
    drills: Recommendation[]
  }>,
  opts?: { limitPerSubject?: number; focusCode?: string | null }
): VaultQuestionBank[] {
  const limit = opts?.limitPerSubject ?? 6
  const banks = shelves
    .map((s) =>
      buildVaultQuestionBank({
        subjectCode: s.code,
        subjectLabel: s.name,
        weakTopics: s.weakTopics,
        drills: s.drills,
        limit,
      })
    )
    .filter((b): b is VaultQuestionBank => b != null)

  if (!opts?.focusCode) return banks
  return [...banks].sort((a, b) => {
    if (a.subjectCode === opts.focusCode) return -1
    if (b.subjectCode === opts.focusCode) return 1
    return a.subjectLabel.localeCompare(b.subjectLabel)
  })
}
