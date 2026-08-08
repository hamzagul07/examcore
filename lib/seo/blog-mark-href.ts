/**
 * Client-safe blog → /mark dialect helpers.
 * Keep this free of `server-only` modules (BlogPostCta is a client component).
 */
import { edexcelMarkHref } from '@/lib/edexcel/marking'
import { buildMarkReturnPath } from '@/lib/exam-systems/paths'

export type BlogMarkBoard = 'cambridge' | 'ib' | 'edexcel'

/** Which /mark dialect a blog slug should push into. */
export function markBoardFromBlogSlug(slug: string): BlogMarkBoard {
  if (slug.startsWith('ib-')) return 'ib'
  if (/(^|-)edexcel(\b|-)|(^|-)ial(\b|-)/i.test(slug)) return 'edexcel'
  return 'cambridge'
}

/** Mark deep-link for blog CTAs — keeps Edexcel/IB off the Cambridge default. */
export function markHrefForBlogSlug(
  slug: string,
  subjectCode?: string | null
): string {
  const board = markBoardFromBlogSlug(slug)
  if (board === 'edexcel') return edexcelMarkHref('WMA11')
  if (board === 'ib') {
    return buildMarkReturnPath({
      board: 'ib',
      subject: subjectCode ?? null,
    })
  }
  return buildMarkReturnPath({
    board: 'cambridge',
    subject: subjectCode ?? null,
  })
}

/**
 * Cambridge boundaries / results posts get an Edexcel UMS bridge — those
 * readers are the closest organic cohort to IAL Maths marking.
 */
export function showEdexcelBridgeForBlogSlug(
  slug: string | null | undefined
): boolean {
  if (!slug) return false
  if (markBoardFromBlogSlug(slug) !== 'cambridge') return false
  return (
    slug.includes('grade-boundaries') ||
    slug.includes('grade-threshold') ||
    slug.includes('results-day') ||
    slug.includes('how-to-read-cambridge-grade-boundaries') ||
    slug.includes('cambridge-pum')
  )
}

export const EDEXCEL_UMS_HREF =
  '/edexcel/international-a-level/mathematics/grade-boundaries' as const
