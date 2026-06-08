/**
 * Gemini backend selection — Vertex AI (DSQ) or Gemini API (API key).
 *
 * Vertex: set USE_VERTEX_AI=true + GOOGLE_CLOUD_PROJECT + GOOGLE_APPLICATION_CREDENTIALS
 * API key: GEMINI_API_KEY (default when USE_VERTEX_AI is unset/false)
 */

export const VERTEX_AI_REGION = 'us-central1' as const

export function useVertexAI(): boolean {
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

export function geminiBackendLabel(): 'vertex' | 'api-key' {
  return useVertexAI() ? 'vertex' : 'api-key'
}

/** True when the active backend has the credentials it needs. */
export function isGeminiBackendConfigured(): boolean {
  if (useVertexAI()) {
    return Boolean(getGoogleCloudProject())
  }
  return Boolean(getGeminiApiKey())
}

export function assertGeminiConfigured(): void {
  if (isGeminiBackendConfigured()) return
  if (useVertexAI()) {
    throw new Error(
      'Vertex AI not configured: set USE_VERTEX_AI=true, GOOGLE_CLOUD_PROJECT, and GOOGLE_APPLICATION_CREDENTIALS (service account JSON path)'
    )
  }
  throw new Error('GEMINI_API_KEY is not configured')
}
