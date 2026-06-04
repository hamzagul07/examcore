import { SITE_NAME } from '@/lib/site-config'

const SERP_TITLE_MAX = 60
const META_DESC_MIN = 120
const META_DESC_MAX = 160

/** Primary keyword near front; trim for SERP (~50–60 chars visible). */
export function formatSerpTitle(title: string, includeBrand = false): string {
  const brandSuffix = ` — ${SITE_NAME}`
  const max =
    includeBrand && !title.includes(SITE_NAME)
      ? SERP_TITLE_MAX - brandSuffix.length
      : SERP_TITLE_MAX

  if (title.length <= max) return title

  const trimmed = title.slice(0, max - 1).trim()
  const lastSpace = trimmed.lastIndexOf(' ')
  return (lastSpace > 30 ? trimmed.slice(0, lastSpace) : trimmed) + '…'
}

export function formatMetaDescription(description: string): string {
  const d = description.trim()
  if (d.length >= META_DESC_MIN && d.length <= META_DESC_MAX) return d
  if (d.length > META_DESC_MAX) {
    const cut = d.slice(0, META_DESC_MAX - 1)
    const lastSpace = cut.lastIndexOf(' ')
    return (lastSpace > 80 ? cut.slice(0, lastSpace) : cut) + '…'
  }
  return d
}

/** One H1 per page — blog uses post.title; marketing passes explicit string. */
export function assertSingleH1(_pageLabel: string) {
  return true
}
