import { createCanvas } from '@napi-rs/canvas'

type PdfJsModule = typeof import('pdfjs-dist/legacy/build/pdf.mjs')

let pdfjsModule: PdfJsModule | null = null

async function loadPdfJs(): Promise<PdfJsModule> {
  if (!pdfjsModule) {
    // Preload worker handler on main thread — avoids flaky file:// dynamic imports on Windows.
    const worker = await import('pdfjs-dist/legacy/build/pdf.worker.mjs')
    ;(globalThis as { pdfjsWorker?: unknown }).pdfjsWorker = worker
    pdfjsModule = await import('pdfjs-dist/legacy/build/pdf.mjs')
    pdfjsModule.GlobalWorkerOptions.workerSrc =
      'pdfjs-dist/legacy/build/pdf.worker.mjs'
  }
  return pdfjsModule
}

export type RenderedPdfPage = {
  pageNumber: number
  width: number
  height: number
  png: Buffer
}

function pdfDataCopy(pdfBytes: ArrayBuffer): Uint8Array {
  // pdfjs detaches buffers; Buffer.from guarantees an independent copy.
  return new Uint8Array(Buffer.from(pdfBytes))
}

export type OpenPdfDocument = {
  doc: {
    getPage(pageNumber: number): Promise<{
      getViewport(opts: { scale: number }): { width: number; height: number }
      render(opts: {
        canvas: unknown
        canvasContext: unknown
        viewport: { width: number; height: number }
      }): { promise: Promise<void> }
    }>
  }
  destroy(): Promise<void>
}

/** Open PDF once for multi-page diagram rendering. */
export async function openPdfDocument(pdfBytes: ArrayBuffer): Promise<OpenPdfDocument> {
  const pdfjs = await loadPdfJs()
  const task = pdfjs.getDocument({
    data: pdfDataCopy(pdfBytes),
    useSystemFonts: true,
  })
  const doc = await task.promise
  return {
    doc: doc as OpenPdfDocument['doc'],
    destroy: () => task.destroy(),
  }
}

/** Render a page from an already-open document (1-indexed). */
export async function renderPdfPageFromDoc(
  opened: OpenPdfDocument,
  pageNumber: number,
  scale = 2
): Promise<RenderedPdfPage> {
  const page = await opened.doc.getPage(pageNumber)
  const viewport = page.getViewport({ scale })
  const canvas = createCanvas(Math.ceil(viewport.width), Math.ceil(viewport.height))
  const ctx = canvas.getContext('2d')

  await page.render({
    canvas: canvas as unknown as HTMLCanvasElement,
    canvasContext: ctx as unknown as CanvasRenderingContext2D,
    viewport,
  }).promise

  return {
    pageNumber,
    width: canvas.width,
    height: canvas.height,
    png: canvas.toBuffer('image/png'),
  }
}

/** Render a single PDF page to PNG (1-indexed page numbers). */
export async function renderPdfPage(
  pdfBytes: ArrayBuffer,
  pageNumber: number,
  scale = 2
): Promise<RenderedPdfPage> {
  const opened = await openPdfDocument(pdfBytes)
  try {
    return await renderPdfPageFromDoc(opened, pageNumber, scale)
  } finally {
    await opened.destroy()
  }
}

export async function getPdfPageCount(pdfBytes: ArrayBuffer): Promise<number> {
  const pdfjs = await loadPdfJs()
  const doc = await pdfjs.getDocument({ data: pdfDataCopy(pdfBytes), useSystemFonts: true })
    .promise
  return doc.numPages
}

export type NormalizedBBox = {
  x: number
  y: number
  width: number
  height: number
}

/** Convert Gemini bbox (normalized, percent, or pixel) to 0–1 fractions. */
export function normalizeRegionBBox(
  bbox: NormalizedBBox,
  pageWidth: number,
  pageHeight: number
): NormalizedBBox {
  let { x, y, width, height } = bbox

  const looksLikePixels =
    pageWidth > 0 &&
    pageHeight > 0 &&
    (x > 1 || y > 1 || width > 1 || height > 1) &&
    Math.max(x, y, width, height) > 2

  if (looksLikePixels) {
    return {
      x: x / pageWidth,
      y: y / pageHeight,
      width: width / pageWidth,
      height: height / pageHeight,
    }
  }

  // 0–100 percentages
  if (x > 1 || y > 1 || width > 1 || height > 1) {
    x /= 100
    y /= 100
    width /= 100
    height /= 100
  }

  return { x, y, width, height }
}

/** Clamp Gemini bbox to valid 0–1 normalized coordinates. */
export function clampNormalizedBBox(bbox: NormalizedBBox): NormalizedBBox | null {
  let { x, y, width, height } = bbox

  x = Math.max(0, Math.min(1, x))
  y = Math.max(0, Math.min(1, y))
  width = Math.max(0, Math.min(1 - x, width))
  height = Math.max(0, Math.min(1 - y, height))

  if (width <= 0 || height <= 0) return null
  return { x, y, width, height }
}

/** Convert normalized 0–1 bbox to pixel crop rect, clamped to page bounds. */
export function bboxToPixels(
  bbox: NormalizedBBox,
  pageWidth: number,
  pageHeight: number
): { left: number; top: number; width: number; height: number } | null {
  const clamped = clampNormalizedBBox(bbox)
  if (!clamped) return null

  const left = Math.max(0, Math.floor(clamped.x * pageWidth))
  const top = Math.max(0, Math.floor(clamped.y * pageHeight))
  const right = Math.min(pageWidth, Math.ceil((clamped.x + clamped.width) * pageWidth))
  const bottom = Math.min(pageHeight, Math.ceil((clamped.y + clamped.height) * pageHeight))
  const width = right - left
  const height = bottom - top

  if (width < 1 || height < 1) return null
  if (left + width > pageWidth || top + height > pageHeight) return null

  return { left, top, width, height }
}

/** Expand bbox by fraction (e.g. 0.1 = 10% each side), clamped to page. */
export function expandBBox(bbox: NormalizedBBox, fraction: number): NormalizedBBox {
  const expandX = bbox.width * fraction
  const expandY = bbox.height * fraction
  const x = Math.max(0, bbox.x - expandX / 2)
  const y = Math.max(0, bbox.y - expandY / 2)
  const right = Math.min(1, bbox.x + bbox.width + expandX / 2)
  const bottom = Math.min(1, bbox.y + bbox.height + expandY / 2)
  return { x, y, width: right - x, height: bottom - y }
}
