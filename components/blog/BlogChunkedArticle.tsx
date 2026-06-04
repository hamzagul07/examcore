import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import type { Components } from 'react-markdown'
import { parseFanOutChunks } from '@/lib/seo/fan-out'

type Props = {
  content: string
  slug: string
}

const inlineComponents: Components = {
  p: ({ children }) => <p className="mb-4 last:mb-0">{children}</p>,
  ul: ({ children }) => <ul className="mb-4 list-disc pl-5">{children}</ul>,
  ol: ({ children }) => <ol className="mb-4 list-decimal pl-5">{children}</ol>,
  li: ({ children }) => <li className="mb-1">{children}</li>,
  strong: ({ children }) => (
    <strong className="font-semibold text-[var(--ec-text-primary)]">{children}</strong>
  ),
  a: ({ href, children }) => (
    <a href={href} className="ec-link font-medium">
      {children}
    </a>
  ),
  table: ({ children }) => (
    <div className="mb-4 overflow-x-auto">
      <table className="w-full text-sm">{children}</table>
    </div>
  ),
}

/**
 * Fan-out / chunk retrieval layout — each H2 section is self-contained with
 * an entity-rich lead sentence for RAG passage selection.
 */
export function BlogChunkedArticle({ content, slug }: Props) {
  const chunks = parseFanOutChunks(content, slug)
  if (chunks.length < 2) {
    return (
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={inlineComponents}>
        {content}
      </ReactMarkdown>
    )
  }

  return (
    <div className="ec-fanout-article space-y-12">
      {chunks.map((chunk) => (
        <section
          key={chunk.id}
          id={chunk.id}
          data-chunk-id={chunk.id}
          data-sub-intent={chunk.subIntent}
          className="ec-fanout-chunk scroll-mt-28"
          aria-labelledby={`heading-${chunk.id}`}
        >
          {chunk.level === 2 ? (
            <h2
              id={`heading-${chunk.id}`}
              className="text-xl font-bold text-[var(--ec-text-primary)] sm:text-2xl"
            >
              {chunk.heading}
            </h2>
          ) : (
            <h3
              id={`heading-${chunk.id}`}
              className="text-lg font-bold text-[var(--ec-text-primary)]"
            >
              {chunk.heading}
            </h3>
          )}
          <p className="ec-chunk-lead mt-3 text-base font-medium leading-relaxed text-[var(--ec-text-primary)]">
            {chunk.lead}
          </p>
          <div className="ec-chunk-body mt-4 text-[var(--ec-text-secondary)]">
            <ReactMarkdown remarkPlugins={[remarkGfm]} components={inlineComponents}>
              {chunk.bodyMarkdown || ''}
            </ReactMarkdown>
          </div>
        </section>
      ))}
    </div>
  )
}
