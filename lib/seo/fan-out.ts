import { SITE_NAME } from '@/lib/site-config'
import { getClusterForSlug } from '@/lib/seo/clusters'
import { extractSyllabusCode } from '@/lib/blog/meta'

export type FanOutChunk = {
  id: string
  heading: string
  level: 2 | 3
  /** Entity-rich retrieval lead (first sentence of chunk). */
  lead: string
  bodyMarkdown: string
  subIntent: string
}

const SKIP_SECTIONS =
  /^(what to read|bottom line|sources|references|table of contents)/i

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
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .slice(0, 72)
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
  const trimmed = firstPara.replace(/\*\*/g, '').trim()
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
    if (!heading || SKIP_SECTIONS.test(heading)) {
      heading = ''
      body = []
      return
    }
    const bodyMd = body.join('\n').trim()
    const paras = bodyMd.split('\n\n').filter((p) => p.trim() && !p.startsWith('#'))
    const firstPara = paras[0] ?? ''
    const restBody = paras.slice(1).join('\n\n').trim()
    const lead = ensureEntityLead(heading, firstPara, slug)
    chunks.push({
      id: slugify(heading),
      heading,
      level,
      lead,
      bodyMarkdown: restBody,
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
        const paras = pre.split('\n\n').filter((p) => p.trim())
        const firstPara = paras[0] ?? ''
        chunks.push({
          id: 'overview',
          heading: 'Overview',
          level: 2,
          lead: ensureEntityLead('Overview', firstPara, slug),
          bodyMarkdown: paras.slice(1).join('\n\n').trim(),
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
    chunks.push({
      id: 'overview',
      heading: 'Overview',
      level: 2,
      lead: ensureEntityLead('Overview', pre.split('\n\n')[0] ?? '', slug),
      bodyMarkdown: pre,
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
