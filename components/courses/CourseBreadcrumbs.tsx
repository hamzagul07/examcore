import Link from 'next/link'
import { ChevronRight } from 'lucide-react'

export function CourseBreadcrumbs({
  items,
}: {
  items: { name: string; path: string }[]
}) {
  return (
    <nav aria-label="Breadcrumb" className="course-studio-breadcrumbs">
      <ol className="course-studio-breadcrumb-list">
        {items.map((item, i) => {
          const isLast = i === items.length - 1
          return (
            <li key={item.path} className="course-studio-breadcrumb-item">
              {i > 0 ? (
                <ChevronRight className="course-studio-breadcrumb-sep" aria-hidden />
              ) : null}
              {isLast ? (
                <span className="course-studio-breadcrumb-pill" aria-current="page">
                  {item.name}
                </span>
              ) : (
                <Link href={item.path} className="course-studio-breadcrumb-link">
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
