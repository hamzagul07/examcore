/** Stay under Vercel's ~4.5MB serverless body limit */
export const MAX_UPLOAD_PAYLOAD_BYTES = 4_000_000

export const MAX_PDF_BYTES = 4 * 1024 * 1024

/**
 * Pages per single-question mark, as the server enforces it.
 *
 * Mirrors `MAX_UPLOAD_PAGES` in lib/http/upload-limits.ts (= MAX_PDF_PAGES),
 * which cannot be imported here: that module pulls pdf-lib and the Gemini
 * client into the page bundle. `upload-limits.test.ts` asserts the two stay
 * equal. Enforced in the uploader so the 21st page is refused at the point
 * it is added, not as a 400 after the student has waited for the upload.
 */
export const MAX_UPLOAD_PAGES = 20

/** Past this share of the payload cap the running total turns amber. */
const PAYLOAD_WARN_RATIO = 0.8

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function getPdfSizeError(file: File): string | null {
  if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
    return null
  }
  if (file.size > MAX_PDF_BYTES) {
    return `PDF is too large (${formatFileSize(file.size)}). Please upload separate page photos instead — max ${formatFileSize(MAX_PDF_BYTES)} for direct upload.`
  }
  return null
}

export function totalUploadBytes(files: ReadonlyArray<{ size: number }>): number {
  return files.reduce((sum, f) => sum + f.size, 0)
}

export function getPayloadTooLargeError(files: ReadonlyArray<{ size: number }>): string | null {
  const total = totalUploadBytes(files)
  if (total <= MAX_UPLOAD_PAYLOAD_BYTES) return null
  return `Total upload is ${formatFileSize(total)} — that's too large to send at once. Remove a page or use smaller photos (under ${formatFileSize(MAX_UPLOAD_PAYLOAD_BYTES)} total).`
}

/** The same refusal the server gives, so the student never has to wait for it. */
export function getPageCountError(count: number): string | null {
  if (count > MAX_UPLOAD_PAGES) {
    return `Upload at most ${MAX_UPLOAD_PAGES} pages per mark — this one has ${count}. Split it across two marks.`
  }
  return null
}

/** How many of `incoming` can still be added under the cap. */
export function pagesRemainingUnderCap(current: number, incoming: number): number {
  return Math.max(0, Math.min(incoming, MAX_UPLOAD_PAGES - current))
}

export type UploadTotalTone = 'ok' | 'warning' | 'over'

/**
 * The running total shown under the page list. The 4 MB cap used to be
 * checked only at submit, after compression — so a student with six photos
 * found out the upload was too big when Mark did nothing.
 */
export function describeUploadTotal(files: ReadonlyArray<{ size: number }>): {
  bytes: number
  label: string
  tone: UploadTotalTone
} {
  const bytes = totalUploadBytes(files)
  const tone: UploadTotalTone =
    bytes > MAX_UPLOAD_PAYLOAD_BYTES
      ? 'over'
      : bytes > MAX_UPLOAD_PAYLOAD_BYTES * PAYLOAD_WARN_RATIO
        ? 'warning'
        : 'ok'
  return {
    bytes,
    label: `${formatFileSize(bytes)} of ${formatFileSize(MAX_UPLOAD_PAYLOAD_BYTES)}`,
    tone,
  }
}
