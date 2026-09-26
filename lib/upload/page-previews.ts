/**
 * Object URLs for uploaded pages, released on purpose.
 *
 * Every page card holds a `URL.createObjectURL` preview. Removing a page,
 * swapping to a PDF, or resetting the form after a mark dropped the page
 * from state and left the blob URL registered for the life of the tab — a
 * student marking ten questions in a row from 3 MB photos was holding tens
 * of megabytes the browser could not reclaim (code review 2026-09-25, §3).
 *
 * Revoking an already-revoked URL is a no-op, so callers do not have to
 * coordinate: the uploader revokes what it removes, the page revokes what it
 * clears, and a URL touched twice costs nothing.
 */
export function revokePagePreview(url: string | null | undefined): void {
  if (!url || typeof URL === 'undefined' || typeof URL.revokeObjectURL !== 'function') return
  try {
    URL.revokeObjectURL(url)
  } catch {
    /* already gone, or not an object URL */
  }
}

export function revokePagePreviews(
  pages: ReadonlyArray<{ previewUrl?: string | null }> | null | undefined
): void {
  if (!pages) return
  for (const page of pages) revokePagePreview(page.previewUrl)
}
