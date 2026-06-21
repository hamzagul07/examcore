import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import type { Components } from 'react-markdown'
import { createMarkdownComponents } from '@/lib/rich-text/markdown-components'
import { safeUrl, stripRawHtml } from '@/lib/community/sanitize'

/**
 * Renders UNTRUSTED community markdown safely (see lib/community/sanitize.ts).
 * No rehype-raw → raw HTML is inert; links/images are protocol-checked; links
 * carry rel="nofollow ugc" (no SEO juice to spam). Math via KaTeX (trust:false).
 */
const base = createMarkdownComponents('dark')

const components: Components = {
  ...base,
  a: ({ href, children }) => {
    const url = safeUrl(href)
    if (!url) return <span>{children}</span>
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer nofollow ugc"
        className="text-[var(--ec-brand)] underline underline-offset-2 hover:opacity-80"
      >
        {children}
      </a>
    )
  },
  img: ({ src, alt }) => {
    const url = safeUrl(typeof src === 'string' ? src : undefined)
    if (!url) return null
    // eslint-disable-next-line @next/next/no-img-element
    return (
      <img
        src={url}
        alt={alt || ''}
        loading="lazy"
        className="my-3 max-h-[480px] w-auto max-w-full rounded-xl border border-[var(--ec-border)]"
      />
    )
  },
}

export function CommunityMarkdown({ content }: { content: string }) {
  return (
    <div className="community-md course-rich-text ec-break-anywhere min-w-0 max-w-full">
      <ReactMarkdown
        remarkPlugins={[remarkGfm, [remarkMath, { singleDollarTextMath: true }]]}
        rehypePlugins={[[rehypeKatex, { strict: 'ignore', throwOnError: false }]]}
        components={components}
      >
        {stripRawHtml(content)}
      </ReactMarkdown>
    </div>
  )
}
