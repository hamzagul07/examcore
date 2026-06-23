import { getIbSubject } from '@/lib/ib/catalog'
import { getIbResources } from '@/lib/ib/resources'

type Props = {
  /** IB catalog slug, e.g. `tok`, `biology-hl`. */
  slug: string
  className?: string
}

/**
 * Curated outbound links to legal free IB study material (IBO specimens, teacher notes).
 * Rendered on IB course hubs — not pirate repositories.
 */
export function IbLegitResourcesPanel({ slug, className }: Props) {
  const subject = getIbSubject(slug)
  const resources = getIbResources(subject ?? { slug })
  if (!resources.length) return null

  return (
    <div className={['card card-pad', className].filter(Boolean).join(' ')}>
      <p className="overline hub-aside-kicker">Free official &amp; teacher resources</p>
      <p className="body-2 mb-4 text-[var(--ec-text-secondary)]">
        Practise with IBO specimen papers and trusted free notes alongside this course.
      </p>
      <ul className="space-y-3">
        {resources.map((r) => (
          <li key={r.href}>
            <a
              href={r.href}
              target="_blank"
              rel="noopener noreferrer"
              className="group block rounded-xl border border-[var(--ec-border)] px-3 py-2.5 transition-colors hover:border-[var(--ec-brand)] hover:bg-[var(--ec-bg-soft)]"
            >
              <span className="flex items-center justify-between gap-2 text-sm font-medium text-[var(--ec-text-primary)]">
                {r.label}
                <span className="text-[var(--ec-text-faint)] transition-colors group-hover:text-[var(--ec-brand)]">
                  ↗
                </span>
              </span>
              {r.note ? (
                <span className="mt-1 block text-xs leading-relaxed text-[var(--ec-text-faint)]">
                  {r.note}
                </span>
              ) : null}
            </a>
          </li>
        ))}
      </ul>
    </div>
  )
}
