import type { Components } from 'react-markdown'
import { headingPlainText, headingSlug } from '@/lib/blog/heading-slug'

/** Shared react-markdown map for blog / guide article bodies. */
export const blogMarkdownComponents: Components = {
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
  blockquote: ({ children }) => <blockquote>{children}</blockquote>,
  hr: () => <hr />,
  h2: ({ children }) => {
    const id = headingSlug(headingPlainText(children))
    return (
      <h2 id={id} className="scroll-mt-28">
        {children}
      </h2>
    )
  },
  h3: ({ children }) => {
    const id = headingSlug(headingPlainText(children))
    return (
      <h3 id={id} className="scroll-mt-28">
        {children}
      </h3>
    )
  },
  table: ({ children }) => (
    <div className="ec-blog-table-wrap overflow-x-auto">
      <table>{children}</table>
    </div>
  ),
  thead: ({ children }) => <thead>{children}</thead>,
  tbody: ({ children }) => <tbody>{children}</tbody>,
  tr: ({ children }) => <tr>{children}</tr>,
  th: ({ children }) => <th>{children}</th>,
  td: ({ children }) => <td>{children}</td>,
}
