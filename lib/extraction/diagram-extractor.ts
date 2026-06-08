import sharp from 'sharp'
import { extractJSON } from '@/lib/marking/json'
import { generateGeminiWithContents } from '@/lib/ai/gemini-text'
import {
  DIAGRAM_COMPLETENESS_PROMPT,
  DIAGRAM_DESCRIPTION_PROMPT,
  DIAGRAM_REGION_PROMPT,
} from './prompts'
import {
  bboxToPixels,
  expandBBox,
  normalizeRegionBBox,
  openPdfDocument,
  renderPdfPageFromDoc,
  type NormalizedBBox,
  type RenderedPdfPage,
} from './pdf-page-render'
import type { DiagramBoundingBox } from './types'

export type DiagramDescriptionStatus = 'pending' | 'complete' | 'skipped'

export type DetectedDiagram = {
  label: string
  page: number
  bounding_box: DiagramBoundingBox
  caption: string | null
  png: Buffer
  ai_description: string | null
  description_status: DiagramDescriptionStatus
}

export type DiagramExtractOptions = {
  /** When false (default), skip Gemini Pro alt-text generation. */
  withDiagramDescriptions?: boolean
}

type RegionCandidate = {
  label: string
  x: number
  y: number
  width: number
  height: number
  caption?: string
}

async function detectRegionsOnPage(
  page: RenderedPdfPage
): Promise<RegionCandidate[]> {
  const base64 = page.png.toString('base64')
  const response = await generateGeminiWithContents(
    [
      {
        role: 'user',
        parts: [
          { inlineData: { mimeType: 'image/png', data: base64 } },
          { text: `${DIAGRAM_REGION_PROMPT}\n\nPage ${page.pageNumber}` },
        ],
      },
    ],
    { task: 'diagram-description', maxOutputTokens: 4096, temperature: 0 }
  )

  const raw = response.text?.trim() ?? ''
  try {
    const parsed = extractJSON(raw) as { diagrams?: RegionCandidate[] }
    return Array.isArray(parsed.diagrams) ? parsed.diagrams : []
  } catch {
    return []
  }
}

async function isCropComplete(cropPng: Buffer): Promise<boolean> {
  const base64 = cropPng.toString('base64')
  const response = await generateGeminiWithContents(
    [
      {
        role: 'user',
        parts: [
          { inlineData: { mimeType: 'image/png', data: base64 } },
          { text: DIAGRAM_COMPLETENESS_PROMPT },
        ],
      },
    ],
    { task: 'diagram-description', maxOutputTokens: 256, temperature: 0 }
  )

  try {
    const parsed = extractJSON(response.text ?? '') as { complete?: boolean }
    return parsed.complete === true
  } catch {
    return false
  }
}

async function describeDiagram(cropPng: Buffer): Promise<{
  description: string | null
  caption: string | null
}> {
  const base64 = cropPng.toString('base64')
  const response = await generateGeminiWithContents(
    [
      {
        role: 'user',
        parts: [
          { inlineData: { mimeType: 'image/png', data: base64 } },
          { text: DIAGRAM_DESCRIPTION_PROMPT },
        ],
      },
    ],
    { task: 'diagram-description', maxOutputTokens: 1024, temperature: 0 }
  )

  try {
    const parsed = extractJSON(response.text ?? '') as {
      description?: string
      caption?: string
    }
    return {
      description: parsed.description?.trim() ?? null,
      caption: parsed.caption?.trim() ?? null,
    }
  } catch {
    return { description: null, caption: null }
  }
}

async function cropRegion(
  page: RenderedPdfPage,
  bbox: NormalizedBBox
): Promise<Buffer | null> {
  const rect = bboxToPixels(bbox, page.width, page.height)
  if (!rect) return null

  return sharp(page.png)
    .extract({
      left: rect.left,
      top: rect.top,
      width: rect.width,
      height: rect.height,
    })
    .png()
    .toBuffer()
}

/**
 * Detect, crop, validate, and describe diagrams on a single page.
 * Expands bbox by 10% once if completeness check fails.
 */
export async function extractDiagramsFromRenderedPage(
  page: RenderedPdfPage,
  opts: DiagramExtractOptions = {}
): Promise<DetectedDiagram[]> {
  const withDescriptions = opts.withDiagramDescriptions === true
  const pageNumber = page.pageNumber
  const regions = await detectRegionsOnPage(page)
  const results: DetectedDiagram[] = []

  for (const region of regions) {
    try {
      let bbox = normalizeRegionBBox(
        {
          x: region.x,
          y: region.y,
          width: region.width,
          height: region.height,
        },
        page.width,
        page.height
      )

      let crop = await cropRegion(page, bbox)
      if (!crop) continue

      let complete = await isCropComplete(crop)

      for (const margin of [0.1, 0.2]) {
        if (complete) break
        bbox = expandBBox(bbox, margin)
        crop = await cropRegion(page, bbox)
        if (!crop) break
        complete = await isCropComplete(crop)
      }

      // Keep crop when detection succeeded but completeness is conservative.
      if (!crop || (!complete && crop.length < 500)) continue

      let description: string | null = null
      let caption: string | null = region.caption ?? null
      if (withDescriptions) {
        const described = await describeDiagram(crop)
        description = described.description
        caption = described.caption ?? caption
      }

      results.push({
        label: region.label || `diagram-p${pageNumber}`,
        page: pageNumber,
        bounding_box: {
          page: pageNumber,
          x: bbox.x,
          y: bbox.y,
          width: bbox.width,
          height: bbox.height,
        },
        caption,
        png: crop,
        ai_description: description,
        description_status: withDescriptions
          ? description?.trim()
            ? 'complete'
            : 'pending'
          : 'pending',
      })
    } catch (err) {
      console.warn(
        `[diagrams] skip region ${region.label} on p${pageNumber}:`,
        err instanceof Error ? err.message : err
      )
    }
  }

  return results
}

export async function extractDiagramsFromPage(
  pdfBytes: ArrayBuffer,
  pageNumber: number,
  opts: DiagramExtractOptions = {}
): Promise<DetectedDiagram[]> {
  const opened = await openPdfDocument(pdfBytes)
  try {
    const page = await renderPdfPageFromDoc(opened, pageNumber)
    return extractDiagramsFromRenderedPage(page, opts)
  } finally {
    await opened.destroy()
  }
}

/** Extract diagrams from all unique pages referenced by questions. */
export async function extractDiagramsForPages(
  pdfBytes: ArrayBuffer,
  pageNumbers: number[],
  opts: DiagramExtractOptions = {}
): Promise<DetectedDiagram[]> {
  const unique = [...new Set(pageNumbers)].filter((p) => p >= 1).sort((a, b) => a - b)
  const all: DetectedDiagram[] = []
  const opened = await openPdfDocument(pdfBytes)

  try {
    for (const pageNum of unique) {
      try {
        const page = await renderPdfPageFromDoc(opened, pageNum)
        const diagrams = await extractDiagramsFromRenderedPage(page, opts)
        all.push(...diagrams)
      } catch (err) {
        console.warn(
          `[diagrams] page ${pageNum} failed:`,
          err instanceof Error ? err.message : err
        )
      }
    }
  } finally {
    await opened.destroy()
  }

  return all
}
