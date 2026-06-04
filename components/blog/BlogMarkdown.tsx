import type { ReactNode } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import type { Components } from 'react-markdown'

function slugify(text: string): string {
  return text
    .replace(/[^\w\s-]/g, '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .slice(0, 80)
}

function headingText(children: ReactNode): string {
  if (typeof children === 'string') return children
  if (Array.isArray(children)) {
    return children.map((c) => (typeof c === 'string' ? c : '')).join('')
  }
  return ''
}

function imageAltFromSrc(src: string | undefined, alt: string | undefined): string {
  if (alt?.trim()) return alt.trim()
  if (!src) return 'Illustration'
  const name = src.split('/').pop()?.replace(/\.[a-z]+$/i, '').replace(/[-_]/g, ' ')
  return name ? `Cambridge revision — ${name}` : 'Cambridge past paper revision illustration'
}

const components: Components = {
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
  h2: ({ children }) => {
    const text = headingText(children)
    const id = slugify(text)
    return (
      <h2 id={id} className="scroll-mt-28" data-chunk-id={id}>
        {children}
      </h2>
    )
  },
  h3: ({ children }) => {
    const text = headingText(children)
    const id = slugify(text)
    return (
      <h3 id={id} className="scroll-mt-28">
        {children}
      </h3>
    )
  },
}

export function BlogMarkdown({ content, slug: _slug }: { content: string; slug?: string }) {
  return (
    <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
      {content}
    </ReactMarkdown>
  )
}
