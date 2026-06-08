import type { ApiCallRecord, ApiCallPhase } from '@/lib/ai/gemini-metrics'

export type VertexQuotaLimits = {
  /** Tokens per minute — gemini-2.5-pro */
  proTpm: number
  /** Requests per minute */
  proRpm?: number
  /** Requests per day */
  proRpd?: number
  region?: string
  model?: string
  reportedAt?: string
  source?: string
}

export type PhaseSummary = {
  phase: ApiCallPhase
  calls: number
  proInputTokens: number
  proOutputTokens: number
  flashInputTokens: number
  flashOutputTokens: number
  wallTimeMs: number
  retryCount: number
  errorCount: number
}

export type PdfBaselineSummary = {
  pdfPath: string
  pdfType: 'mcq' | 'structured' | 'long-context'
  startedAt: string
  completedAt: string
  wallTimeMs: number
  totalCalls: number
  proInputTokens: number
  proOutputTokens: number
  flashInputTokens: number
  flashOutputTokens: number
  peakTpm: number
  phases: PhaseSummary[]
  errorCount: number
  totalRetries: number
}

const HEADROOM_FRACTION = 0.65

function isProModel(model: string): boolean {
  return model.includes('pro')
}

function isFlashModel(model: string): boolean {
  return model.includes('flash')
}

export function computePeakTpm(
  records: ApiCallRecord[],
  windowMs = 60_000
): number {
  const ok = records.filter((r) => r.status === 'ok' && r.totalTokens > 0)
  if (!ok.length) return 0

  const events = ok.map((r) => ({
    t: new Date(r.timestamp).getTime(),
    tokens: r.totalTokens,
  }))

  let peak = 0
  for (let i = 0; i < events.length; i++) {
    const start = events[i].t
    const end = start + windowMs
    let sum = 0
    for (let j = i; j < events.length && events[j].t <= end; j++) {
      sum += events[j].tokens
    }
    if (sum > peak) peak = sum
  }
  return peak
}

function summarizePhase(
  records: ApiCallRecord[],
  phase: ApiCallPhase
): PhaseSummary {
  const rows = records.filter((r) => r.phase === phase)
  let proIn = 0
  let proOut = 0
  let flashIn = 0
  let flashOut = 0
  let wall = 0
  let retries = 0
  let errors = 0

  for (const r of rows) {
    if (isProModel(r.model)) {
      proIn += r.inputTokens
      proOut += r.outputTokens
    } else if (isFlashModel(r.model)) {
      flashIn += r.inputTokens
      flashOut += r.outputTokens
    }
    wall += r.wallTimeMs
    retries += r.retryCount
    if (r.status === 'error') errors++
  }

  return {
    phase,
    calls: rows.length,
    proInputTokens: proIn,
    proOutputTokens: proOut,
    flashInputTokens: flashIn,
    flashOutputTokens: flashOut,
    wallTimeMs: wall,
    retryCount: retries,
    errorCount: errors,
  }
}

export function summarizePdfBaseline(
  pdfPath: string,
  pdfType: PdfBaselineSummary['pdfType'],
  records: ApiCallRecord[],
  startedAt: string,
  completedAt: string
): PdfBaselineSummary {
  let proIn = 0
  let proOut = 0
  let flashIn = 0
  let flashOut = 0
  let errors = 0
  let retries = 0

  for (const r of records) {
    if (isProModel(r.model)) {
      proIn += r.inputTokens
      proOut += r.outputTokens
    } else if (isFlashModel(r.model)) {
      flashIn += r.inputTokens
      flashOut += r.outputTokens
    }
    if (r.status === 'error') errors++
    retries += r.retryCount
  }

  const wallTimeMs =
    new Date(completedAt).getTime() - new Date(startedAt).getTime()

  return {
    pdfPath,
    pdfType,
    startedAt,
    completedAt,
    wallTimeMs,
    totalCalls: records.length,
    proInputTokens: proIn,
    proOutputTokens: proOut,
    flashInputTokens: flashIn,
    flashOutputTokens: flashOut,
    peakTpm: computePeakTpm(records),
    phases: [
      summarizePhase(records, 'question-extraction'),
      summarizePhase(records, 'diagram-detection'),
      summarizePhase(records, 'latex-validation'),
      summarizePhase(records, 'other'),
    ].filter((p) => p.calls > 0),
    errorCount: errors,
    totalRetries: retries,
  }
}

export type ConcurrencyRecommendation = {
  pdfType: PdfBaselineSummary['pdfType']
  peakTpmObserved: number
  vertexTpmLimit: number
  theoreticalMaxConcurrency: number
  recommendedConcurrency: number
  headroomFraction: number
  notes: string
}

export function recommendConcurrency(
  pdfType: PdfBaselineSummary['pdfType'],
  peakTpmObserved: number,
  vertexTpmLimit: number,
  headroomFraction = HEADROOM_FRACTION
): ConcurrencyRecommendation {
  if (peakTpmObserved <= 0 || vertexTpmLimit <= 0) {
    return {
      pdfType,
      peakTpmObserved,
      vertexTpmLimit,
      theoreticalMaxConcurrency: 1,
      recommendedConcurrency: 1,
      headroomFraction,
      notes: 'Insufficient baseline or quota data — default to concurrency=1',
    }
  }

  const theoretical = Math.floor(vertexTpmLimit / peakTpmObserved)
  const recommended = Math.max(1, Math.floor(theoretical * headroomFraction))

  return {
    pdfType,
    peakTpmObserved,
    vertexTpmLimit,
    theoreticalMaxConcurrency: theoretical,
    recommendedConcurrency: recommended,
    headroomFraction,
    notes: `${vertexTpmLimit} TPM ÷ ${peakTpmObserved} peak TPM/PDF ≈ ${theoretical} theoretical; × ${headroomFraction} headroom → ${recommended}`,
  }
}

export function formatBaselineMarkdown(args: {
  summaries: PdfBaselineSummary[]
  quotas: VertexQuotaLimits
  recommendations: ConcurrencyRecommendation[]
  generatedAt: string
}): string {
  const { summaries, quotas, recommendations, generatedAt } = args
  const lines: string[] = [
    '# Vertex throughput baseline — Phase 3',
    '',
    `**Generated:** ${generatedAt}`,
    `**Region:** ${quotas.region ?? 'us-central1'}`,
    `**Model:** ${quotas.model ?? 'gemini-2.5-pro'}`,
    `**Reported quotas (Hassan):** TPM=${quotas.proTpm.toLocaleString()}${quotas.proRpm ? `, RPM=${quotas.proRpm.toLocaleString()}` : ''}${quotas.proRpd ? `, RPD=${quotas.proRpd.toLocaleString()}` : ''}`,
    quotas.reportedAt ? `**Quota reported at:** ${quotas.reportedAt}` : '',
    '',
    '## Method',
    '',
    '- Concurrency **1** per run (sequential API calls within each PDF)',
    '- Three PDF archetypes measured separately',
    '- Question extraction (`pdf-extraction` task) vs diagram detection (`diagram-description`) logged as separate phases',
    '- Peak TPM = max tokens (input+output) in any rolling 60s window',
    '- Safe concurrency = floor(TPM_limit / peak_TPM_per_pdf) × 65% headroom',
    '',
  ].filter(Boolean)

  for (const s of summaries) {
    lines.push(`## ${s.pdfType}: \`${s.pdfPath}\``, '')
    lines.push('| Metric | Value |')
    lines.push('|--------|-------|')
    lines.push(`| Wall time | ${(s.wallTimeMs / 1000).toFixed(1)}s |`)
    lines.push(`| API calls | ${s.totalCalls} |`)
    lines.push(
      `| Pro tokens (in+out) | ${(s.proInputTokens + s.proOutputTokens).toLocaleString()} (${s.proInputTokens.toLocaleString()} in / ${s.proOutputTokens.toLocaleString()} out) |`
    )
    lines.push(
      `| Flash tokens (in+out) | ${(s.flashInputTokens + s.flashOutputTokens).toLocaleString()} |`
    )
    lines.push(`| Peak TPM (60s window) | ${s.peakTpm.toLocaleString()} |`)
    lines.push(`| Retries | ${s.totalRetries} |`)
    lines.push(`| Errors | ${s.errorCount} |`)
    lines.push('')

    if (s.phases.length) {
      lines.push('### Pass breakdown', '')
      lines.push('| Phase | Calls | Pro in/out | Flash in/out | Wall (s) | Retries |')
      lines.push('|-------|-------|------------|--------------|----------|---------|')
      for (const p of s.phases) {
        lines.push(
          `| ${p.phase} | ${p.calls} | ${p.proInputTokens}/${p.proOutputTokens} | ${p.flashInputTokens}/${p.flashOutputTokens} | ${(p.wallTimeMs / 1000).toFixed(1)} | ${p.retryCount} |`
        )
      }
      lines.push('')
    }
  }

  lines.push('## Concurrency recommendations', '')
  lines.push(
    'Formula: `recommended = floor(TPM_limit / peak_TPM_per_pdf) × 0.65`',
    ''
  )
  lines.push('| PDF type | Peak TPM | Vertex TPM | Theoretical max | Recommended |')
  lines.push('|----------|----------|------------|-----------------|-------------|')
  for (const r of recommendations) {
    lines.push(
      `| ${r.pdfType} | ${r.peakTpmObserved.toLocaleString()} | ${r.vertexTpmLimit.toLocaleString()} | ${r.theoreticalMaxConcurrency} | **${r.recommendedConcurrency}** |`
    )
  }
  lines.push('')
  for (const r of recommendations) {
    lines.push(`- **${r.pdfType}:** ${r.notes}`)
  }
  lines.push(
    '',
    '## Cross-type guidance',
    '',
    'Use the **lowest** recommended concurrency across PDF types when running mixed bulk sessions. Diagram-heavy structured papers typically dominate TPM.',
    '',
    '**Bulk default until validated:** concurrency=1–2 after baseline, not 4–6.',
    ''
  )

  return lines.join('\n')
}
