import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import { parseFanOutChunks } from '@/lib/seo/fan-out'
import { blogMarkdownComponents } from '@/components/blog/blogMarkdownComponents'
import { normalizeMarkingText } from '@/lib/rich-text/normalize-marking-text'
import { KATEX_REHYPE_OPTIONS } from '@/lib/rich-text/sanitize-latex'

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
  const plugins = {
    remarkPlugins: [remarkGfm, [remarkMath, { singleDollarTextMath: true }] as const],
    rehypePlugins: [[rehypeKatex, KATEX_REHYPE_OPTIONS] as const],
  }

  if (chunks.length < 2) {
    return (
      <div className="ms-rich-text">
        <ReactMarkdown
          remarkPlugins={plugins.remarkPlugins as never}
          rehypePlugins={plugins.rehypePlugins as never}
          components={blogMarkdownComponents}
        >
          {normalizeMarkingText(content)}
        </ReactMarkdown>
      </div>
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
            <h2 id={chunk.id} className="ms-h3 scroll-mt-28">
              {chunk.heading}
            </h2>
          ) : (
            <h3 id={chunk.id} className="ms-h3 scroll-mt-28">
              {chunk.heading}
            </h3>
          )}
          <p className="ec-chunk-lead mt-3 font-medium">{chunk.lead}</p>
          <div className="ec-chunk-body ms-rich-text mt-4">
            <ReactMarkdown
              remarkPlugins={plugins.remarkPlugins as never}
              rehypePlugins={plugins.rehypePlugins as never}
              components={blogMarkdownComponents}
            >
              {normalizeMarkingText(chunk.bodyMarkdown || '')}
            </ReactMarkdown>
          </div>
        </section>
      ))}
    </div>
  )
}
