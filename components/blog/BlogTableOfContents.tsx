import type { BlogHeading } from '@/lib/blog/meta'

type Props = {
  headings: BlogHeading[]
}

export function BlogTableOfContents({ headings }: Props) {
  const h2s = headings.filter((h) => h.level === 2)
  if (h2s.length < 3) return null

  return (
    <nav
      className="ec-blog-toc hidden lg:block"
      aria-label="On this page"
    >
      <p className="ec-label-tech mb-3">ON THIS PAGE</p>
      <ol className="space-y-2 text-sm">
        {headings.map((h) => (
          <li
            key={h.id}
            className={h.level === 3 ? 'pl-3' : undefined}
          >
            <a
              href={`#${h.id}`}
              className="text-[var(--ec-text-secondary)] transition-colors hover:text-[var(--ec-brand)]"
            >
              {h.text}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  )
}
