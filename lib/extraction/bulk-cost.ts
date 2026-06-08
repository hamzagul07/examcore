import type { ExtractionPdfType } from './types'

/** Rough USD estimates from s24 pilot (Gemini Pro QP/MS + Flash tagging). */
const RATES: Record<ExtractionPdfType, { base: number; perPage: number; perMb: number }> = {
  'question-paper': { base: 0.25, perPage: 0.06, perMb: 0.12 },
  'mark-scheme': { base: 0.15, perPage: 0.04, perMb: 0.06 },
  syllabus: { base: 0.1, perPage: 0.02, perMb: 0.03 },
}

export function estimatePdfCostUsd(
  pdfType: ExtractionPdfType,
  opts: { pageCount?: number; byteSize?: number; withDiagrams?: boolean } = {}
): number {
  const rate = RATES[pdfType]
  const pages = opts.pageCount ?? 12
  const mb = (opts.byteSize ?? 500_000) / (1024 * 1024)
  let cost = rate.base + rate.perPage * pages + rate.perMb * mb
  if (pdfType === 'question-paper' && opts.withDiagrams !== false) {
    cost += 0.12
  }
  return Math.round(cost * 100) / 100
}

export function estimateTaggingCostUsd(questionCount: number): number {
  return Math.round(questionCount * 0.004 * 100) / 100
}

export class BulkCostTracker {
  globalTotal = 0
  sessionTotal = 0
  readonly globalCap: number
  readonly sessionCap: number
  readonly perPdfCap: number

  constructor(opts: {
    globalCostCap: number
    perSessionCostCap: number
    perPdfCostCap: number
  }) {
    this.globalCap = opts.globalCostCap
    this.sessionCap = opts.perSessionCostCap
    this.perPdfCap = opts.perPdfCostCap
  }

  resetSession(): void {
    this.sessionTotal = 0
  }

  add(cost: number): void {
    this.globalTotal += cost
    this.sessionTotal += cost
  }

  exceedsGlobalCap(): boolean {
    return this.globalTotal >= this.globalCap
  }

  exceedsSessionCap(): boolean {
    return this.sessionTotal >= this.sessionCap
  }

  exceedsPerPdfCap(cost: number): boolean {
    return cost > this.perPdfCap
  }
}
