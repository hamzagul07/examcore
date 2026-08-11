/**
 * Public URLs for discussion posts.
 *
 * `/community/<subject>/<slug>-<shortid>` rather than a bare UUID. The subject
 * sits in the path because it is the strongest relevance signal a URL can carry
 * for the queries these threads answer ("9708 essay evaluation marks"), and the
 * title words follow it. The short id is what actually resolves the post; the
 * slug is decorative and a stale one redirects rather than 404s, so a title
 * edit never breaks a link somebody shared.
 *
 * No `server-only` here: the client composer and the server both build these.
 */

/** First block of the UUID — 8 hex characters, ~4 billion values. */
export const SHORT_ID_LENGTH = 8

export function shortPostId(id: string): string {
  return id.replace(/-/g, '').slice(0, SHORT_ID_LENGTH).toLowerCase()
}

/**
 * Title → URL slug.
 *
 * Capped well under the point where extra words stop helping and start getting
 * truncated in results. Trailing partial words are dropped rather than cut mid
 * way, so the slug always reads as language.
 */
export function postSlug(title: string, maxLength = 72): string {
  const base = (title || '')
    .toLowerCase()
    .normalize('NFKD')
    // Strip accents so "coeur" and "cœur" do not produce different URLs.
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

  if (base.length <= maxLength) return base || 'post'

  const cut = base.slice(0, maxLength)
  const lastDash = cut.lastIndexOf('-')
  const trimmed = lastDash > 20 ? cut.slice(0, lastDash) : cut
  return trimmed.replace(/-+$/, '') || 'post'
}

export type PostUrlParts = {
  id: string
  subjectCode: string
  title: string
}

/** Canonical path for a post. Every link should come from here. */
export function communityPostHref(post: PostUrlParts): string {
  const subject = encodeURIComponent(post.subjectCode || 'general')
  return `/community/${subject}/${postSlug(post.title)}-${shortPostId(post.id)}`
}

/**
 * Pull the short id back out of a slug segment.
 *
 * Returns null when the tail is not a short id, so a hand-typed or truncated
 * URL falls through to a 404 instead of matching some arbitrary post.
 */
export function shortIdFromSlug(slug: string): string | null {
  const tail = (slug || '').toLowerCase().split('-').pop() ?? ''
  return new RegExp(`^[0-9a-f]{${SHORT_ID_LENGTH}}$`).test(tail) ? tail : null
}
