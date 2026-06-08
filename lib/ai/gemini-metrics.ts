import type { GenerateContentResponse } from '@google/genai'
import type { GeminiTask } from '@/lib/ai/gemini-models'

export type ApiCallPhase =
  | 'question-extraction'
  | 'diagram-detection'
  | 'latex-validation'
  | 'other'

export type ApiCallRecord = {
  timestamp: string
  model: string
  phase: ApiCallPhase
  task?: GeminiTask
  label: string
  inputTokens: number
  outputTokens: number
  totalTokens: number
  wallTimeMs: number
  status: 'ok' | 'error'
  statusCode?: number
  retryCount: number
  errorMessage?: string
}

let _enabled = false
const _records: ApiCallRecord[] = []

export function setGeminiMetricsEnabled(on: boolean): void {
  _enabled = on
  if (!on) _records.length = 0
}

export function isGeminiMetricsEnabled(): boolean {
  return _enabled
}

export function resetGeminiMetrics(): void {
  _records.length = 0
}

export function getGeminiMetrics(): ApiCallRecord[] {
  return [..._records]
}

export function taskToPhase(task?: GeminiTask): ApiCallPhase {
  if (task === 'pdf-extraction') return 'question-extraction'
  if (task === 'diagram-description') return 'diagram-detection'
  if (task === 'latex-validation') return 'latex-validation'
  return 'other'
}

function extractStatusCode(err: unknown): number | undefined {
  if (!err || typeof err !== 'object') return undefined
  const e = err as Record<string, unknown>
  if (typeof e.status === 'number') return e.status
  const nested = e.error as Record<string, unknown> | undefined
  if (nested && typeof nested.code === 'number') return nested.code
  return undefined
}

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err)
}

export function readUsageTokens(response?: GenerateContentResponse): {
  inputTokens: number
  outputTokens: number
  totalTokens: number
} {
  const usage = response?.usageMetadata
  const inputTokens = usage?.promptTokenCount ?? 0
  const outputTokens = usage?.candidatesTokenCount ?? 0
  const totalTokens =
    usage?.totalTokenCount ?? inputTokens + outputTokens
  return { inputTokens, outputTokens, totalTokens }
}

export function recordGeminiApiCall(record: ApiCallRecord): void {
  if (!_enabled) return
  _records.push(record)
  if (process.env.GEMINI_METRICS_VERBOSE === '1') {
    console.log(
      `[gemini-metrics] ${record.timestamp} ${record.phase} ${record.model} in=${record.inputTokens} out=${record.outputTokens} ${record.wallTimeMs}ms retries=${record.retryCount} status=${record.status}`
    )
  }
}

export function recordGeminiApiOutcome(args: {
  label: string
  model: string
  task?: GeminiTask
  startedAt: number
  retriesBefore: number
  retriesAfter: number
  response?: GenerateContentResponse
  error?: unknown
}): void {
  if (!_enabled) return

  const { inputTokens, outputTokens, totalTokens } = readUsageTokens(
    args.response
  )
  const retryCount = Math.max(0, args.retriesAfter - args.retriesBefore)
  const status = args.error ? 'error' : 'ok'

  recordGeminiApiCall({
    timestamp: new Date(args.startedAt).toISOString(),
    model: args.model,
    phase: taskToPhase(args.task),
    task: args.task,
    label: args.label,
    inputTokens,
    outputTokens,
    totalTokens,
    wallTimeMs: Date.now() - args.startedAt,
    status,
    statusCode: args.error ? extractStatusCode(args.error) : 200,
    retryCount,
    errorMessage: args.error ? errorMessage(args.error).slice(0, 500) : undefined,
  })
}
