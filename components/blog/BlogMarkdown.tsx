import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import type { Components } from 'react-markdown'
import { blogMarkdownComponents } from '@/components/blog/blogMarkdownComponents'

function imageAltFromSrc(src: string | undefined, alt: string | undefined): string {
  if (alt?.trim()) return alt.trim()
  if (!src) return 'Illustration'
  const name = src.split('/').pop()?.replace(/\.[a-z]+$/i, '').replace(/[-_]/g, ' ')
  return name ? `Cambridge revision — ${name}` : 'Cambridge past paper revision illustration'
}

const components: Components = {
  ...blogMarkdownComponents,
  img: ({ src, alt }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={typeof src === 'string' ? src : undefined}
      alt={imageAltFromSrc(typeof src === 'string' ? src : undefined, alt)}
      loading="lazy"
      decoding="async"
      className="my-6 w-full rounded-lg border border-[var(--ec-border)]"
    />
  ),
  hr: () => (
    <hr className="my-10 border-0 h-px bg-gradient-to-r from-transparent via-[var(--ec-border)] to-transparent" />
  ),
}

export function BlogMarkdown({ content }: { content: string; slug?: string }) {
  return (
    <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
      {content}
    </ReactMarkdown>
  )
}
