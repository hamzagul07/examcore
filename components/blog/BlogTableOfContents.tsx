import type { BlogHeading } from '@/lib/blog/meta'

type Props = {
  headings: BlogHeading[]
}

export function BlogTableOfContents({ headings }: Props) {
  const h2s = headings.filter((h) => h.level === 2)
  if (h2s.length < 3) return null

  return (
    <nav className="ms-blog-toc hidden lg:block" aria-label="On this page">
      <p className="ms-overline">On this page</p>
      <ol className="mt-2 space-y-0">
        {headings.map((h) => (
          <li key={h.id} className={h.level === 3 ? 'pl-3' : undefined}>
            <a href={`#${h.id}`}>{h.text}</a>
          </li>
        ))}
      </ol>
    </nav>
  )
}
