import { getQueriesForSlug } from '@/lib/seo/conversational-queries'

type Props = { slug: string }

/** Surfaces real UGC phrasing — aligns with synthetic fan-out sub-queries. */
export function BlogConversationalQueries({ slug }: Props) {
  const phrases = getQueriesForSlug(slug).slice(0, 5)
  if (phrases.length === 0) return null

  return (
    <aside className="mt-6" aria-label="How people search">
      <p className="ms-overline">People also phrase it as</p>
      <ul className="ms-hub-strip mt-2">
        {phrases.map((p) => (
          <li key={p}>
            <span className="ms-ob-chip">&ldquo;{p}&rdquo;</span>
          </li>
        ))}
      </ul>
    </aside>
  )
}
