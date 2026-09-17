/**
 * Which topics come up most — from the mark schemes we hold, not a guess.
 *
 * `mark_schemes.syllabus_tags` carries the leaf codes each question tests.
 * Counting the PAPERS a topic appears in (not the questions) is the honest
 * measure: a topic that is one question on every paper is high-yield; a topic
 * that is six questions on one paper is not. This is what the "I need to pass"
 * plan spends its hours on.
 *
 * The roadmap asks a stricter question of the same rows: can the plan SAY
 * "set in n of the N sittings MarkScheme has indexed"? Only when N papers
 * are well tagged and the topic is on at least a few of them; otherwise it
 * says nothing, because tags are classifier output and a subject with three
 * tagged papers is not a pattern. paperFrequency() counts whole papers —
 * untagged questions included, so a paper with one tagged question out of
 * forty is not "indexed" — and frequencyFor() applies the thresholds.
 *
 * Pure. The scan of mark_schemes lives in lib/plan/study-plan-service.ts.
 */

import type { PlanTopic } from '@/lib/plan/build-study-plan'
import { normalizePaperSession } from '@/lib/marking/normalize-paper-session'
import type { TopicSignals } from '@/lib/plan/roadmap-types'

export type TaggedSchemeRow = {
  paper_code: string | null
  paper_session: string | null
  syllabus_tags: string[] | null
}

/**
 * Rank leaf codes by how many distinct papers they appear in.
 *
 * Only codes the resolver knows are counted: tagger output includes parent
 * codes and the odd stray, and a plan block pointing at "1" is not a topic.
 */
export function rankTagsByPaper(
  rows: TaggedSchemeRow[],
  nameOf: (code: string) => string | undefined,
  limit = 8
): PlanTopic[] {
  const papersByTag = new Map<string, Set<string>>()
  for (const row of rows) {
    if (!row.paper_code || !row.syllabus_tags?.length) continue
    const paperKey = `${row.paper_code}|${row.paper_session ?? ''}`
    for (const tag of new Set(row.syllabus_tags)) {
      if (!nameOf(tag)) continue
      let set = papersByTag.get(tag)
      if (!set) {
        set = new Set()
        papersByTag.set(tag, set)
      }
      set.add(paperKey)
    }
  }

  return [...papersByTag.entries()]
    .map(([code, papers]) => ({ code, papers: papers.size }))
    .sort((a, b) => b.papers - a.papers || compareCodes(a.code, b.code))
    .slice(0, limit)
    .map((t) => ({
      code: t.code,
      name: nameOf(t.code) ?? t.code,
      source: 'high_yield' as const,
      weight: t.papers,
    }))
}

/** "1.10" sorts after "1.9": compare dotted codes numerically, segment by segment. */
function compareCodes(a: string, b: string): number {
  const as = a.split('.')
  const bs = b.split('.')
  for (let i = 0; i < Math.max(as.length, bs.length); i++) {
    const x = Number(as[i] ?? 0)
    const y = Number(bs[i] ?? 0)
    if (Number.isNaN(x) || Number.isNaN(y)) return a.localeCompare(b)
    if (x !== y) return x - y
  }
  return 0
}

// --- indexed-paper frequency (roadmap) ---------------------------------------------------

/** Well-tagged papers a subject (or component) needs before any frequency claim is made. */
export const FREQUENCY_MIN_PAPERS = 6
/** Well-tagged papers a topic must appear on before its frequency is quoted. */
export const FREQUENCY_MIN_HITS = 3
/** A paper counts as well tagged with at least this many tagged questions ... */
export const PAPER_MIN_TAGGED = 5
/** ... and at least this share of its questions tagged. */
export const PAPER_MIN_TAGGED_SHARE = 0.5

/** Every question row of a subject, tagged or not: the denominator is the whole paper. */
export type SchemeRowLite = {
  paper_code: string | null
  paper_session: string | null
  syllabus_tags: string[] | null
}

export type PaperFrequency = {
  /** Well-tagged papers in scope. */
  of: number
  /** Earliest and latest sessions among them, as labels ('May/June 2024'). */
  from?: string
  to?: string
  /** Tagged questions over all questions on the well-tagged papers. */
  taggedShare: number
  /** Leaf code → well-tagged papers it appears on. */
  byTag: Map<string, number>
  scope: 'component' | 'subject'
}

const SEASON_ORDER: Record<string, number> = { 'February/March': 0, 'May/June': 1, 'October/November': 2 }
const SEASON_SHORT: Record<string, string> = { 'February/March': 'Feb/Mar', 'May/June': 'May/June', 'October/November': 'Oct/Nov' }

/** A session as it reads in a sentence and sorts on a timeline; null when it has no year. */
function sessionPoint(raw: string | null): { label: string; key: number } | null {
  if (!raw) return null
  const s = normalizePaperSession(raw)
  if (s.year === null) return null
  const season = s.season ?? ''
  const order = SEASON_ORDER[season] ?? 1
  const short = SEASON_SHORT[season] ?? season
  return { label: short ? `${short} ${s.year}` : String(s.year), key: s.year * 10 + order }
}

/**
 * Per-paper tagging over ALL rows, grouped by paper_code|paper_session. A
 * component digit narrows to that paper ('9709/1…' for Paper 1) and the
 * result says so in `scope`, so the copy can name the component.
 */
export function paperFrequency(
  rows: SchemeRowLite[],
  nameOf: (code: string) => string | undefined,
  opts: { componentDigit?: string | null } = {}
): PaperFrequency {
  const digit = opts.componentDigit ?? null
  const scope: PaperFrequency['scope'] = digit ? 'component' : 'subject'
  const papers = new Map<string, { session: string | null; questions: number; tagged: number; tags: Set<string> }>()

  for (const row of rows) {
    if (!row.paper_code) continue
    if (digit) {
      const slash = row.paper_code.indexOf('/')
      if (slash < 0 || row.paper_code.charAt(slash + 1) !== digit) continue
    }
    const key = `${row.paper_code}|${row.paper_session ?? ''}`
    let paper = papers.get(key)
    if (!paper) {
      paper = { session: row.paper_session, questions: 0, tagged: 0, tags: new Set() }
      papers.set(key, paper)
    }
    paper.questions += 1
    const tags = (row.syllabus_tags ?? []).filter((t) => typeof t === 'string' && t.length > 0)
    if (tags.length === 0) continue
    paper.tagged += 1
    for (const t of tags) if (nameOf(t)) paper.tags.add(t)
  }

  const byTag = new Map<string, number>()
  let of = 0
  let questions = 0
  let tagged = 0
  let from: { label: string; key: number } | null = null
  let to: { label: string; key: number } | null = null
  for (const paper of papers.values()) {
    if (paper.tagged < PAPER_MIN_TAGGED || paper.tagged / paper.questions < PAPER_MIN_TAGGED_SHARE) continue
    of += 1
    questions += paper.questions
    tagged += paper.tagged
    for (const t of paper.tags) byTag.set(t, (byTag.get(t) ?? 0) + 1)
    const point = sessionPoint(paper.session)
    if (point) {
      if (!from || point.key < from.key) from = point
      if (!to || point.key > to.key) to = point
    }
  }

  return {
    of,
    from: from?.label,
    to: to?.label,
    taggedShare: questions > 0 ? tagged / questions : 0,
    byTag,
    scope,
  }
}

/** The frequency signal for one leaf, or nothing: below the thresholds the plan makes no claim. */
export function frequencyFor(freq: PaperFrequency, code: string): TopicSignals['frequency'] | undefined {
  const papers = freq.byTag.get(code) ?? 0
  if (freq.of < FREQUENCY_MIN_PAPERS || papers < FREQUENCY_MIN_HITS) return undefined
  return { papers, of: freq.of, from: freq.from, to: freq.to, taggedShare: freq.taggedShare, scope: freq.scope }
}
