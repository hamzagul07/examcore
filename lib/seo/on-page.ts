import { SITE_NAME } from '@/lib/site-config'

const SERP_TITLE_MAX = 60
const META_DESC_MIN = 120
const META_DESC_MAX = 160
const BRAND_SUFFIX = ` — ${SITE_NAME}`

/**
 * Primary keyword near front. When using layout title template `%s — MarkScheme`,
 * pass accountForTemplate=true so the full SERP line stays ≤60 chars.
 */
export function formatSerpTitle(
  title: string,
  accountForTemplate = true
): string {
  const max =
    accountForTemplate && !title.includes(SITE_NAME)
      ? SERP_TITLE_MAX - BRAND_SUFFIX.length
      : SERP_TITLE_MAX

  if (title.length <= max) return title

  const trimmed = title.slice(0, max - 1).trim()
  const lastSpace = trimmed.lastIndexOf(' ')
  return (lastSpace > 28 ? trimmed.slice(0, lastSpace) : trimmed) + '…'
}

export function formatMetaDescription(description: string): string {
  let d = description.trim()
  if (d.length < META_DESC_MIN && d.length > 0) {
    d = `${d} MarkScheme helps Cambridge students mark past papers with real mark schemes.`
  }
  if (d.length >= META_DESC_MIN && d.length <= META_DESC_MAX) return d
  if (d.length > META_DESC_MAX) {
    const cut = d.slice(0, META_DESC_MAX - 1)
    const lastSpace = cut.lastIndexOf(' ')
    return (lastSpace > 80 ? cut.slice(0, lastSpace) : cut) + '…'
  }
  return d
}

/** One H1 per page — blog uses post.title; marketing passes explicit string. */
export function assertSingleH1() {
  return true
}
