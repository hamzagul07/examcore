import { MAX_PDF_PAGES } from '@/lib/marking/pdf-pages'
import {
  sniffUploadType,
  type WholePaperUploadType,
} from '@/lib/marking/whole-paper-upload'

/**
 * Upload validation for the single-question mark route.
 *
 * /api/mark/process accepted whatever the multipart body carried: any number
 * of `pages*` entries of any size and any declared MIME type, and forwarded
 * the client's `file.type` unchecked into Gemini and into storage as the
 * object's content type — so a `text/html` upload was stored and served as
 * HTML from the storage origin. (Code review 2026-09-25, §3.) The whole-paper
 * init route already answers for the bytes with magic numbers; this is the
 * same discipline for the single-question path, kept pure so the rules can be
 * tested without a request.
 */

/** What a page photo, question photo or answer PDF may declare itself as. */
export const UPLOAD_MIME_ALLOWLIST = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'application/pdf',
] as const

/**
 * Declared types accepted on the way in but never used as-is: the sniffed
 * type wins. `image/heif` is what some Android and Samsung pickers call a
 * HEIC photo; `image/jpg` is a common misspelling from older uploaders. An
 * empty string is a browser that could not name the file at all (HEIC on
 * Android, files from a share sheet) — the bytes decide.
 */
const DECLARED_ALIASES = new Set(['image/heif', 'image/jpg', ''])

/** Pages per mark. The same cap as the PDF splitter so a 40-page PDF and 40
 * photographed pages are refused for the same reason. */
export const MAX_UPLOAD_PAGES = MAX_PDF_PAGES

/**
 * Bytes per file. A phone photo compressed by the uploader is 1–3 MB; a raw
 * 48 MP HEIC is ~8 MB; a scanned answer PDF of 20 pages is under 10 MB.
 * Twelve leaves room for all of those and refuses the 200 MB "photo" that
 * only exists to tie up an invocation.
 */
export const MAX_UPLOAD_FILE_BYTES = 12 * 1024 * 1024

/** Enough of the file for sniffUploadType: every accepted signature is in the
 * first 12 bytes, and a PDF's `%PDF` is found within the first 1 KB. */
export const UPLOAD_SNIFF_BYTES = 1024

export type UploadExpectation = 'image' | 'pdf' | 'any'

export type UploadCheck =
  | { ok: true; type: WholePaperUploadType }
  | { ok: false; message: string }

export function formatMb(bytes: number): string {
  return `${Math.round(bytes / (1024 * 1024))} MB`
}

/**
 * Validate one upload from what the client declared and what the bytes say.
 *
 * Returns the type the file should be treated as from here on — always the
 * sniffed one — or a message fit to show the student.
 */
export function checkUploadFile(input: {
  /** For the message: "Page 3", "The question photo", "The answer PDF". */
  label: string
  declaredType: string | null | undefined
  size: number
  /** The first UPLOAD_SNIFF_BYTES of the file. */
  head: Uint8Array
  expect: UploadExpectation
}): UploadCheck {
  const { label, size, head, expect } = input
  const declared = (input.declaredType ?? '').trim().toLowerCase()

  if (size > MAX_UPLOAD_FILE_BYTES) {
    return {
      ok: false,
      message: `${label} is ${formatMb(size)} — the limit is ${formatMb(
        MAX_UPLOAD_FILE_BYTES
      )} per file. Compress it or take a smaller photo.`,
    }
  }

  if (
    !(UPLOAD_MIME_ALLOWLIST as readonly string[]).includes(declared) &&
    !DECLARED_ALIASES.has(declared)
  ) {
    return {
      ok: false,
      message:
        expect === 'pdf'
          ? `${label} must be a PDF.`
          : `${label} must be a JPEG, PNG, WebP or HEIC photo${
              expect === 'any' ? ' or a PDF' : ''
            }.`,
    }
  }

  const sniffed = sniffUploadType(head)
  if (!sniffed) {
    return {
      ok: false,
      message: `${label} doesn't look like a JPEG, PNG, WebP, HEIC or PDF file. Try re-taking the photo or exporting the PDF again.`,
    }
  }

  if (expect === 'image' && sniffed === 'application/pdf') {
    return {
      ok: false,
      message:
        label === 'The question photo'
          ? 'The question photo must be an image, not a PDF.'
          : 'Send a PDF as the answer PDF rather than as a page photo.',
    }
  }
  if (expect === 'pdf' && sniffed !== 'application/pdf') {
    return { ok: false, message: `${label} must be a PDF.` }
  }

  return { ok: true, type: sniffed }
}

/** Refuse more pages than one mark can read; null when the count is fine. */
export function pageCountError(count: number): string | null {
  if (count > MAX_UPLOAD_PAGES) {
    return `Upload at most ${MAX_UPLOAD_PAGES} pages per mark — this one has ${count}. Split it across two marks.`
  }
  return null
}

/**
 * The same file with the type the bytes say it is. Returns the original when
 * the client had it right, so the common case allocates nothing.
 */
export function withUploadType(file: File, type: WholePaperUploadType): File {
  if (file.type === type) return file
  return new File([file], file.name, { type, lastModified: file.lastModified })
}
