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
import {
  assertGeminiConfigured,
  geminiBackendLabel,
  getGeminiApiKey,
  getGoogleCloudProject,
  getVertexLocation,
  isGeminiBackendConfigured,
  useVertexAI,
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
  useVertexAI,
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
let _client: GoogleGenAI | null = null
let _clientBackend: 'vertex' | 'api-key' | null = null

/** Set per-request Gemini timeout for this process (resets cached client). */
export function setGeminiCallTimeoutMs(ms: number): void {
  if (!Number.isFinite(ms) || ms < 1_000) {
    throw new Error(`Invalid Gemini call timeout: ${ms}ms (minimum 1000)`)
  }
  _defaultCallTimeoutMs = Math.floor(ms)
  _client = null
  _clientBackend = null
}

export function getGeminiCallTimeoutMs(): number {
  return _defaultCallTimeoutMs
}

export function getGeminiClient(): GoogleGenAI {
  assertGeminiConfigured()
  const backend = geminiBackendLabel()

  if (_client && _clientBackend === backend) return _client

  if (useVertexAI()) {
    const project = getGoogleCloudProject()
    if (!project) {
      throw new Error('GOOGLE_CLOUD_PROJECT is required when USE_VERTEX_AI=true')
    }
    _client = new GoogleGenAI({
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
    _client = new GoogleGenAI({
      apiKey: key,
      httpOptions: { timeout: _defaultCallTimeoutMs },
    })
  }

  _clientBackend = backend
  return _client
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
  tools?: FunctionDeclaration[]
  /** Per-request HTTP timeout override (ms). */
  httpTimeoutMs?: number
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
  return opts.httpTimeoutMs ?? _defaultCallTimeoutMs
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
  const client = getGeminiClient()
  const model = resolveModel(opts)
  const timeoutMs = resolveCallTimeoutMs(opts)
  const label = `gemini-text:${model}:${geminiBackendLabel()}`
  const response = await withMetrics(label, model, opts, () =>
    withGeminiAbortTimeout(
      (signal) =>
        client.models.generateContent({
          model,
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          config: buildConfig(opts, signal),
        }),
      timeoutMs
    )
  )
  return response.text?.trim() ?? ''
}

export async function generateGeminiChatText(
  messages: GeminiChatMessage[],
  opts: GeminiTextOptions = {}
): Promise<string> {
  const client = getGeminiClient()
  const model = resolveModel(opts)
  const timeoutMs = resolveCallTimeoutMs(opts)
  const label = `gemini-chat:${model}:${geminiBackendLabel()}`
  const response = await withMetrics(label, model, opts, () =>
    withGeminiAbortTimeout(
      (signal) =>
        client.models.generateContent({
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
  const client = getGeminiClient()
  const model = resolveModel(opts)
  const timeoutMs = resolveCallTimeoutMs(opts)
  const label = `gemini-contents:${model}:${geminiBackendLabel()}`
  return withMetrics(label, model, opts, () =>
    withGeminiAbortTimeout(
      (signal) =>
        client.models.generateContent({
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
  const client = getGeminiClient()
  const model = resolveModel(opts)
  const timeoutMs = resolveCallTimeoutMs(opts)
  const stream = await withGeminiRetry(
    () =>
      withGeminiAbortTimeout(
        (signal) =>
          client.models.generateContentStream({
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
  try {
    const response = await withGeminiRetry(fn, { label })
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

  return {
    systemInstruction: opts.system,
    maxOutputTokens: opts.maxOutputTokens,
    temperature: opts.temperature,
    tools: opts.tools ? [{ functionDeclarations: opts.tools }] : undefined,
    abortSignal,
    httpOptions: { timeout },
    responseMimeType:
      opts.task === 'content-generation' || opts.task === 'validation-coverage'
        ? 'application/json'
        : undefined,
  }
}
