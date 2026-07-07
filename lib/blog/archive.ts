export const BLOG_ARCHIVE_PAGE_SIZE = 40

export function parseArchivePage(raw: string | string[] | undefined): number {
  const value = Array.isArray(raw) ? raw[0] : raw
  const page = Number.parseInt(value ?? '1', 10)
  return Number.isFinite(page) && page > 0 ? page : 1
}

export function paginateArchive<T>(
  items: T[],
  page: number,
  pageSize = BLOG_ARCHIVE_PAGE_SIZE
) {
  const total = items.length
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const safePage = Math.min(Math.max(1, page), totalPages)
  const start = (safePage - 1) * pageSize

  return {
    items: items.slice(start, start + pageSize),
    page: safePage,
    totalPages,
    total,
    pageSize,
  }
}

export function archivePageHref(basePath: string, page: number): string {
  return page <= 1 ? basePath : `${basePath}?page=${page}`
}
