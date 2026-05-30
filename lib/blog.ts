import fs from 'fs'
import path from 'path'

export type BlogPostMeta = {
  slug: string
  title: string
  description: string
  date: string
}

export type BlogPost = BlogPostMeta & {
  content: string
}

const BLOG_DIR = path.join(process.cwd(), 'content', 'blog')

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
    .map(({ slug, title, description, date }) => ({ slug, title, description, date }))
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
