import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { BlogRevisionHubInvite } from '@/components/blog/BlogRevisionHubInvite'
import { parseFanOutChunks } from '@/lib/seo/fan-out'
import { getSubjectGuideSlugForCode } from '@/lib/seo/subject-guides'
import { getSyllabusSubjectName } from '@/lib/syllabi'
import type { BlogHubVariant } from '@/lib/blog/revision-hub-copy'
import { blogMarkdownComponents } from '@/components/blog/blogMarkdownComponents'

type Props = {
  content: string
  slug: string
  variant?: BlogHubVariant
  subjectCode?: string | null
}

function subjectGuidesHrefForCode(subjectCode: string | null | undefined): string | null {
  if (!subjectCode) return null
  const guideSlug = getSubjectGuideSlugForCode(subjectCode)
  if (guideSlug) return `/blog/${guideSlug}`
  return `/subjects/${subjectCode}`
}

function calculatorHrefForCode(subjectCode: string | null | undefined): string | null {
  if (!subjectCode) return '/tools/grade-boundary-calculator'
  return `/tools/grade-boundary-calculator/${subjectCode}`
}

/**
 * Fan-out / chunk retrieval layout — each H2 section is self-contained with
 * an entity-rich lead sentence for RAG passage selection.
 */
export function BlogChunkedArticle({
  content,
  slug,
  variant = 'default',
  subjectCode = null,
}: Props) {
  const chunks = parseFanOutChunks(content, slug)
  const subjectGuidesHref = subjectGuidesHrefForCode(subjectCode)
  const subjectName = subjectCode ? getSyllabusSubjectName(subjectCode) : null
  const calculatorHref =
    variant === 'grade-boundaries' ? calculatorHrefForCode(subjectCode) : null

  const invite = (
    <BlogRevisionHubInvite
      slug={slug}
      variant={variant}
      subjectCode={subjectCode}
      subjectName={subjectName}
      subjectGuidesHref={subjectGuidesHref}
      calculatorHref={calculatorHref}
    />
  )

  if (chunks.length < 2) {
    return (
      <>
        <ReactMarkdown remarkPlugins={[remarkGfm]} components={blogMarkdownComponents}>
          {content}
        </ReactMarkdown>
        {invite}
      </>
    )
  }

  return (
    <div className="ec-fanout-article space-y-12">
      {chunks.map((chunk, index) => (
        <div key={chunk.id}>
          <section
            data-chunk-id={chunk.id}
            data-sub-intent={chunk.subIntent}
            className="ec-fanout-chunk scroll-mt-28"
            aria-labelledby={chunk.id}
          >
            {chunk.level === 2 ? (
              <h2
                id={chunk.id}
                className="ms-h3 scroll-mt-28"
                style={{ fontSize: 'clamp(1.35rem, 3vw, 1.75rem)' }}
              >
                {chunk.heading}
              </h2>
            ) : (
              <h3 id={chunk.id} className="ms-h3 scroll-mt-28">
                {chunk.heading}
              </h3>
            )}
            <p className="ec-chunk-lead mt-3 text-base font-medium leading-relaxed text-[var(--ec-text-primary)]">
              {chunk.lead}
            </p>
            <div className="ec-chunk-body mt-4 text-[var(--ec-text-secondary)]">
              <ReactMarkdown remarkPlugins={[remarkGfm]} components={blogMarkdownComponents}>
                {chunk.bodyMarkdown || ''}
              </ReactMarkdown>
            </div>
          </section>
          {index === 0 ? invite : null}
        </div>
      ))}
    </div>
  )
}
