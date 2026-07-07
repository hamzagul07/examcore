import Link from 'next/link'
import { archivePageHref, BLOG_ARCHIVE_PAGE_SIZE } from '@/lib/blog/archive'

type Props = {
  basePath: string
  page: number
  totalPages: number
  total: number
}

export function ArchivePagination({ basePath, page, totalPages, total }: Props) {
  if (totalPages <= 1) return null

  const from = (page - 1) * BLOG_ARCHIVE_PAGE_SIZE + 1
  const to = Math.min(page * BLOG_ARCHIVE_PAGE_SIZE, total)

  return (
    <nav
      className="mt-10 flex flex-col items-center gap-3 border-t border-[var(--ec-border)] pt-8 sm:flex-row sm:justify-between"
      aria-label="Archive pages"
    >
      <p className="ms-micro text-[var(--ec-text-secondary)]">
        Showing {from}-{to} of {total} guides
      </p>
      <div className="flex flex-wrap items-center gap-2">
        {page > 1 ? (
          <Link href={archivePageHref(basePath, page - 1)} className="ec-btn-secondary ec-btn-secondary--sm">
            Previous
          </Link>
        ) : null}
        <span className="ms-micro px-2 text-[var(--ec-text-secondary)]">
          Page {page} of {totalPages}
        </span>
        {page < totalPages ? (
          <Link href={archivePageHref(basePath, page + 1)} className="ec-btn-secondary ec-btn-secondary--sm">
            Next
          </Link>
        ) : null}
      </div>
    </nav>
  )
}
