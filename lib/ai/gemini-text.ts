import {
  GoogleGenAI,
  type Content,
  type FunctionDeclaration,
  type GenerateContentResponse,
} from '@google/genai'
import {
  recordGeminiApiOutcome,
} from '@/lib/ai/gemini-metrics'
import {
  GeminiTimeoutError,
  withGeminiRetry,
  getGeminiRetryStats,
} from '@/lib/marking/gemini-retry'
import { ensureVertexApplicationCredentials } from '@/lib/ai/vertex-credentials'
import { clampTimeoutToDeadline } from '@/lib/ai/request-deadline'
import {
  assertGeminiConfigured,
  geminiBackendLabel,
  getGeminiApiKey,
  getGoogleCloudProject,
  getVertexLocation,
  isGeminiBackendConfigured,
  type GeminiBackendId,
} from '@/lib/ai/gemini-config'
import {
  GEMINI_FLASH_MODEL,
  modelForTask,
  type GeminiModelId,
  type GeminiTask,
} from '@/lib/ai/gemini-models'

export {
  getGeminiMetrics,
  isGeminiMetricsEnabled,
  resetGeminiMetrics,
  setGeminiMetricsEnabled,
} from '@/lib/ai/gemini-metrics'
export {
  GEMINI_PRO_MODEL,
  GEMINI_FLASH_MODEL,
  GEMINI_TEXT_MODEL,
  GEMINI_IMAGE_MODELS,
  VERTEX_GEMINI_PRO_MODEL,
  VERTEX_GEMINI_FLASH_MODEL,
  modelForTask,
  MATHPIX_LOW_CONFIDENCE_THRESHOLD,
} from '@/lib/ai/gemini-models'
export type { GeminiModelId, GeminiTask } from '@/lib/ai/gemini-models'
export {
  isVertexAIEnabled,
  geminiBackendLabel,
  isGeminiBackendConfigured,
  getGoogleCloudProject,
  getVertexLocation,
  VERTEX_AI_REGION,
} from '@/lib/ai/gemini-config'

/** @deprecated Use isGeminiBackendConfigured — kept for callers checking API key only. */
export function getGeminiApiKeyLegacy(): string | undefined {
  return getGeminiApiKey()
}

export const DEFAULT_GEMINI_CALL_TIMEOUT_MS = 120_000

let _defaultCallTimeoutMs = DEFAULT_GEMINI_CALL_TIMEOUT_MS
/**
 * One cached client per backend rather than one cached client full stop.
 *
 * A single slot thrashed the moment failover existed: two concurrent marks on
 * different backends would evict each other's client on every call.
 */
const _clients = new Map<GeminiBackendId, GoogleGenAI>()

/** Set per-request Gemini timeout for this process (resets cached clients). */
export function setGeminiCallTimeoutMs(ms: number): void {
  if (!Number.isFinite(ms) || ms < 1_000) {
    throw new Error(`Invalid Gemini call timeout: ${ms}ms (minimum 1000)`)
  }
  _defaultCallTimeoutMs = Math.floor(ms)
  _clients.clear()
}

export function getGeminiCallTimeoutMs(): number {
  return _defaultCallTimeoutMs
}

/**
 * Client for the backend this request is currently on — which is the configured
 * backend until a capacity error fails the request over to the other one.
 *
 * Callers must resolve this *inside* the retry loop, never once above it, or a
 * failover cannot take effect until the next request.
 */
export function getGeminiClient(): GoogleGenAI {
  assertGeminiConfigured()
  const backend = geminiBackendLabel()

  const cached = _clients.get(backend)
  if (cached) return cached

  let client: GoogleGenAI
  if (backend === 'vertex') {
    ensureVertexApplicationCredentials()
    const project = getGoogleCloudProject()
    if (!project) {
      throw new Error('GOOGLE_CLOUD_PROJECT is required when USE_VERTEX_AI=true')
    }
    client = new GoogleGenAI({
      vertexai: true,
      project,
      location: getVertexLocation(),
      httpOptions: {
        timeout: _defaultCallTimeoutMs,
        apiVersion: 'v1',
      },
    })
  } else {
    const key = getGeminiApiKey()
    if (!key) throw new Error('GEMINI_API_KEY is not configured')
    client = new GoogleGenAI({
      apiKey: key,
      httpOptions: { timeout: _defaultCallTimeoutMs },
    })
  }

  _clients.set(backend, client)
  return client
}

export function isGeminiConfigured(): boolean {
  return isGeminiBackendConfigured()
}

export type GeminiTextOptions = {
  model?: GeminiModelId
  task?: GeminiTask
  system?: string
  maxOutputTokens?: number
  temperature?: number
  /**
   * Fixes the sampler so the same prompt gives the same answer.
   *
   * temperature: 0 is not enough on its own — 2.5 Pro's thinking is stochastic
   * regardless, and a derived mark scheme measured three different rubric
   * shapes across four runs of one identical question. Best-effort rather than
   * guaranteed, so anything relying on it should be measured, not assumed.
   */
  seed?: number
  tools?: FunctionDeclaration[]
  /** Per-request HTTP timeout override (ms). */
  httpTimeoutMs?: number
  /**
   * Gemini 2.5 thinking budget, in tokens. Thinking tokens are drawn from the
   * SAME allowance as `maxOutputTokens`, so on a short, tightly-grounded task
   * the default dynamic budget can consume the whole cap and truncate the
   * visible answer mid-sentence. Pass 0 to disable thinking for such calls.
   * Omit to keep the model default (dynamic) — correct for marking and
   * extraction, where the reasoning is the point.
   */
  thinkingBudget?: number
}

export type GeminiChatMessage = {
  role: 'user' | 'assistant'
  content: string
}

export function toGeminiContents(messages: GeminiChatMessage[]): Content[] {
  return messages.map((m) => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }))
}

function resolveModel(opts: GeminiTextOptions): GeminiModelId {
  if (opts.model) return opts.model
  if (opts.task) return modelForTask(opts.task)
  return GEMINI_FLASH_MODEL
}

function resolveCallTimeoutMs(opts: GeminiTextOptions): number {
  // Clamped to the request budget (when one is set) so no single call can
  // outlive the function and get it killed before it can report the failure.
  // Unbounded outside a request — batch scripts keep the full timeout.
  return clampTimeoutToDeadline(opts.httpTimeoutMs ?? _defaultCallTimeoutMs)
}

/**
 * Hard timeout + abort signal for call sites that build their own
 * `generateContent` request instead of going through the helpers here.
 *
 * Those sites (PDF page OCR, cold mark-scheme extraction) relied solely on the
 * timeout baked into the cached client, so they were invisible to the request
 * budget — two of them back to back could spend 240s the deadline could not
 * see. Pass the signal straight into `config.abortSignal`.
 */
export function withGeminiCallTimeout<T>(
  fn: (signal: AbortSignal) => Promise<T>,
  opts: Pick<GeminiTextOptions, 'httpTimeoutMs'> = {}
): Promise<T> {
  return withGeminiAbortTimeout(fn, resolveCallTimeoutMs(opts))
}

function isAbortError(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false
  const name = (err as { name?: string }).name
  return name === 'AbortError' || name === 'TimeoutError'
}

/**
 * Enforce a hard per-call timeout via AbortController + Promise.race so hung
 * Vertex responses cannot block the process indefinitely.
 */
export async function withGeminiAbortTimeout<T>(
  fn: (signal: AbortSignal) => Promise<T>,
  timeoutMs: number
): Promise<T> {
  const controller = new AbortController()
  let timeoutId: ReturnType<typeof setTimeout> | undefined

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      controller.abort()
      reject(new GeminiTimeoutError(timeoutMs))
    }, timeoutMs)
  })

  try {
    return await Promise.race([fn(controller.signal), timeoutPromise])
  } catch (err) {
    if (err instanceof GeminiTimeoutError) throw err
    if (controller.signal.aborted || isAbortError(err)) {
      throw new GeminiTimeoutError(timeoutMs)
    }
    throw err
  } finally {
    if (timeoutId) clearTimeout(timeoutId)
  }
}

export async function generateGeminiText(
  prompt: string,
  opts: GeminiTextOptions = {}
): Promise<string> {
  const { text } = await generateGeminiTextWithMeta(prompt, opts)
  return text
}

export type GeminiTextResult = {
  text: string
  finishReason?: string
}

export async function generateGeminiTextWithMeta(
  prompt: string,
  opts: GeminiTextOptions = {}
): Promise<GeminiTextResult> {
  const model = resolveModel(opts)
  const timeoutMs = resolveCallTimeoutMs(opts)
  const label = `gemini-text:${model}:${geminiBackendLabel()}`
  // Client resolved per attempt, not once: a failover mid-retry must take
  // effect on the very next attempt.
  const response = await withMetrics(label, model, opts, () =>
    withGeminiAbortTimeout(
      (signal) =>
        getGeminiClient().models.generateContent({
          model,
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          config: buildConfig(opts, signal),
        }),
      timeoutMs
    )
  )
  return {
    text: response.text?.trim() ?? '',
    finishReason: response.candidates?.[0]?.finishReason,
  }
}

export async function generateGeminiChatText(
  messages: GeminiChatMessage[],
  opts: GeminiTextOptions = {}
): Promise<string> {
  const model = resolveModel(opts)
  const timeoutMs = resolveCallTimeoutMs(opts)
  const label = `gemini-chat:${model}:${geminiBackendLabel()}`
  const response = await withMetrics(label, model, opts, () =>
    withGeminiAbortTimeout(
      (signal) =>
        getGeminiClient().models.generateContent({
          model,
          contents: toGeminiContents(messages),
          config: buildConfig(opts, signal),
        }),
      timeoutMs
    )
  )
  return response.text?.trim() ?? ''
}

export async function generateGeminiWithContents(
  contents: Content[],
  opts: GeminiTextOptions = {}
): Promise<GenerateContentResponse> {
  const model = resolveModel(opts)
  const timeoutMs = resolveCallTimeoutMs(opts)
  const label = `gemini-contents:${model}:${geminiBackendLabel()}`
  return withMetrics(label, model, opts, () =>
    withGeminiAbortTimeout(
      (signal) =>
        getGeminiClient().models.generateContent({
          model,
          contents,
          config: buildConfig(opts, signal),
        }),
      timeoutMs
    )
  )
}

export async function* streamGeminiWithContents(
  contents: Content[],
  opts: GeminiTextOptions = {}
): AsyncGenerator<string> {
  const model = resolveModel(opts)
  const timeoutMs = resolveCallTimeoutMs(opts)
  const stream = await withGeminiRetry(
    () =>
      withGeminiAbortTimeout(
        (signal) =>
          getGeminiClient().models.generateContentStream({
            model,
            contents,
            config: buildConfig(opts, signal),
          }),
        timeoutMs
      ),
    { label: `gemini-stream:${model}:${geminiBackendLabel()}` }
  )
  for await (const chunk of stream) {
    const text = chunk.text
    if (text) yield text
  }
}

async function withMetrics<T extends GenerateContentResponse>(
  label: string,
  model: GeminiModelId,
  opts: GeminiTextOptions,
  fn: () => Promise<T>
): Promise<T> {
  const startedAt = Date.now()
  const retriesBefore = getGeminiRetryStats().totalRetries
  const markingPath =
    opts.task === 'marking' ||
    opts.task === 'ocr' ||
    /:marking$|:ocr$/.test(label)
  try {
    const response = await withGeminiRetry(fn, {
      label,
      maxRetries: markingPath ? 10 : 8,
    })
    recordGeminiApiOutcome({
      label,
      model,
      task: opts.task,
      startedAt,
      retriesBefore,
      retriesAfter: getGeminiRetryStats().totalRetries,
      response,
    })
    return response
  } catch (error) {
    recordGeminiApiOutcome({
      label,
      model,
      task: opts.task,
      startedAt,
      retriesBefore,
      retriesAfter: getGeminiRetryStats().totalRetries,
      error,
    })
    throw error
  }
}

function buildConfig(opts: GeminiTextOptions, abortSignal: AbortSignal) {
  const timeout = resolveCallTimeoutMs(opts)

  const jsonTasks: ReadonlySet<GeminiTask> = new Set([
    'content-generation',
    'validation-coverage',
    'marking',
    'structured-extraction',
    'json-repair-retry',
    // Teach-back must return parseable JSON or the UI shows a dead-end 502.
    'teach-back',
  ])

  return {
    systemInstruction: opts.system,
    maxOutputTokens: opts.maxOutputTokens,
    temperature: opts.temperature,
    seed: opts.seed,
    tools: opts.tools ? [{ functionDeclarations: opts.tools }] : undefined,
    abortSignal,
    httpOptions: { timeout },
    responseMimeType:
      opts.task && jsonTasks.has(opts.task) ? 'application/json' : undefined,
    thinkingConfig:
      opts.thinkingBudget === undefined
        ? undefined
        : { thinkingBudget: opts.thinkingBudget },
  }
}
