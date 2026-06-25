import Link from 'next/link'

export type MarketingBreadcrumbItem = {
  name: string
  path: string
}

type Props = {
  items: MarketingBreadcrumbItem[]
  className?: string
}

/** Visible HTML breadcrumbs — pairs with PageJsonLd breadcrumbList. */
export function MarketingBreadcrumbs({ items, className = '' }: Props) {
  if (items.length < 2) return null

  return (
    <nav aria-label="Breadcrumb" className={className}>
      <ol className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-sm text-[var(--ec-text-secondary)]">
        {items.map((item, i) => {
          const isLast = i === items.length - 1
          return (
            <li key={item.path} className="inline-flex max-w-full items-center gap-1.5">
              {i > 0 ? (
                <span className="text-[var(--ec-text-faint)]" aria-hidden>
                  /
                </span>
              ) : null}
              {isLast ? (
                <span
                  className="truncate font-medium text-[var(--ec-text-primary)]"
                  aria-current="page"
                >
                  {item.name}
                </span>
              ) : (
                <Link href={item.path} className="ec-btn-underline truncate">
                  {item.name}
                </Link>
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
