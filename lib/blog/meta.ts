import { isSubjectGuideSlug } from '@/lib/seo/subject-guides'
import type { BlogPostMeta } from '@/lib/blog'
import { headingSlug, isSkippedBlogHeading } from '@/lib/blog/heading-slug'

export type BlogCategory =
  | 'subject-guide'
  | 'revision'
  | 'mark-schemes'
  | 'exam-technique'
  | 'study-skills'
  | 'editorial'
  | 'subject-choice'

export const BLOG_CATEGORY_LABELS: Record<BlogCategory, string> = {
  'subject-guide': 'Subject guide',
  revision: 'Revision strategy',
  'mark-schemes': 'Mark schemes',
  'exam-technique': 'Exam technique',
  'study-skills': 'Study skills',
  editorial: 'Trending',
  'subject-choice': 'Subject choice',
}

const SLUG_CATEGORY: Record<string, BlogCategory> = {
  'how-to-read-a-cambridge-mark-scheme': 'mark-schemes',
  'cambridge-a-level-maths-mark-scheme-b1-m1-a1': 'mark-schemes',
  'common-mistakes-self-marking-past-papers': 'mark-schemes',
  'ai-marking-cambridge-past-papers-guide': 'mark-schemes',
  'cambridge-mcq-past-papers-how-to-mark': 'mark-schemes',
  'marking-a-level-economics-essays-at-home': 'mark-schemes',
  'cambridge-examiner-report-how-to-use': 'exam-technique',
  'cambridge-command-words-past-papers-guide': 'exam-technique',
  'cambridge-grade-boundaries-past-papers': 'exam-technique',
  'fixing-silly-mistakes-cambridge-past-papers': 'exam-technique',
  'photograph-handwritten-past-paper-answers': 'exam-technique',
  'mark-whole-cambridge-past-paper': 'exam-technique',
}

export function getBlogCategory(
  slug: string,
  explicit?: string | null
): BlogCategory {
  if (explicit && explicit in BLOG_CATEGORY_LABELS) {
    return explicit as BlogCategory
  }
  if (isSubjectGuideSlug(slug)) return 'subject-guide'
  if (SLUG_CATEGORY[slug]) return SLUG_CATEGORY[slug]
  if (slug.includes('revision') || slug.includes('schedule') || slug.includes('how-many')) {
    return 'revision'
  }
  if (slug.includes('mark-scheme') || slug.includes('marking') || slug.includes('self-mark')) {
    return 'mark-schemes'
  }
  if (slug.includes('exam') || slug.includes('past-paper') || slug.includes('past-papers')) {
    return 'revision'
  }
  return 'study-skills'
}

export function estimateReadingTimeMinutes(content: string): number {
  const words = content.trim().split(/\s+/).filter(Boolean).length
  return Math.max(3, Math.round(words / 220))
}

export function formatBlogDate(date: string): string {
  if (!date) return ''
  return new Date(date).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

export function extractSyllabusCode(slug: string): string | null {
  const m = slug.match(/^cambridge-(\d{4})-/)
  return m?.[1] ?? null
}

export type BlogHeading = { id: string; text: string; level: 2 | 3 }

export function extractHeadings(content: string): BlogHeading[] {
  const headings: BlogHeading[] = []
  for (const line of content.split('\n')) {
    const m = line.match(/^(#{2,3})\s+(.+)$/)
    if (!m) continue
    const level = m[1].length as 2 | 3
    const text = m[2].replace(/\*\*/g, '').trim()
    if (isSkippedBlogHeading(text)) continue
    headings.push({ id: headingSlug(text), text, level })
  }
  return headings
}

export type EnrichedBlogMeta = BlogPostMeta & {
  category: BlogCategory
  categoryLabel: string
  readingMinutes: number
  syllabusCode: string | null
  isEditorial: boolean
}

export function isEditorialPost(_slug: string, category?: string | null): boolean {
  return category === 'editorial' || category === 'subject-choice'
}

export function enrichPostMeta(
  post: BlogPostMeta,
  content = ''
): EnrichedBlogMeta {
  const category = getBlogCategory(post.slug, post.category)
  return {
    ...post,
    category,
    categoryLabel: BLOG_CATEGORY_LABELS[category],
    readingMinutes: estimateReadingTimeMinutes(content || post.description),
    syllabusCode: extractSyllabusCode(post.slug),
    isEditorial: isEditorialPost(post.slug, category),
  }
}

export function sortPostsForIndex<T extends BlogPostMeta>(posts: T[]): T[] {
  return [...posts].sort((a, b) => {
    if (a.spotlight && !b.spotlight) return -1
    if (!a.spotlight && b.spotlight) return 1
    if (a.featured && !b.featured) return -1
    if (!a.featured && b.featured) return 1
    return a.date < b.date ? 1 : -1
  })
}
