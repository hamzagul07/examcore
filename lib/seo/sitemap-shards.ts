/**
 * Named sitemap shards for Search Console tracking by page type.
 * Served via app/sitemap.ts generateSitemaps → /sitemap/{id}.xml
 * Index document is served at /sitemap-index.xml (/sitemap.xml redirects there).
 */
import type { MetadataRoute } from 'next'
import { SITE_URL } from '@/lib/site-config'
import { getAllBlogSlugs, getBlogPostLastModified } from '@/lib/blog'
import { BLOG_CATEGORY_LABELS } from '@/lib/blog/meta'
import { getAllBlogBrowseFacets } from '@/lib/content/blog-facets'
import { blogSitemapPriority } from '@/lib/seo/sitemap-priority'
import { CONTENT_CLUSTERS } from '@/lib/seo/clusters'
import {
  getGradeBoundaryCalculatorCodes,
  getMarkingSubjectCodes,
} from '@/lib/seo/programmatic-subjects'
import { getPastPaperSubjectCodes } from '@/lib/seo/past-papers'
import { getAllExpandedTopicQuestionParams } from '@/lib/seo/topic-questions-expand'
import { getIbSubjectSlugs } from '@/lib/ib/catalog'
import { getIbCourseSlugs, getAllIbCourseLessonParams } from '@/lib/courses/ib'
import { getAllIbTopicPracticeParams } from '@/lib/seo/ib-topic-practice'
import { getCourseLessons, getCourseSubjectCodes } from '@/lib/courses'
import { getCommunitySubjects } from '@/lib/community/subjects'
import { listPublishedQuestionRefs } from '@/lib/community/qa'
import { isCommunityEnabled } from '@/lib/community/enabled'
import {
  getAllCaieHubParams,
  getAllCaieLessonParams,
  getAllCaieSurfaceParams,
  caiePaperPath,
  getCaieSubjectRef,
  normalizePaperNumber,
  isIndexableLesson,
  type CaieSurface,
} from '@/lib/seo/caie-graph'
import {
  edexcelRootPath,
  edexcelQualificationPath,
  edexcelSubjectBoundariesPath,
  edexcelSubjectPastPapersPath,
  edexcelSubjectPath,
  edexcelUnitPath,
  getAllEdexcelQualificationParams,
  getAllEdexcelSubjectParams,
  resolveEdexcelSubject,
} from '@/lib/seo/edexcel-graph'
import {
  getAllOxfordaqaQualificationParams,
  getAllOxfordaqaSubjectParams,
  oxfordaqaPaperPath,
  oxfordaqaQualificationPath,
  oxfordaqaRootPath,
  oxfordaqaSubjectBoundariesPath,
  oxfordaqaSubjectPastPapersPath,
  oxfordaqaSubjectPath,
  resolveOxfordaqaSubject,
} from '@/lib/seo/oxfordaqa-graph'
import {
  aqaRootPath,
  aqaSubjectPath,
  getAllAqaSubjectParams,
} from '@/lib/seo/aqa-graph'
import {
  apCoursePath,
  apRootPath,
  apScoreCalculatorPath,
  getAllApCourseParams,
} from '@/lib/seo/ap-graph'

export const SITEMAP_SHARD_IDS = [
  'static',
  'results',
  'tools',
  'blog',
  'caie-hubs',
  'caie-topics',
  'caie-flashcards',
  'caie-faq',
  'caie-quiz',
  'caie-questions',
  'caie-mistakes',
  'caie-papers',
  'past-paper-topics',
  'ib',
  'edexcel',
  'oxfordaqa',
  'aqa',
  'ap',
  'questions',
  'markschemes',
  'community',
] as const

export type SitemapShardId = (typeof SITEMAP_SHARD_IDS)[number]

function baseUrl() {
  return SITE_URL.replace(/\/$/, '')
}

function now() {
  return new Date()
}

function entry(
  path: string,
  opts?: Partial<MetadataRoute.Sitemap[number]>
): MetadataRoute.Sitemap[number] {
  return {
    url: path.startsWith('http') ? path : `${baseUrl()}${path}`,
    lastModified: now(),
    changeFrequency: 'weekly',
    priority: 0.7,
    ...opts,
  }
}

function caieSurfaceEntries(surface: CaieSurface): MetadataRoute.Sitemap {
  return getAllCaieSurfaceParams()
    .filter((p) => p.surface === surface)
    .map((p) =>
      entry(`/caie/${p.level}/${p.subject}/${p.code}/${p.topic}/${p.surface}`, {
        changeFrequency: 'monthly',
        priority: 0.74,
      })
    )
}

export async function buildSitemapShard(
  id: SitemapShardId
): Promise<MetadataRoute.Sitemap> {
  const n = now()
  const base = baseUrl()

  switch (id) {
    case 'static':
      return [
        '',
        '/mark',
        '/subjects',
        '/courses',
        '/caie',
        '/edexcel',
        '/edexcel/international-a-level',
        '/edexcel/a-level',
        '/edexcel/international-gcse',
        '/oxfordaqa',
        '/oxfordaqa/international-a-level',
        '/oxfordaqa/international-gcse',
        '/aqa',
        '/aqa/a-level',
        '/ap',
        '/ap/score-calculator',
        '/questions',
        '/markscheme',
        '/past-papers',
        '/past-papers/topics',
        '/ib',
        '/ib/courses',
        '/ib/subjects',
        '/ib/past-papers',
        '/ib/topic-practice',
        '/guides',
        '/blog',
        '/compare',
        '/research',
        '/insights',
        '/for-teachers',
        '/faq',
        '/about',
        '/contact',
        '/changelog',
        '/pricing',
        '/how-it-works',
        '/community',
        '/community/questions',
        '/community/subjects',
      ].map((path, i) =>
        entry(path, {
          priority: path === '' ? 1 : path === '/mark' ? 0.95 : 0.8,
          changeFrequency: i < 8 ? 'weekly' : 'monthly',
        })
      )

    case 'results':
      return [
        entry('/results-2026', { priority: 0.95, changeFrequency: 'daily' }),
        entry('/results-2026/ib', { priority: 0.9, changeFrequency: 'daily' }),
        entry('/results-2026/edexcel', { priority: 0.9, changeFrequency: 'daily' }),
        ...getGradeBoundaryCalculatorCodes().map((code) =>
          entry(`/results-2026/caie/${code}`, {
            priority: 0.9,
            changeFrequency: 'daily',
          })
        ),
      ]

    case 'tools':
      return [
        entry('/tools', { priority: 0.83 }),
        entry('/tools/will-my-grade-hold', {
          priority: 0.92,
          changeFrequency: 'daily',
        }),
        entry('/tools/grade-boundary-calculator', { priority: 0.82 }),
        entry('/tools/command-words', { priority: 0.8 }),
        entry('/tools/ib-points-calculator', { priority: 0.82 }),
        entry('/tools/pum-calculator', { priority: 0.8 }),
        entry('/tools/exam-countdown', { priority: 0.8 }),
        ...getGradeBoundaryCalculatorCodes().map((code) =>
          entry(`/tools/grade-boundary-calculator/${code}`, {
            priority: 0.7,
            changeFrequency: 'monthly',
          })
        ),
        ...getMarkingSubjectCodes().map((code) =>
          entry(`/tools/command-words/${code}`, {
            priority: 0.68,
            changeFrequency: 'monthly',
          })
        ),
      ]

    case 'blog':
      return [
        ...CONTENT_CLUSTERS.map((c) =>
          entry(c.path, { priority: 0.86, changeFrequency: 'weekly' })
        ),
        ...Object.keys(BLOG_CATEGORY_LABELS).map((category) =>
          entry(`/blog/category/${category}`, { priority: 0.7 })
        ),
        ...getAllBlogBrowseFacets().map((facets) =>
          entry(`/blog/browse/${facets.join('/')}`, {
            priority: facets.length === 1 ? 0.6 : 0.5,
          })
        ),
        ...getAllBlogSlugs().map((slug) => ({
          url: `${base}/blog/${slug}`,
          lastModified: getBlogPostLastModified(slug) ?? n,
          changeFrequency: 'weekly' as const,
          priority: blogSitemapPriority(slug),
        })),
      ]

    case 'caie-hubs':
      return [
        ...getAllCaieHubParams().map((p) => {
          const ref = getCaieSubjectRef(p.code)
          return entry(ref?.hubPath ?? `/caie/${p.level}/${p.subject}/${p.code}`, {
            priority: 0.88,
          })
        }),
        // Subject marketing hubs + course studio hubs (not per-lesson — those are CAIE)
        ...getMarkingSubjectCodes().map((code) =>
          entry(`/subjects/${code}`, { priority: 0.84, changeFrequency: 'monthly' })
        ),
        ...getCourseSubjectCodes().map((code) =>
          entry(`/courses/${code}`, { priority: 0.85 })
        ),
        ...getPastPaperSubjectCodes().map((code) =>
          entry(`/past-papers/${code}`, { priority: 0.83, changeFrequency: 'monthly' })
        ),
      ]

    case 'caie-topics':
      // Canonical topic URLs live under /caie — do NOT also list /courses/.../slug
      return getAllCaieLessonParams().map((p) =>
        entry(`/caie/${p.level}/${p.subject}/${p.code}/${p.topic}`, {
          priority: 0.8,
          changeFrequency: 'monthly',
        })
      )

    case 'caie-flashcards':
      return caieSurfaceEntries('flashcards')
    case 'caie-faq':
      return caieSurfaceEntries('faq')
    case 'caie-quiz':
      return caieSurfaceEntries('quiz')
    case 'caie-questions':
      return caieSurfaceEntries('questions')
    case 'caie-mistakes':
      return caieSurfaceEntries('mistakes')

    case 'caie-papers':
      return getCourseSubjectCodes().flatMap((code) => {
        const papers = new Set<string>()
        for (const lesson of getCourseLessons(code)) {
          if (!isIndexableLesson(lesson)) continue
          const pn = normalizePaperNumber(lesson.paper)
          if (pn) papers.add(pn)
        }
        return [...papers]
          .map((paper) => caiePaperPath(code, paper))
          .filter((p): p is string => Boolean(p))
          .map((path) => entry(path, { priority: 0.82, changeFrequency: 'monthly' }))
      })

    case 'past-paper-topics':
      return getAllExpandedTopicQuestionParams().map(({ code, topic }) =>
        entry(`/past-papers/${code}/${topic}`, {
          priority: 0.72,
          changeFrequency: 'monthly',
        })
      )

    case 'ib':
      return [
        ...getIbSubjectSlugs().flatMap((slug) => [
          entry(`/ib/subjects/${slug}`, { priority: 0.8, changeFrequency: 'monthly' }),
          entry(`/ib/past-papers/${slug}`, { priority: 0.8, changeFrequency: 'monthly' }),
        ]),
        ...getIbCourseSlugs().map((slug) =>
          entry(`/ib/courses/${slug}`, { priority: 0.85 })
        ),
        ...getAllIbCourseLessonParams().map(({ slug, lesson }) =>
          entry(`/ib/courses/${slug}/${lesson}`, {
            priority: 0.8,
            changeFrequency: 'monthly',
          })
        ),
        ...getAllIbTopicPracticeParams().map(({ slug, topic }) =>
          entry(`/ib/past-papers/${slug}/${topic}`, {
            priority: 0.76,
            changeFrequency: 'monthly',
          })
        ),
      ]

    case 'edexcel': {
      const qualEntries = getAllEdexcelQualificationParams().map((p) =>
        entry(edexcelQualificationPath(p.qualification), {
          priority: 0.86,
          changeFrequency: 'weekly',
        })
      )
      const subjectEntries = getAllEdexcelSubjectParams().flatMap((p) => {
        const subject = resolveEdexcelSubject(p.qualification, p.subject)
        if (!subject) return []
        const hub = edexcelSubjectPath(p.qualification, p.subject)
        const unitEntries = subject.units.map((u) =>
          entry(edexcelUnitPath(p.qualification, p.subject, u.code), {
            priority: 0.78,
            changeFrequency: 'monthly',
          })
        )
        return [
          entry(hub, { priority: 0.86 }),
          entry(edexcelSubjectPastPapersPath(p.qualification, p.subject), {
            priority: 0.82,
            changeFrequency: 'monthly',
          }),
          entry(edexcelSubjectBoundariesPath(p.qualification, p.subject), {
            priority: 0.8,
            changeFrequency: 'monthly',
          }),
          ...unitEntries,
        ]
      })
      return [
        entry(edexcelRootPath(), { priority: 0.9 }),
        ...qualEntries,
        ...subjectEntries,
      ]
    }

    case 'oxfordaqa': {
      const qualEntries = getAllOxfordaqaQualificationParams().map((p) =>
        entry(oxfordaqaQualificationPath(p.qualification), {
          priority: 0.86,
          changeFrequency: 'weekly',
        })
      )
      const subjectEntries = getAllOxfordaqaSubjectParams().flatMap((p) => {
        const subject = resolveOxfordaqaSubject(p.qualification, p.subject)
        if (!subject) return []
        const hub = oxfordaqaSubjectPath(p.qualification, p.subject)
        const paperEntries = subject.papers.map((paper) =>
          entry(oxfordaqaPaperPath(p.qualification, p.subject, paper.slug), {
            priority: 0.78,
            changeFrequency: 'monthly',
          })
        )
        return [
          entry(hub, { priority: 0.86 }),
          entry(oxfordaqaSubjectPastPapersPath(p.qualification, p.subject), {
            priority: 0.82,
            changeFrequency: 'monthly',
          }),
          entry(oxfordaqaSubjectBoundariesPath(p.qualification, p.subject), {
            priority: 0.8,
            changeFrequency: 'monthly',
          }),
          ...paperEntries,
        ]
      })
      return [
        entry(oxfordaqaRootPath(), { priority: 0.9 }),
        ...qualEntries,
        ...subjectEntries,
      ]
    }

    case 'aqa':
      return [
        entry(aqaRootPath(), { priority: 0.9 }),
        entry('/aqa/a-level', { priority: 0.86, changeFrequency: 'weekly' }),
        ...getAllAqaSubjectParams().map((p) =>
          entry(aqaSubjectPath(p.subject), {
            priority: 0.86,
            changeFrequency: 'weekly',
          })
        ),
      ]

    case 'ap':
      return [
        entry(apRootPath(), { priority: 0.9 }),
        entry(apScoreCalculatorPath(), {
          priority: 0.7,
          changeFrequency: 'monthly',
        }),
        ...getAllApCourseParams().map((p) =>
          entry(apCoursePath(p.course), {
            priority: 0.86,
            changeFrequency: 'weekly',
          })
        ),
      ]

    case 'questions':
      // Hub + a capped sample of examinable units. Full inventory grows via
      // internal links once GSC shows which subjects convert.
      return [
        entry('/questions', { priority: 0.88 }),
        ...(await listQuestionObjectSlugsSafe(12)).map((slug) =>
          entry(`/questions/${slug}`, {
            priority: 0.78,
            changeFrequency: 'monthly',
          })
        ),
      ]

    case 'markschemes':
      // Separate shard from /questions so GSC can show which intent Google prefers.
      return [
        entry('/markscheme', { priority: 0.86 }),
        ...(await listQuestionObjectSlugsSafe(12)).map((slug) =>
          entry(`/markscheme/${slug}`, {
            priority: 0.76,
            changeFrequency: 'monthly',
          })
        ),
      ]

    case 'community': {
      if (!isCommunityEnabled()) return []
      const subjects = getCommunitySubjects().map((s) =>
        entry(`/community/s/${s.id}`, {
          priority: s.board === 'cambridge' ? 0.76 : 0.74,
          changeFrequency: 'daily',
        })
      )
      const qs = (await listPublishedQuestionRefs()).map((q) => ({
        url: `${base}/community/questions/${q.id}`,
        lastModified: q.updatedAt ? new Date(q.updatedAt) : n,
        changeFrequency: 'weekly' as const,
        priority: 0.7,
      }))
      return [...subjects, ...qs]
    }

    default:
      return []
  }
}

export function isSitemapShardId(value: string): value is SitemapShardId {
  return (SITEMAP_SHARD_IDS as readonly string[]).includes(value)
}

async function listQuestionObjectSlugsSafe(limitPerSubject: number): Promise<string[]> {
  try {
    const { listQuestionObjectSlugs } = await import('@/lib/seo/question-objects')
    return await listQuestionObjectSlugs(limitPerSubject)
  } catch {
    return []
  }
}
