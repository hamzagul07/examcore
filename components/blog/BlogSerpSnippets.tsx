import { extractSerpSnippets } from '@/lib/seo/content-extract'

type Props = { content: string }

/**
 * SERP feature targets — visible Q&A blocks (40–60 word answers) for snippets / PAA.
 */
export function BlogSerpSnippets({ content }: Props) {
  const snippets = extractSerpSnippets(content)
  if (snippets.length < 2) return null

  return (
    <section
      className="ec-blog-serp-snippets mt-10 rounded-xl border border-[var(--ec-border)] bg-[var(--ec-surface)]/40 p-5 sm:p-6"
      aria-label="Key questions answered"
    >
      <p className="ec-label-tech mb-4">KEY QUESTIONS</p>
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
