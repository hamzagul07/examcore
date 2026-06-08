import { PDFDocument } from 'pdf-lib'

/** Chunk size when single-shot is not used. */
export const PDF_CHUNK_PAGES = 10

/** Overlap between consecutive chunks to catch boundary questions. */
export const PDF_CHUNK_OVERLAP = 2

/** Process whole PDF in one Gemini call when within these limits. */
export const PDF_SINGLE_SHOT_MAX_PAGES = 32
export const PDF_SINGLE_SHOT_MAX_BYTES = 1_500_000

export async function getPdfPageCountFromPdfLib(pdfBytes: ArrayBuffer): Promise<number> {
  const doc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true })
  return doc.getPageCount()
}

export function shouldUseSingleShot(pdfBytes: ArrayBuffer, totalPages: number): boolean {
  return (
    totalPages <= PDF_SINGLE_SHOT_MAX_PAGES ||
    pdfBytes.byteLength <= PDF_SINGLE_SHOT_MAX_BYTES
  )
}

export type PageChunkSpec = {
  startPage: number
  endPage: number
  bytes: ArrayBuffer
}

/** Split PDF into overlapping page-range chunks. */
export async function splitPdfIntoChunkSpecs(
  pdfBytes: ArrayBuffer,
  pagesPerChunk = PDF_CHUNK_PAGES,
  overlap = PDF_CHUNK_OVERLAP
): Promise<PageChunkSpec[]> {
  const src = await PDFDocument.load(pdfBytes, { ignoreEncryption: true })
  const total = src.getPageCount()
  if (total <= pagesPerChunk) {
    return [{ startPage: 1, endPage: total, bytes: pdfBytes }]
  }

  const specs: PageChunkSpec[] = []
  const step = Math.max(1, pagesPerChunk - overlap)

  for (let start = 0; start < total; start += step) {
    const end = Math.min(start + pagesPerChunk, total)
    const dst = await PDFDocument.create()
    const pageIndices = Array.from({ length: end - start }, (_, i) => start + i)
    const copied = await dst.copyPages(src, pageIndices)
    for (const page of copied) {
      dst.addPage(page)
    }
    const bytes = await dst.save()
    specs.push({
      startPage: start + 1,
      endPage: end,
      bytes: bytes.buffer.slice(
        bytes.byteOffset,
        bytes.byteOffset + bytes.byteLength
      ) as ArrayBuffer,
    })
    if (end >= total) break
  }

  return specs
}
