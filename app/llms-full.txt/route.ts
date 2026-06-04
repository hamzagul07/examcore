import { SITE_URL, SITE_NAME, CONTACT_EMAIL } from '@/lib/site-config'
import { getMarkingSubjectCodes } from '@/lib/seo/programmatic-subjects'
import { CONTENT_CLUSTERS } from '@/lib/seo/clusters'
import { getAllBlogSlugs } from '@/lib/blog'

/** Expanded llms.txt — chunk-friendly URL index for RAG / AI crawlers. */
export async function GET() {
  const base = SITE_URL.replace(/\/$/, '')
  const subjects = getMarkingSubjectCodes()
  const blogs = getAllBlogSlugs()

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
