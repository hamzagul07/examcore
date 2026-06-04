import { getQueriesForSlug } from '@/lib/seo/conversational-queries'

type Props = { slug: string }

/** Surfaces real UGC phrasing — aligns with synthetic fan-out sub-queries. */
export function BlogConversationalQueries({ slug }: Props) {
  const phrases = getQueriesForSlug(slug).slice(0, 5)
  if (phrases.length === 0) return null

  return (
    <aside className="mt-6 text-sm text-[var(--ec-text-secondary)]" aria-label="How people search">
      <p className="ec-label-tech mb-2">PEOPLE ALSO PHRASE IT AS</p>
      <ul className="flex flex-wrap gap-2">
        {phrases.map((p) => (
          <li
            key={p}
            className="rounded-full border border-[var(--ec-border)] bg-[var(--ec-surface)] px-3 py-1 text-xs italic"
          >
            &ldquo;{p}&rdquo;
          </li>
        ))}
      </ul>
    </aside>
  )
}
