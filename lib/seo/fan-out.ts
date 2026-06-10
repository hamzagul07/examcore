import { SITE_NAME } from '@/lib/site-config'
import { getClusterForSlug } from '@/lib/seo/clusters'
import { extractSyllabusCode } from '@/lib/blog/meta'
import { headingSlug, isSkippedBlogHeading } from '@/lib/blog/heading-slug'

export type FanOutChunk = {
  id: string
  heading: string
  level: 2 | 3
  /** Entity-rich retrieval lead (first sentence of chunk). */
  lead: string
  bodyMarkdown: string
  subIntent: string
}

/** Cambridge entity tokens to strengthen passage retrieval. */
const ENTITY_TOKENS = [
  'Cambridge International',
  'mark scheme',
  'past paper',
  'A-Level',
  'O-Level',
  SITE_NAME,
]

function slugify(text: string): string {
  return headingSlug(text)
}

function inferSubIntent(heading: string, slug: string): string {
  const h = heading.toLowerCase()
  if (h.includes('faq') || h.includes('question')) return 'faq'
  if (h.includes('step') || h.includes('how')) return 'procedure'
  if (h.includes('mistake') || h.includes('avoid')) return 'pitfalls'
  if (h.includes('compare') || h.includes('vs')) return 'comparison'
  const code = extractSyllabusCode(slug)
  if (code && h.includes(code)) return `syllabus-${code}`
  return slugify(heading)
}

function ensureEntityLead(heading: string, firstPara: string, slug: string): string {
  let trimmed = firstPara.replace(/\*\*/g, '').trim()
  if (!trimmed || isTableBlock(trimmed) || /\|.*\|/.test(trimmed)) {
    trimmed = `This section covers ${heading} — ranked by what Cambridge examiners return to most often in past papers.`
  }
  const hasEntity = ENTITY_TOKENS.some((t) =>
    trimmed.toLowerCase().includes(t.toLowerCase())
  )
  const code = extractSyllabusCode(slug)
  if (hasEntity && trimmed.length >= 40) return trimmed

  const cluster = getClusterForSlug(slug)
  const prefix = code
    ? `For Cambridge syllabus ${code}, `
    : `For Cambridge ${cluster.headTerm}, `
  const core = trimmed || heading
  return `${prefix}${core.charAt(0).toLowerCase()}${core.slice(1)}`
}

function isTableBlock(block: string): boolean {
  const lines = block.trim().split('\n').filter((l) => l.trim())
  if (lines.length < 2) return false
  return lines.every((l) => /^\|/.test(l.trim()))
}

function isCodeFenceBlock(block: string): boolean {
  return block.trim().startsWith('```')
}

function isListBlock(block: string): boolean {
  const lines = block.trim().split('\n').filter((l) => l.trim())
  if (lines.length === 0) return false
  return lines.every((l) => /^(\d+\.|[-*+])\s/.test(l.trim()))
}

function isProseParagraph(block: string): boolean {
  const t = block.trim()
  if (!t || t.startsWith('#')) return false
  if (isTableBlock(t)) return false
  if (isCodeFenceBlock(t)) return false
  if (isListBlock(t)) return false
  return true
}

/** Split markdown into blocks without breaking GFM tables or fenced code. */
export function splitMarkdownBlocks(markdown: string): string[] {
  const blocks: string[] = []
  let buf: string[] = []
  let inFence = false

  const flush = () => {
    const joined = buf.join('\n').trim()
    if (joined) blocks.push(joined)
    buf = []
  }

  for (const line of markdown.split('\n')) {
    if (line.startsWith('```')) {
      buf.push(line)
      inFence = !inFence
      if (!inFence) flush()
      continue
    }
    if (inFence) {
      buf.push(line)
      continue
    }

    if (/^\|/.test(line.trim())) {
      if (buf.length && !/^\|/.test(buf[buf.length - 1]?.trim() ?? '')) {
        flush()
      }
      buf.push(line)
      continue
    }

    if (line.trim() === '') {
      flush()
      continue
    }

    if (buf.length && /^\|/.test(buf[0]?.trim() ?? '')) {
      flush()
    }
    buf.push(line)
  }
  flush()
  return blocks
}

function extractLeadAndBody(
  bodyMd: string,
  heading: string,
  slug: string
): { lead: string; bodyMarkdown: string } {
  const trimmed = bodyMd.trim()
  if (!trimmed) {
    return { lead: ensureEntityLead(heading, '', slug), bodyMarkdown: '' }
  }

  const blocks = splitMarkdownBlocks(trimmed)
  const proseIdx = blocks.findIndex(isProseParagraph)

  if (proseIdx === -1) {
    return {
      lead: ensureEntityLead(heading, '', slug),
      bodyMarkdown: trimmed,
    }
  }

  const leadPara = blocks[proseIdx]
  const bodyBlocks = blocks.filter((_, i) => i !== proseIdx)
  return {
    lead: ensureEntityLead(heading, leadPara, slug),
    bodyMarkdown: bodyBlocks.join('\n\n').trim(),
  }
}

/**
 * Split markdown into self-contained fan-out chunks (one sub-intent each).
 * Each chunk is independently retrievable for AI Mode / RAG passage selection.
 */
export function parseFanOutChunks(content: string, slug: string): FanOutChunk[] {
  const lines = content.split('\n')
  const chunks: FanOutChunk[] = []
  let heading = ''
  let level: 2 | 3 = 2
  let body: string[] = []
  let preamble: string[] = []

  const flush = () => {
    if (!heading || isSkippedBlogHeading(heading)) {
      heading = ''
      body = []
      return
    }
    const bodyMd = body.join('\n').trim()
    const { lead, bodyMarkdown } = extractLeadAndBody(bodyMd, heading, slug)
    chunks.push({
      id: slugify(heading),
      heading,
      level,
      lead,
      bodyMarkdown,
      subIntent: inferSubIntent(heading, slug),
    })
    heading = ''
    body = []
  }

  for (const line of lines) {
    const h2 = line.match(/^##\s+(.+)$/)
    const h3 = line.match(/^###\s+(.+)$/)
    if (h2) {
      if (!heading && preamble.length) {
        const pre = preamble.join('\n').trim()
        const { lead, bodyMarkdown } = extractLeadAndBody(pre, 'Overview', slug)
        chunks.push({
          id: 'overview',
          heading: 'Overview',
          level: 2,
          lead,
          bodyMarkdown,
          subIntent: 'overview',
        })
        preamble = []
      }
      flush()
      heading = h2[1].replace(/\*\*/g, '').trim()
      level = 2
      continue
    }
    if (h3 && !heading) {
      flush()
      heading = h3[1].replace(/\*\*/g, '').trim()
      level = 3
      continue
    }
    if (heading) body.push(line)
    else if (!h3) preamble.push(line)
  }
  flush()
  if (preamble.length && chunks.length === 0) {
    const pre = preamble.join('\n').trim()
    const { lead, bodyMarkdown } = extractLeadAndBody(pre, 'Overview', slug)
    chunks.push({
      id: 'overview',
      heading: 'Overview',
      level: 2,
      lead,
      bodyMarkdown,
      subIntent: 'overview',
    })
  }
  return chunks
}

export function countInformationGainSignals(content: string): {
  tables: number
  lists: number
  faqSections: number
  wordCount: number
} {
  const tables = (content.match(/^\|/gm) ?? []).length > 2 ? 1 : 0
  const lists = (content.match(/^[\d]+\.\s|^-\s/gm) ?? []).length
  const faqSections = /##\s+frequently asked/i.test(content) ? 1 : 0
  const wordCount = content.trim().split(/\s+/).filter(Boolean).length
  return { tables, lists, faqSections, wordCount }
}
