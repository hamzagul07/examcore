import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { parseFanOutChunks } from '@/lib/seo/fan-out'
import { blogMarkdownComponents } from '@/components/blog/blogMarkdownComponents'

type Props = {
  content: string
  slug: string
}

/**
 * Fan-out / chunk retrieval layout — each H2 section is self-contained with
 * an entity-rich lead sentence for RAG passage selection.
 */
export function BlogChunkedArticle({ content, slug }: Props) {
  const chunks = parseFanOutChunks(content, slug)
  if (chunks.length < 2) {
    return (
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={blogMarkdownComponents}>
        {content}
      </ReactMarkdown>
    )
  }

  return (
    <div className="ec-fanout-article space-y-12">
      {chunks.map((chunk) => (
        <section
          key={chunk.id}
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
      ))}
    </div>
  )
}
