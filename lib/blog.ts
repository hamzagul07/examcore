import fs from 'fs'
import path from 'path'

export type BlogPostMeta = {
  slug: string
  title: string
  description: string
  date: string
  keywords: string[]
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
    .map(({ slug, title, description, date, keywords }) => ({
      slug,
      title,
      description,
      date,
      keywords,
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

/** Related posts by shared keywords (for internal linking / SEO). */
export function getRelatedPosts(slug: string, limit = 3): BlogPostMeta[] {
  const current = getBlogPost(slug)
  if (!current) return []
  const currentKeys = new Set(
    current.keywords.map((k) => k.toLowerCase())
  )
  return getBlogPosts()
    .filter((p) => p.slug !== slug)
    .map((p) => {
      const overlap = p.keywords.filter((k) =>
        currentKeys.has(k.toLowerCase())
      ).length
      return { post: p, overlap }
    })
    .sort((a, b) => b.overlap - a.overlap)
    .slice(0, limit)
    .map(({ post }) => post)
}

export function getBlogPostLastModified(slug: string): Date | undefined {
  const post = getBlogPost(slug)
  if (!post?.date) return undefined
  const d = new Date(post.date)
  return Number.isNaN(d.getTime()) ? undefined : d
}
