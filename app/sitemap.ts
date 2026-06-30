import type { MetadataRoute } from 'next'
import { SITE_URL } from '@/lib/site-config'
import { getAllBlogSlugs, getBlogPosts, getBlogPostLastModified } from '@/lib/blog'
import { BLOG_CATEGORY_LABELS } from '@/lib/blog/meta'
import { BOARDS, resolveBoardMeta } from '@/lib/content/taxonomy'
import { blogSitemapPriority } from '@/lib/seo/sitemap-priority'
import { CONTENT_CLUSTERS } from '@/lib/seo/clusters'
import { getMarkingSubjectCodes } from '@/lib/seo/programmatic-subjects'
import { getPastPaperSubjectCodes } from '@/lib/seo/past-papers'
import { getAllTopicQuestionParams } from '@/lib/seo/topic-questions'
import { getIbSubjectSlugs } from '@/lib/ib/catalog'
import { getIbCourseSlugs, getAllIbCourseLessonParams } from '@/lib/courses/ib'
import { getAllIbTopicPracticeParams } from '@/lib/seo/ib-topic-practice'
import { getCourseLessons, getCourseSubjectCodes } from '@/lib/courses'
import { lessonLastModified } from '@/lib/courses/seo'
import { getCommunitySubjects } from '@/lib/community/subjects'
import { isCommunityEnabled } from '@/lib/community/enabled'

const STATIC_ROUTES = [
  { path: '', priority: 1, changeFrequency: 'weekly' as const },
  { path: '/mark', priority: 0.95, changeFrequency: 'weekly' as const },
  { path: '/subjects', priority: 0.85, changeFrequency: 'monthly' as const },
  { path: '/how-it-works', priority: 0.85, changeFrequency: 'monthly' as const },
  { path: '/pricing', priority: 0.8, changeFrequency: 'monthly' as const },
  { path: '/faq', priority: 0.75, changeFrequency: 'monthly' as const },
  { path: '/about', priority: 0.7, changeFrequency: 'monthly' as const },
  { path: '/contact', priority: 0.65, changeFrequency: 'monthly' as const },
  { path: '/blog', priority: 0.9, changeFrequency: 'weekly' as const },
  { path: '/guides', priority: 0.88, changeFrequency: 'weekly' as const },
  { path: '/compare', priority: 0.82, changeFrequency: 'monthly' as const },
  { path: '/research', priority: 0.75, changeFrequency: 'monthly' as const },
  { path: '/insights', priority: 0.87, changeFrequency: 'weekly' as const },
  { path: '/courses', priority: 0.9, changeFrequency: 'weekly' as const },
  { path: '/past-papers', priority: 0.9, changeFrequency: 'weekly' as const },
  { path: '/ib', priority: 0.88, changeFrequency: 'weekly' as const },
  { path: '/ib/courses', priority: 0.87, changeFrequency: 'weekly' as const },
  { path: '/ib/subjects', priority: 0.82, changeFrequency: 'monthly' as const },
  { path: '/ib/past-papers', priority: 0.85, changeFrequency: 'weekly' as const },
  { path: '/ib/topic-practice', priority: 0.84, changeFrequency: 'weekly' as const },
  { path: '/past-papers/topics', priority: 0.84, changeFrequency: 'weekly' as const },
  { path: '/tools', priority: 0.83, changeFrequency: 'monthly' as const },
  { path: '/tools/grade-boundary-calculator', priority: 0.82, changeFrequency: 'monthly' as const },
  { path: '/tools/command-words', priority: 0.8, changeFrequency: 'monthly' as const },
  { path: '/tools/ib-points-calculator', priority: 0.82, changeFrequency: 'monthly' as const },
  { path: '/tools/pum-calculator', priority: 0.8, changeFrequency: 'monthly' as const },
  { path: '/tools/exam-countdown', priority: 0.8, changeFrequency: 'monthly' as const },
  { path: '/join', priority: 0.5, changeFrequency: 'monthly' as const },
  { path: '/auth/signin', priority: 0.45, changeFrequency: 'monthly' as const },
  { path: '/auth/signup', priority: 0.45, changeFrequency: 'monthly' as const },
  { path: '/privacy', priority: 0.3, changeFrequency: 'yearly' as const },
  { path: '/terms', priority: 0.3, changeFrequency: 'yearly' as const },
  { path: '/refunds', priority: 0.3, changeFrequency: 'yearly' as const },
  { path: '/cookies', priority: 0.3, changeFrequency: 'yearly' as const },
  { path: '/community/guidelines', priority: 0.4, changeFrequency: 'yearly' as const },
  { path: '/community', priority: 0.88, changeFrequency: 'daily' as const },
  { path: '/community/subjects', priority: 0.82, changeFrequency: 'weekly' as const },
]

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date()
  const base = SITE_URL.replace(/\/$/, '')

  const staticEntries: MetadataRoute.Sitemap = STATIC_ROUTES.map((route) => ({
    url: `${base}${route.path}`,
    lastModified: now,
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }))

  const blogEntries: MetadataRoute.Sitemap = getAllBlogSlugs().map((slug) => ({
    url: `${base}/blog/${slug}`,
    lastModified: getBlogPostLastModified(slug) ?? now,
    changeFrequency: 'weekly' as const,
    priority: blogSitemapPriority(slug),
  }))

  const guideEntries: MetadataRoute.Sitemap = CONTENT_CLUSTERS.map((c) => ({
    url: `${base}${c.path}`,
    lastModified: now,
    changeFrequency: 'weekly' as const,
    priority: 0.86,
  }))

  const blogCategoryEntries: MetadataRoute.Sitemap = Object.keys(
    BLOG_CATEGORY_LABELS
  ).map((category) => ({
    url: `${base}/blog/category/${category}`,
    lastModified: now,
    changeFrequency: 'weekly' as const,
    priority: 0.7,
  }))

  const subjectEntries: MetadataRoute.Sitemap = getMarkingSubjectCodes().map(
    (code) => ({
      url: `${base}/subjects/${code}`,
      lastModified: now,
      changeFrequency: 'monthly' as const,
      priority: 0.84,
    })
  )

  const calculatorEntries: MetadataRoute.Sitemap = getMarkingSubjectCodes().flatMap(
    (code) => [
      {
        url: `${base}/tools/grade-boundary-calculator/${code}`,
        lastModified: now,
        changeFrequency: 'monthly' as const,
        priority: 0.7,
      },
      {
        url: `${base}/tools/command-words/${code}`,
        lastModified: now,
        changeFrequency: 'monthly' as const,
        priority: 0.68,
      },
    ]
  )

  const pastPaperEntries: MetadataRoute.Sitemap = getPastPaperSubjectCodes().map(
    (code) => ({
      url: `${base}/past-papers/${code}`,
      lastModified: now,
      changeFrequency: 'monthly' as const,
      priority: 0.83,
    })
  )

  const topicQuestionEntries: MetadataRoute.Sitemap = getAllTopicQuestionParams().map(
    ({ code, topic }) => ({
      url: `${base}/past-papers/${code}/${topic}`,
      lastModified: now,
      changeFrequency: 'monthly' as const,
      priority: 0.72,
    })
  )

  const ibEntries: MetadataRoute.Sitemap = getIbSubjectSlugs().flatMap((slug) => [
    {
      url: `${base}/ib/subjects/${slug}`,
      lastModified: now,
      changeFrequency: 'monthly' as const,
      priority: 0.8,
    },
    {
      url: `${base}/ib/past-papers/${slug}`,
      lastModified: now,
      changeFrequency: 'monthly' as const,
      priority: 0.8,
    },
  ])

  const ibCourseEntries: MetadataRoute.Sitemap = [
    ...getIbCourseSlugs().map((slug) => ({
      url: `${base}/ib/courses/${slug}`,
      lastModified: now,
      changeFrequency: 'weekly' as const,
      priority: 0.85,
    })),
    ...getAllIbCourseLessonParams().map(({ slug, lesson }) => ({
      url: `${base}/ib/courses/${slug}/${lesson}`,
      lastModified: now,
      changeFrequency: 'monthly' as const,
      priority: 0.8,
    })),
  ]

  const ibTopicPracticeEntries: MetadataRoute.Sitemap = getAllIbTopicPracticeParams().map(
    ({ slug, topic }) => ({
      url: `${base}/ib/past-papers/${slug}/${topic}`,
      lastModified: now,
      changeFrequency: 'monthly' as const,
      priority: 0.76,
    })
  )

  const courseSubjectEntries: MetadataRoute.Sitemap = getCourseSubjectCodes().map(
    (code) => ({
      url: `${base}/courses/${code}`,
      lastModified: now,
      changeFrequency: 'weekly' as const,
      priority: 0.9,
    })
  )

  const courseLessonEntries: MetadataRoute.Sitemap = getCourseSubjectCodes().flatMap(
    (code) => {
      const seen = new Set<string>()
      return getCourseLessons(code)
        .filter((lesson) => {
          if (seen.has(lesson.slug)) return false
          seen.add(lesson.slug)
          return true
        })
        .map((lesson) => {
          const isPremium =
            lesson.status === 'premium' || lesson.status === 'published'
          return {
            url: `${base}/courses/${code}/${lesson.slug}`,
            lastModified: lessonLastModified(lesson) ?? now,
            changeFrequency: 'weekly' as const,
            priority: isPremium ? 0.86 : 0.78,
          }
        })
    }
  )

  const communityEntries: MetadataRoute.Sitemap = isCommunityEnabled()
    ? getCommunitySubjects().map((s) => ({
        url: `${base}/community/s/${s.id}`,
        lastModified: now,
        changeFrequency: 'daily' as const,
        priority: s.board === 'cambridge' ? 0.76 : 0.74,
      }))
    : []

  const browsePosts = getBlogPosts()
  const browseFacetEntries: MetadataRoute.Sitemap = BOARDS.flatMap((board) => {
    const subjects = new Set<string>()
    for (const p of browsePosts) {
      const m = resolveBoardMeta(p.slug, p)
      if (m.board === board && m.subject) subjects.add(m.subject)
    }
    return [
      {
        url: `${base}/blog/browse/${board}`,
        lastModified: now,
        changeFrequency: 'weekly' as const,
        priority: 0.6,
      },
      ...[...subjects].map((subject) => ({
        url: `${base}/blog/browse/${board}/${subject}`,
        lastModified: now,
        changeFrequency: 'weekly' as const,
        priority: 0.55,
      })),
    ]
  })

  return [
    ...staticEntries,
    ...guideEntries,
    ...subjectEntries,
    ...pastPaperEntries,
    ...topicQuestionEntries,
    ...ibEntries,
    ...ibTopicPracticeEntries,
    ...ibCourseEntries,
    ...calculatorEntries,
    ...courseSubjectEntries,
    ...courseLessonEntries,
    ...communityEntries,
    ...blogCategoryEntries,
    ...browseFacetEntries,
    ...blogEntries,
  ]
}
