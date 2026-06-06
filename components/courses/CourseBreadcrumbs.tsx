import Link from 'next/link'
import { ChevronRight } from 'lucide-react'

export function CourseBreadcrumbs({
  items,
}: {
  items: { name: string; path: string }[]
}) {
  return (
    <nav aria-label="Breadcrumb" className="mb-6">
      <ol className="flex flex-wrap items-center gap-1 text-xs text-[var(--ec-text-tertiary)] sm:text-sm">
        {items.map((item, i) => {
          const isLast = i === items.length - 1
          return (
            <li key={item.path} className="flex items-center gap-1">
              {i > 0 ? (
                <ChevronRight className="h-3.5 w-3.5 shrink-0 opacity-50" aria-hidden />
              ) : null}
              {isLast ? (
                <span className="font-medium text-[var(--ec-text-secondary)]" aria-current="page">
                  {item.name}
                </span>
              ) : (
                <Link
                  href={item.path}
                  className="text-[var(--ec-text-tertiary)] no-underline hover:text-[var(--ec-accent)]"
                >
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
