import { extractSerpSnippets } from '@/lib/seo/content-extract'

type Props = { content: string }

/**
 * SERP feature targets — visible Q&A blocks (40–60 word answers) for snippets / PAA.
 */
export function BlogSerpSnippets({ content }: Props) {
  const snippets = extractSerpSnippets(content)
  if (snippets.length < 2) return null

  return (
    <section className="ms-blog-aside mt-10" aria-label="Key questions answered">
      <p className="ms-overline">Key questions</p>
      <dl className="space-y-5">
        {snippets.map((s) => (
          <div key={s.question} data-chunk-id={s.question.slice(0, 40).replace(/\W+/g, '-').toLowerCase()}>
            <dt className="text-base font-semibold text-[var(--ec-text-primary)]">
              {s.question}
            </dt>
            <dd className="mt-2 text-sm leading-relaxed text-[var(--ec-text-secondary)]">
              {s.answer}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  )
}
