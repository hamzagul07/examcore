import Link from 'next/link'
import { getClusterForSlug } from '@/lib/seo/clusters'
import { getFollowUpChainForSlug } from '@/lib/seo/follow-up-chain'

type Props = { slug: string }

/** Conversational follow-up chain — next questions in AI Mode fan-out. */
export function BlogFollowUpChain({ slug }: Props) {
  const cluster = getClusterForSlug(slug)
  const items = getFollowUpChainForSlug(slug, cluster.id)
  if (items.length === 0) return null

  return (
    <section className="ms-blog-aside mt-12" aria-label="Follow-up questions">
      <div className="mb-4 flex items-center gap-2">
        <span className="inline-grid h-5 min-w-5 place-items-center rounded border border-[var(--ec-brand-border)] bg-[var(--ec-brand-muted)] px-1 font-mono text-[10px] font-bold tracking-wide text-[var(--ec-brand)]" aria-hidden>Q</span>
        <p className="ms-overline" style={{ marginBottom: 0 }}>
          If you&apos;re still wondering
        </p>
      </div>
      <ol className="space-y-6">
        {items.map((item, i) => (
          <li key={item.question} data-chunk-id={`followup-${i}`}>
            <h3 className="text-base font-semibold text-[var(--ec-text-primary)]">
              {item.question}
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-[var(--ec-text-secondary)]">
              {item.answer}
            </p>
            {item.href && (
              <Link href={item.href} className="ec-link mt-2 inline-block text-sm font-semibold">
                Read more →
              </Link>
            )}
          </li>
        ))}
      </ol>
    </section>
  )
}
