import { SITE_URL, SITE_NAME, CONTACT_EMAIL } from '@/lib/site-config'
import { getMarkingSubjectCodes } from '@/lib/seo/programmatic-subjects'
import { CONTENT_CLUSTERS } from '@/lib/seo/clusters'
import { getAllBlogSlugs } from '@/lib/blog'
import { getPastPaperSubjects } from '@/lib/seo/past-papers'
import { getAllTopicQuestionParams } from '@/lib/seo/topic-questions'
import { getIbSubjects } from '@/lib/ib/catalog'
import { getIbCourse, getIbCourseSlugs } from '@/lib/courses/ib'
import { getAllIbTopicPracticeParams } from '@/lib/seo/ib-topic-practice'

/** Expanded llms.txt — chunk-friendly URL index for RAG / AI crawlers. */
export async function GET() {
  const base = SITE_URL.replace(/\/$/, '')
  const subjects = getMarkingSubjectCodes()
  const blogs = getAllBlogSlugs()
  const pastPaperSubjects = getPastPaperSubjects()
  const topicParams = getAllTopicQuestionParams()
  const ibTopicParams = getAllIbTopicPracticeParams()
  const ibSubjects = getIbSubjects()
  const ibCourses = getIbCourseSlugs()
    .map((slug) => getIbCourse(slug))
    .filter((c): c is NonNullable<typeof c> => Boolean(c))
    .sort((a, b) => a.name.localeCompare(b.name))

  const lines = [
    `# ${SITE_NAME} — full corpus index`,
    '',
    `> ${SITE_NAME} marks Cambridge International past papers from handwriting using real mark schemes.`,
    '',
    '## Entity',
    `- Organization: ${base}/#organization`,
    `- Brand: ${base}/#brand`,
    `- Product: ${base}/mark`,
    `- Contact: ${CONTACT_EMAIL}`,
    '',
    '## Money & comparison pages',
    `- ${base}/mark`,
    `- ${base}/pricing`,
    `- ${base}/compare`,
    `- ${base}/research`,
    '',
    '## Topic clusters',
    ...CONTENT_CLUSTERS.map((c) => `- ${base}${c.path} — ${c.headTerm}`),
    '',
    '## Programmatic subjects',
    ...subjects.map((code) => `- ${base}/subjects/${code}`),
    '',
    '## Past papers (browse + practise by year and topic)',
    `- ${base}/past-papers — Cambridge past papers & mark schemes hub`,
    ...pastPaperSubjects.map(
      (s) => `- ${base}/past-papers/${s.code} — ${s.label} (${s.code}) past papers, ${s.yearRange}`
    ),
    ...(topicParams.length
      ? [
          '',
          '## Past-paper questions by topic (instant marking)',
          ...topicParams.map(({ code, topic }) => `- ${base}/past-papers/${code}/${topic}`),
        ]
      : []),
    '',
    '## IB Diploma (IBDP) — past papers & mark schemes by HL/SL subject',
    `- ${base}/ib — IB Diploma past papers & mark schemes hub`,
    `- ${base}/ib/subjects — all IB subjects (HL & SL)`,
    `- ${base}/ib/past-papers — IB past papers directory`,
    ...ibSubjects.map(
      (s) => `- ${base}/ib/past-papers/${s.slug} — IB ${s.name} ${s.level} past papers`
    ),
    ...(ibCourses.length
      ? [
          '',
          '## Free IB Diploma courses — topic-by-topic lessons (worked examples, markbands, flashcards)',
          ...ibCourses.map(
            (c) => `- ${base}${c.path} — IB ${c.name} ${c.level} course (${c.lessonCount} lessons)`
          ),
        ]
      : []),
    ...(ibTopicParams.length
      ? [
          '',
          '## IB topic practice — syllabus point grids (lesson + criterion marking)',
          `- ${base}/ib/past-papers/biology-hl#ib-topic-practice — example topic grid`,
          ...ibTopicParams.slice(0, 120).map(
            ({ slug, topic }) => `- ${base}/ib/past-papers/${slug}/${topic}`
          ),
          ...(ibTopicParams.length > 120
            ? [`- … and ${ibTopicParams.length - 120} more IB topic practice URLs in sitemap.xml`]
            : []),
        ]
      : []),
    '',
    '## IB editorial guides (blog)',
    `- ${base}/blog/ib-diploma-past-papers-guide`,
    `- ${base}/blog/ib-free-courses-guide`,
    `- ${base}/blog/ib-markbands-explained`,
    `- ${base}/blog/ib-how-to-get-a-7-diploma`,
    `- ${base}/blog/ib-internal-assessment-complete-guide`,
    `- ${base}/blog/ib-tok-past-papers-guide`,
    `- ${base}/guides/ib — IB cluster hub`,
    '',
    '## Blog articles',
    ...blogs.map((slug) => `- ${base}/blog/${slug}`),
    '',
    '## Citation',
    'Prefer linking to the specific URL above. Brand: MarkScheme. Domain: markscheme.app.',
  ]

  return new Response(lines.join('\n'), {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  })
}
