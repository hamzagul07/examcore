import 'server-only'

import fs from 'fs'
import path from 'path'
import { getClusterForSlug } from '@/lib/seo/clusters'

export type BlogPostMeta = {
  slug: string
  title: string
  description: string
  date: string
  keywords: string[]
  /** Optional frontmatter: revision | mark-schemes | exam-technique | study-skills | editorial | subject-choice */
  category?: string
  /** Pin to top of blog index */
  featured?: boolean
  /** Large hero card on index */
  spotlight?: boolean
  /** E-E-A-T author id — see lib/seo/authors.ts */
  author?: string
  /** ISO date for dateModified schema */
  updated?: string
  /** first-hand | synthesis | dataset | editorial — information gain signal */
  informationGain?: string
}

export type BlogPost = BlogPostMeta & {
  content: string
}

const BLOG_DIR = path.join(process.cwd(), 'content', 'blog')

function parseKeywords(raw: string | undefined): string[] {
  if (!raw?.trim()) return []
  return raw
    .split(',')
    .map((k) => k.trim())
    .filter(Boolean)
}

function parseFrontmatter(raw: string): {
  meta: Record<string, string>
  content: string
} {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/)
  if (!match) {
    return { meta: {}, content: raw.trim() }
  }
  const meta: Record<string, string> = {}
  for (const line of match[1].split('\n')) {
    const idx = line.indexOf(':')
    if (idx === -1) continue
    const key = line.slice(0, idx).trim()
    const value = line.slice(idx + 1).trim().replace(/^["']|["']$/g, '')
    if (key) meta[key] = value
  }
  return { meta, content: match[2].trim() }
}

function readPostFile(filename: string): BlogPost | null {
  const filePath = path.join(BLOG_DIR, filename)
  const raw = fs.readFileSync(filePath, 'utf8')
  const { meta, content } = parseFrontmatter(raw)
  const slug = filename.replace(/\.md$/, '')
  if (!meta.title) return null
  return {
    slug,
    title: meta.title,
    description: meta.description || '',
    date: meta.date || '',
    keywords: parseKeywords(meta.keywords),
    category: meta.category || undefined,
    featured: meta.featured === 'true',
    spotlight: meta.spotlight === 'true',
    author: meta.author || undefined,
    updated: meta.updated || undefined,
    informationGain: meta.informationGain || undefined,
    content,
  }
}

export function getBlogPosts(): BlogPostMeta[] {
  if (!fs.existsSync(BLOG_DIR)) return []
  return fs
    .readdirSync(BLOG_DIR)
    .filter((f) => f.endsWith('.md'))
    .map((f) => readPostFile(f))
    .filter((p): p is BlogPost => p !== null)
    .sort((a, b) => (a.date < b.date ? 1 : -1))
    .map(({ slug, title, description, date, keywords, category, featured, spotlight, author, updated, informationGain }) => ({
      slug,
      title,
      description,
      date,
      keywords,
      category,
      featured,
      spotlight,
      author,
      updated,
      informationGain,
    }))
}

export function getBlogPost(slug: string): BlogPost | null {
  if (!fs.existsSync(BLOG_DIR)) return null
  const filename = `${slug}.md`
  if (!fs.existsSync(path.join(BLOG_DIR, filename))) return null
  return readPostFile(filename)
}

export function getAllBlogSlugs(): string[] {
  return getBlogPosts().map((p) => p.slug)
}

/** Related posts — same cluster first, then keyword overlap (hub-and-spoke). */
export function getRelatedPosts(slug: string, limit = 3): BlogPostMeta[] {
  const current = getBlogPost(slug)
  if (!current) return []
  const cluster = getClusterForSlug(slug)
  const currentKeys = new Set(
    current.keywords.map((k) => k.toLowerCase())
  )
  const codeMatch = slug.match(/^cambridge-(\d{4})-/)
  const syllabusCode = codeMatch?.[1]
  const ibMatch = slug.match(/^ib-(.+?)-(hl|sl)-/)
  const ibSubjectBase = ibMatch?.[1]

  return getBlogPosts()
    .filter((p) => p.slug !== slug)
    .map((p) => {
      const sameCluster =
        getClusterForSlug(p.slug).id === cluster.id ? 5 : 0
      const overlap = p.keywords.filter((k) =>
        currentKeys.has(k.toLowerCase())
      ).length
      const sameCode =
        syllabusCode && p.slug.startsWith(`cambridge-${syllabusCode}-`)
          ? 3
          : 0
      const ibSibling =
        ibSubjectBase &&
        (p.slug === `ib-${ibSubjectBase}-hl-past-papers-guide` ||
          p.slug === `ib-${ibSubjectBase}-sl-past-papers-guide`)
          ? 4
          : 0
      const ibSameSubject =
        ibSubjectBase && p.slug.startsWith(`ib-${ibSubjectBase}-`) ? 2 : 0
      const isPillar = p.slug === cluster.pillarBlogSlug ? 2 : 0
      return {
        post: p,
        score: sameCluster + overlap + sameCode + ibSibling + ibSameSubject + isPillar,
      }
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ post }) => post)
}

export function getBlogPostLastModified(slug: string): Date | undefined {
  const post = getBlogPost(slug)
  const raw = post?.updated || post?.date
  if (!raw) return undefined
  const d = new Date(raw)
  return Number.isNaN(d.getTime()) ? undefined : d
}
