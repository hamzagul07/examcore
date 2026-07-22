import { unstable_cache } from 'next/cache'
import { createServiceClient } from '@/lib/supabase/service'

/**
 * Approved student quotes for the marketing site.
 *
 * Two independent gates before anything is shown: the student ticked
 * `share_consent` on their own feedback, AND someone approved the row
 * (`approved_at`). Consent alone is not enough — an approval step is what keeps
 * an off-hand comment from turning into a marketing claim.
 *
 * Returns an empty list until real feedback exists. That is deliberate: the
 * proof section renders nothing rather than inventing filler, so the social
 * proof on the site is only ever as strong as what students actually said.
 */

export type Testimonial = {
  id: string
  quote: string
  name: string
  subjectCode: string | null
}

const MIN_QUOTE_LENGTH = 30

/**
 * Cached so the homepage — the most SEO-sensitive page on the site — is not
 * pushed into per-request rendering by a decorative query. `cacheComponents` is
 * not enabled in this project, so `unstable_cache` is the applicable API.
 * An hour is well inside how fast a newly approved quote needs to appear.
 */
export const getApprovedTestimonials = unstable_cache(
  fetchApprovedTestimonials,
  ['approved-testimonials'],
  { tags: ['testimonials'], revalidate: 3600 }
)

async function fetchApprovedTestimonials(
  limit = 6
): Promise<Testimonial[]> {
  try {
    const supabase = createServiceClient()
    const { data, error } = await supabase
      .from('mark_feedback')
      .select('id, comment, display_name, subject_code')
      .eq('rating', 'up')
      .eq('share_consent', true)
      .not('approved_at', 'is', null)
      .not('comment', 'is', null)
      .order('approved_at', { ascending: false })
      .limit(limit)

    if (error) throw error

    return (data ?? [])
      .filter(
        (row): row is typeof row & { comment: string } =>
          typeof row.comment === 'string' &&
          row.comment.trim().length >= MIN_QUOTE_LENGTH
      )
      .map((row) => ({
        id: row.id,
        quote: row.comment.trim(),
        // Never fall back to an email or a real user id — an approved quote
        // with no display name is shown anonymously.
        name: row.display_name?.trim() || 'MarkScheme student',
        subjectCode: row.subject_code,
      }))
  } catch (err) {
    // Proof is decoration; a failure here must never take the homepage down.
    console.warn('[testimonials] fetch failed', err)
    return []
  }
}
