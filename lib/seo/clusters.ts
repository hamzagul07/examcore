import { getBlogPosts } from '@/lib/blog'
import { isSubjectGuideSlug } from '@/lib/seo/subject-guides'
import type { SearchIntent } from '@/lib/seo/intent'
import type { ContentFormat } from '@/lib/seo/intent'

export type ContentClusterId =
  | 'past-paper-marking'
  | 'mark-schemes'
  | 'revision-strategy'
  | 'exam-technique'
  | 'subject-guides'
  | 'subject-choice'
  | 'exam-integrity'
  | 'resources-tools'

export type ContentCluster = {
  id: ContentClusterId
  path: string
  title: string
  description: string
  headTerm: string
  intent: SearchIntent
  format: ContentFormat
  pillarBlogSlug: string
  moneyPath: string
  /** Match blog slugs into this cluster */
  slugPatterns: RegExp[]
  explicitSlugs?: string[]
}

export const CONTENT_CLUSTERS: ContentCluster[] = [
  {
    id: 'past-paper-marking',
    path: '/guides/past-paper-marking',
    title: 'Past paper marking',
    description:
      'Self-mark Cambridge past papers with real mark schemes — workflows, mistakes, whole papers, and when to use a second marking pass.',
    headTerm: 'mark Cambridge past papers',
    intent: 'informational',
    format: 'hub',
    pillarBlogSlug: 'how-to-mark-cambridge-past-papers-yourself',
    moneyPath: '/mark',
    slugPatterns: [
      /^how-to-mark-cambridge/,
      /^mark-whole-cambridge/,
      /^common-mistakes-self-marking/,
      /^marking-a-level-economics/,
      /^ai-marking-cambridge/,
      /^when-to-start-past-papers/,
      /^how-many-cambridge-past-papers/,
      /^should-you-hire-a-tutor/,
      /^build-revision-notes-from-mark-schemes/,
    ],
  },
  {
    id: 'mark-schemes',
    path: '/guides/mark-schemes',
    title: 'Mark schemes & examiner language',
    description:
      'Read Cambridge mark schemes properly: B1/M1/A1, command words, MCQ keys, and economics essay bands.',
    headTerm: 'Cambridge mark scheme',
    intent: 'informational',
    format: 'hub',
    pillarBlogSlug: 'how-to-read-a-cambridge-mark-scheme',
    moneyPath: '/mark',
    slugPatterns: [
      /^how-to-read-a-cambridge-mark-scheme/,
      /^cambridge-a-level-maths-mark-scheme/,
      /^cambridge-mcq-past-papers/,
      /^cambridge-command-words/,
      /^cambridge-grade-boundaries/,
      /^cambridge-data-response/,
    ],
  },
  {
    id: 'revision-strategy',
    path: '/guides/revision-strategy',
    title: 'Revision strategy',
    description:
      'Schedules, timing, mock vs past papers, and how many papers to complete before exams.',
    headTerm: 'Cambridge past paper revision',
    intent: 'informational',
    format: 'hub',
    pillarBlogSlug: 'cambridge-past-paper-revision-schedule',
    moneyPath: '/mark',
    slugPatterns: [
      /^cambridge-past-paper-revision-schedule/,
      /^cambridge-past-paper-timing/,
      /^cambridge-mock-exams/,
      /^how-to-revise-cambridge-exams/,
      /^cambridge-as-level-vs-a2/,
      /^fixing-silly-mistakes/,
      /^exam-stress-and-past-paper/,
    ],
  },
  {
    id: 'exam-technique',
    path: '/guides/exam-technique',
    title: 'Exam technique',
    description:
      'Photographing handwriting, examiner reports, and practical exam-session habits.',
    headTerm: 'Cambridge exam technique',
    intent: 'informational',
    format: 'hub',
    pillarBlogSlug: 'photograph-handwritten-past-paper-answers',
    moneyPath: '/mark',
    slugPatterns: [
      /^photograph-handwritten/,
      /^cambridge-examiner-report/,
      /^cambridge-igcse-past-papers-guide$/,
    ],
  },
  {
    id: 'subject-guides',
    path: '/guides/subject-guides',
    title: 'Syllabus past paper guides',
    description:
      'Per-subject Cambridge guides: 9709, 9702, 9708, 4024, and every supported syllabus code.',
    headTerm: 'Cambridge subject past papers',
    intent: 'informational',
    format: 'subject-guide',
    pillarBlogSlug: 'cambridge-9709-a-level-mathematics-past-papers-guide',
    moneyPath: '/subjects',
    slugPatterns: [/^cambridge-\d{4}-.*-past-papers-guide$/],
  },
  {
    id: 'subject-choice',
    path: '/guides/subject-choice',
    title: 'Subject choice',
    description:
      'Which A-Level and O-Level subjects to take in 2026 — combinations, switching, and humanities vs sciences.',
    headTerm: 'which Cambridge A-Level subjects',
    intent: 'informational',
    format: 'comparison',
    pillarBlogSlug: 'which-cambridge-a-level-subjects-should-you-take-2026',
    moneyPath: '/subjects',
    slugPatterns: [
      /^which-cambridge-a-level-subjects/,
      /^which-o-level-subjects/,
      /^best-a-level-subject-combinations/,
      /^science-vs-humanities-a-level/,
      /^switching-a-level-subjects/,
    ],
    explicitSlugs: ['cambridge-grade-inflation-myths-and-mark-schemes'],
  },
  {
    id: 'exam-integrity',
    path: '/guides/exam-integrity',
    title: 'Exam integrity & 2026 series',
    description:
      'Leaks, AI rules, May/June 2026 prep, and what to do instead of chasing rumours.',
    headTerm: 'Cambridge exams 2026',
    intent: 'informational',
    format: 'hub',
    pillarBlogSlug: 'cambridge-exam-paper-leaks-2026-what-students-should-know',
    moneyPath: '/mark',
    slugPatterns: [
      /^cambridge-exam-paper-leaks/,
      /^chatgpt-and-ai-cambridge-exams/,
      /^cambridge-may-june-2026/,
      /^revision-tiktok-and-social-media/,
    ],
  },
  {
    id: 'resources-tools',
    path: '/guides/resources-tools',
    title: 'Resources & tools',
    description:
      'Best Cambridge past paper resources compared — official PDFs, tools, and what to avoid.',
    headTerm: 'best Cambridge past paper resources',
    intent: 'commercial',
    format: 'comparison',
    pillarBlogSlug: 'best-cambridge-past-paper-revision-resources-2026',
    moneyPath: '/mark',
    slugPatterns: [/^best-cambridge-past-paper/],
  },
]

export function getClusterForSlug(slug: string): ContentCluster {
  if (isSubjectGuideSlug(slug)) {
    return CONTENT_CLUSTERS.find((c) => c.id === 'subject-guides')!
  }
  for (const cluster of CONTENT_CLUSTERS) {
    if (cluster.explicitSlugs?.includes(slug)) return cluster
    if (cluster.slugPatterns.some((re) => re.test(slug))) return cluster
  }
  return CONTENT_CLUSTERS.find((c) => c.id === 'revision-strategy')!
}

export function getClusterById(id: ContentClusterId): ContentCluster | undefined {
  return CONTENT_CLUSTERS.find((c) => c.id === id)
}

export function getClusterSpokes(clusterId: ContentClusterId): string[] {
  const cluster = getClusterById(clusterId)
  if (!cluster) return []
  const slugs = getBlogPosts().map((p) => p.slug)
  return slugs.filter((slug) => {
    if (slug === cluster.pillarBlogSlug) return false
    if (cluster.explicitSlugs?.includes(slug)) return true
    return cluster.slugPatterns.some((re) => re.test(slug))
  })
}

export function getAllClusterIds(): ContentClusterId[] {
  return CONTENT_CLUSTERS.map((c) => c.id)
}
