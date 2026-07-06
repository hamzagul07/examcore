import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import type { Components } from 'react-markdown'
import { blogMarkdownComponents } from '@/components/blog/blogMarkdownComponents'

import { isIbGuideSlug } from '@/lib/seo/subject-guides'

function imageAltFromSrc(
  src: string | undefined,
  alt: string | undefined,
  slug?: string
): string {
  if (alt?.trim()) return alt.trim()
  const board = slug && isIbGuideSlug(slug) ? 'IB Diploma' : 'Cambridge'
  if (!src) return `${board} revision illustration`
  const name = src.split('/').pop()?.replace(/\.[a-z]+$/i, '').replace(/[-_]/g, ' ')
  return name ? `${board} revision — ${name}` : `${board} past paper revision illustration`
}

export function BlogMarkdown({ content, slug }: { content: string; slug?: string }) {
  const components: Components = {
    ...blogMarkdownComponents,
    img: ({ src, alt }) => (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={typeof src === 'string' ? src : undefined}
        alt={imageAltFromSrc(typeof src === 'string' ? src : undefined, alt, slug)}
        loading="lazy"
        decoding="async"
        className="my-6 w-full rounded-lg border border-[var(--ec-border)]"
      />
    ),
    hr: () => (
      <hr className="my-10 border-0 h-px bg-gradient-to-r from-transparent via-[var(--ec-border)] to-transparent" />
    ),
  }

  return (
    <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
      {content}
    </ReactMarkdown>
  )
}
