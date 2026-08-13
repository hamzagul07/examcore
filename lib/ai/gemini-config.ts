/**
 * Gemini backend selection — Vertex AI (DSQ) or Gemini API (API key).
 *
 * Vertex: set USE_VERTEX_AI=true + GOOGLE_CLOUD_PROJECT + GOOGLE_APPLICATION_CREDENTIALS
 * API key: GEMINI_API_KEY (default when USE_VERTEX_AI is unset/false)
 */

import {
  requestBackendOverride,
  type GeminiBackendId,
} from '@/lib/ai/request-deadline'

export type { GeminiBackendId }

export const VERTEX_AI_REGION = 'us-central1' as const

export function isVertexAIEnabled(): boolean {
  const v = process.env.USE_VERTEX_AI?.trim().toLowerCase()
  return v === 'true' || v === '1' || v === 'yes'
}

export function getGoogleCloudProject(): string | undefined {
  return process.env.GOOGLE_CLOUD_PROJECT?.trim() || undefined
}

export function getVertexLocation(): string {
  return process.env.GOOGLE_CLOUD_LOCATION?.trim() || VERTEX_AI_REGION
}

export function getGeminiApiKey(): string | undefined {
  return process.env.GEMINI_API_KEY?.trim() || undefined
}

/** The backend this deployment is configured for, ignoring any failover. */
export function configuredGeminiBackend(): GeminiBackendId {
  return isVertexAIEnabled() ? 'vertex' : 'api-key'
}

/**
 * The backend to actually call right now.
 *
 * Honours a request-scoped failover, so everything downstream — client, metrics
 * label, error reporting — follows the switch from a single source of truth
 * rather than each having to be told about it.
 */
export function geminiBackendLabel(): GeminiBackendId {
  return requestBackendOverride() ?? configuredGeminiBackend()
}

export function isBackendCredentialed(backend: GeminiBackendId): boolean {
  return backend === 'vertex'
    ? Boolean(getGoogleCloudProject())
    : Boolean(getGeminiApiKey())
}

/**
 * The other backend, when it is credentialed and we are not already on it.
 *
 * This is what makes a 429 cost one re-route instead of a backoff nap. Measured
 * over the first 28 marks, runs that hit a retry averaged 384s against 128s for
 * runs that did not — the wait was overwhelmingly spent sleeping on a provider
 * that had already said no, while a second credentialed provider sat idle.
 */
export function fallbackGeminiBackend(): GeminiBackendId | null {
  const other: GeminiBackendId =
    geminiBackendLabel() === 'vertex' ? 'api-key' : 'vertex'
  return isBackendCredentialed(other) ? other : null
}

/** True when the active backend has the credentials it needs. */
export function isGeminiBackendConfigured(): boolean {
  return isBackendCredentialed(geminiBackendLabel())
}

export function assertGeminiConfigured(): void {
  if (isGeminiBackendConfigured()) return
  if (geminiBackendLabel() === 'vertex') {
    throw new Error(
      'Vertex AI not configured: set USE_VERTEX_AI=true, GOOGLE_CLOUD_PROJECT, and GOOGLE_APPLICATION_CREDENTIALS (service account JSON path)'
    )
  }
  throw new Error('GEMINI_API_KEY is not configured')
}
