/**
 * Validation and scheduling helpers for the whole-paper init route. Pure, so
 * the upload rules can be tested without a request.
 */
import { isRequestDeadlineError } from '@/lib/ai/request-deadline'
import { MAX_PDF_PAGES } from './pdf-pages'

/** Image types a photographed page may be. HEIC is what iPhones produce. */
export const WHOLE_PAPER_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
] as const
export type WholePaperImageType = (typeof WHOLE_PAPER_IMAGE_TYPES)[number]
export type WholePaperUploadType = WholePaperImageType | 'application/pdf'

/**
 * Pages read from one upload, photographed or PDF. The same cap as the PDF
 * splitter so the two paths cannot disagree about what "too long" means.
 */
export const MAX_WHOLE_PAPER_PAGES = MAX_PDF_PAGES

/** Pages OCR'd at once — the bound every other upload path uses. */
export const WHOLE_PAPER_OCR_CONCURRENCY = 4

const ascii = (bytes: Uint8Array, start: number, length: number): string =>
  String.fromCharCode(...bytes.subarray(start, start + length))

const HEIC_BRANDS = new Set(['heic', 'heix', 'hevc', 'hevx', 'mif1', 'msf1'])

/**
 * What the bytes actually are. The browser's `file.type` is whatever the
 * client said, and it was forwarded unchecked into Gemini and into storage as
 * the object's content type — so a `text/html` upload was stored and served as
 * HTML from the storage origin. Magic bytes answer for the file itself.
 */
export function sniffUploadType(bytes: Uint8Array): WholePaperUploadType | null {
  if (bytes.length < 12) return null
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'image/jpeg'
  if (
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) {
    return 'image/png'
  }
  if (ascii(bytes, 0, 4) === 'RIFF' && ascii(bytes, 8, 4) === 'WEBP') return 'image/webp'
  if (ascii(bytes, 4, 4) === 'ftyp' && HEIC_BRANDS.has(ascii(bytes, 8, 4).toLowerCase())) {
    return 'image/heic'
  }
  // A few writers put a byte-order mark or junk before the header.
  const head = ascii(bytes, 0, Math.min(bytes.length, 1024))
  if (head.includes('%PDF')) return 'application/pdf'
  return null
}

/**
 * The type a photographed page is stored and OCR'd as, or null when the bytes
 * are not an image we accept. The declared `file.type` is not consulted:
 * every accepted format carries an unambiguous signature (and the uploader's
 * compressor emits canvas JPEG/WebP), so a file the sniff cannot place is
 * corrupt or mislabelled, and either way Gemini could not read it.
 */
export function resolvePageUploadType(
  _declared: string | null | undefined,
  bytes: Uint8Array
): WholePaperImageType | null {
  const sniffed = sniffUploadType(bytes)
  if (!sniffed || sniffed === 'application/pdf') return null
  return sniffed
}

/** True when the bytes are a PDF (whatever the client called them). */
export function isPdfUpload(bytes: Uint8Array): boolean {
  return sniffUploadType(bytes) === 'application/pdf'
}

export type PageUpload = {
  /**
   * The position the CLIENT gave this page — the `N` in `pages[N]` — which is
   * also the index its `page_assignments` entry carries. Kept separately from
   * the position in the array so that a skipped empty file does not shift
   * every later page's manual question assignment onto its neighbour.
   */
  clientIndex: number
  file: File
}

/**
 * Collect page files from multipart entries in client order.
 *
 * Accepts `pages[N]` (the uploader), bare `pages` (older clients, numbered by
 * arrival) and a single `photo`. Zero-byte files are reported, not silently
 * dropped: the caller skips them but their indices stay reserved.
 */
export function collectPageUploads(
  entries: Iterable<[string, FormDataEntryValue]>
): { pages: PageUpload[]; emptyIndices: number[] } {
  const pages: PageUpload[] = []
  const emptyIndices: number[] = []
  let bareIndex = 0
  const legacyPhoto: File[] = []

  for (const [key, value] of entries) {
    if (!(value instanceof File)) continue
    let clientIndex: number | null = null
    const indexed = key.match(/^pages\[(\d+)\]$/)
    if (indexed) clientIndex = parseInt(indexed[1], 10)
    else if (key === 'pages' || key === 'pages[]') clientIndex = bareIndex++
    else if (key === 'photo') {
      legacyPhoto.push(value)
      continue
    } else continue

    if (value.size > 0) pages.push({ clientIndex, file: value })
    else emptyIndices.push(clientIndex)
  }

  if (pages.length === 0 && legacyPhoto.length > 0) {
    const photo = legacyPhoto[0]
    if (photo.size > 0) pages.push({ clientIndex: 0, file: photo })
    else emptyIndices.push(0)
  }

  pages.sort((a, b) => a.clientIndex - b.clientIndex)
  return { pages, emptyIndices }
}

/** Run `fn` over `items` with at most `limit` in flight; order is preserved. */
export async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  const results: R[] = new Array(items.length)
  let next = 0
  const worker = async () => {
    while (next < items.length) {
      const i = next++
      results[i] = await fn(items[i], i)
    }
  }
  await Promise.all(
    Array.from({ length: Math.max(1, Math.min(limit, items.length)) }, () => worker())
  )
  return results
}

export type TolerantPageRead<T> =
  | { ok: true; value: T }
  | { ok: false; error: unknown }

/**
 * One page failing to read must not fail the paper.
 *
 * Init used to OCR pages one after another with no per-page handling, so a
 * single Gemini failure on page 7 of 12 threw the whole request into its
 * catch: a 500, twelve pages of OCR spend gone, and — for a guest — the day's
 * slot already consumed. The page becomes an empty page with a warning and the
 * other eleven are marked.
 *
 * The one thing that is NOT tolerated is the request deadline: when the budget
 * is spent, every remaining page would "fail" instantly, and quietly marking a
 * paper of blank pages is worse than failing it.
 */
export async function readPageTolerantly<T>(
  read: () => Promise<T>
): Promise<TolerantPageRead<T>> {
  try {
    return { ok: true, value: await read() }
  } catch (error) {
    if (isRequestDeadlineError(error)) throw error
    return { ok: false, error }
  }
}
