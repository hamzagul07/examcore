import {
  GEMINI_FLASH_MODEL,
  GEMINI_PRO_MODEL,
} from '@/lib/ai/gemini-models'
import {
  geminiBackendLabel,
  getVertexLocation,
  isGeminiBackendConfigured,
} from '@/lib/ai/gemini-config'
import { generateGeminiText, generateGeminiWithContents } from '@/lib/ai/gemini-text'

function logGeminiSmokeError(label: string, err: unknown): void {
  const e = err as Record<string, unknown> | null | undefined
  console.error(`[gemini-smoke] ${label} raw error:`, {
    message: e?.message,
    code: e?.code,
    status: e?.status,
    statusText: e?.statusText,
    details: e?.details,
    errorInfo: e?.errorInfo,
    stack: e?.stack,
    raw: JSON.stringify(err, Object.getOwnPropertyNames(err ?? {}), 2),
  })
}

function smokeErrorMessage(err: unknown): string {
  const e = err as Record<string, unknown> | null | undefined
  if (typeof e?.message === 'string' && e.message) return e.message
  if (typeof e?.code === 'string' && e.code) return e.code
  if (typeof e?.status === 'string' || typeof e?.status === 'number') {
    return String(e.status)
  }
  return String(err ?? 'unknown error')
}

/**
 * Fail loudly at pipeline startup if the configured Flash model is unavailable (e.g. 404).
 */
export async function smokeTestGeminiFlash(): Promise<void> {
  if (!isGeminiBackendConfigured()) {
    throw new Error(
      'Gemini not configured — set USE_VERTEX_AI + GOOGLE_CLOUD_PROJECT + GOOGLE_APPLICATION_CREDENTIALS, or GEMINI_API_KEY'
    )
  }

  const backend = geminiBackendLabel()
  const location = backend === 'vertex' ? getVertexLocation() : 'n/a'

  try {
    const text = await generateGeminiText('Reply with exactly the word: ok', {
      task: 'latex-validation',
      maxOutputTokens: 16,
      temperature: 0,
    })
    if (!text.toLowerCase().includes('ok')) {
      throw new Error(
        `Gemini Flash smoke test got unexpected response (backend=${backend}, model=${GEMINI_FLASH_MODEL}): ${text.slice(0, 200)}`
      )
    }
    console.log(`[gemini-smoke] Flash OK — backend=${backend} location=${location} model=${GEMINI_FLASH_MODEL}`)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    const status =
      err && typeof err === 'object' && 'status' in err
        ? String((err as { status: unknown }).status)
        : ''
    if (status === '404' || message.includes('404') || message.includes('no longer available')) {
      throw new Error(
        `Gemini Flash model "${GEMINI_FLASH_MODEL}" returned 404 (backend=${backend}). See docs/vertex-ai-migration.md. Original: ${message}`
      )
    }
    throw new Error(
      `Gemini Flash smoke test failed (backend=${backend}, model=${GEMINI_FLASH_MODEL}): ${message}`
    )
  }
}

/** Quick Pro call — confirms Vertex DSQ / API key path for extraction workloads. */
export async function smokeTestGeminiPro(): Promise<void> {
  let text = ''
  let rawResponse: Awaited<ReturnType<typeof generateGeminiWithContents>> | null = null
  try {
    rawResponse = await generateGeminiWithContents(
      [{ role: 'user', parts: [{ text: 'Reply with exactly: pro-ok' }] }],
      // Pro 2.5 uses thinking tokens — 16 max was exhausted before visible output (finishReason: MAX_TOKENS)
      { task: 'pdf-extraction', maxOutputTokens: 256, temperature: 0 }
    )
    text = rawResponse.text?.trim() ?? ''
  } catch (err) {
    logGeminiSmokeError('Pro', err)
    throw new Error(`Pro smoke failed: ${smokeErrorMessage(err)}`)
  }
  if (!text.toLowerCase().includes('pro-ok') && !text.toLowerCase().includes('ok')) {
    const candidate = rawResponse?.candidates?.[0]
    console.error('[gemini-smoke] Pro unexpected response:', {
      text,
      length: text.length,
      repr: JSON.stringify(text),
      finishReason: candidate?.finishReason,
      safetyRatings: candidate?.safetyRatings,
      promptFeedback: rawResponse?.promptFeedback,
      usageMetadata: rawResponse?.usageMetadata,
      modelVersion: rawResponse?.modelVersion,
      responseId: rawResponse?.responseId,
    })
    throw new Error(`Pro smoke unexpected: ${text.slice(0, 120) || '(empty response)'}`)
  }
  console.log(`[gemini-smoke] Pro OK — model=${GEMINI_PRO_MODEL}`)
}

/** Tagging-style JSON response (Flash). */
export async function smokeTestTopicTagging(): Promise<void> {
  const raw = await generateGeminiText(
    `Return JSON only: {"tags":[{"objective_number":"2.1.1","confidence":0.9}]}
For question: "Define displacement."`,
    { task: 'topic-tagging', maxOutputTokens: 256, temperature: 0 }
  )
  if (!raw.includes('objective_number') && !raw.includes('tags')) {
    throw new Error(`Tagging smoke unexpected: ${raw.slice(0, 200)}`)
  }
  console.log('[gemini-smoke] Topic tagging JSON OK')
}

/**
 * Minimal PDF bytes smoke — verifies multimodal Pro on Vertex/API.
 * Uses a tiny valid PDF header (no real questions; just checks the endpoint accepts PDF).
 */
export async function smokeTestPdfMultimodal(): Promise<void> {
  const minimalPdf = Buffer.from(
    '%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n3 0 obj<</Type/Page/MediaBox[0 0 200 200]/Parent 2 0 R>>endobj\nxref\n0 4\ntrailer<</Size 4/Root 1 0 R>>\nstartxref\n0\n%%EOF'
  ).toString('base64')

  const response = await generateGeminiWithContents(
    [
      {
        role: 'user',
        parts: [
          { inlineData: { mimeType: 'application/pdf', data: minimalPdf } },
          {
            text: 'This is a smoke test. Reply with exactly the word: pdf-ok',
          },
        ],
      },
    ],
    { task: 'pdf-extraction', maxOutputTokens: 256, temperature: 0 }
  )
  const text = response.text?.trim() ?? ''
  if (!text.toLowerCase().includes('pdf-ok') && !text.toLowerCase().includes('ok')) {
    const candidate = response.candidates?.[0]
    console.error('[gemini-smoke] PDF multimodal unexpected response:', {
      text,
      length: text.length,
      finishReason: candidate?.finishReason,
      usageMetadata: response.usageMetadata,
    })
    throw new Error(`PDF multimodal smoke unexpected: ${text.slice(0, 200) || '(empty response)'}`)
  }
  console.log('[gemini-smoke] PDF multimodal OK')
}

/** Full suite for post-migration verification. */
export async function runGeminiSmokeSuite(): Promise<void> {
  console.log(`[gemini-smoke] Starting suite (backend=${geminiBackendLabel()})`)
  await smokeTestGeminiFlash()
  await smokeTestGeminiPro()
  await smokeTestTopicTagging()
  await smokeTestPdfMultimodal()
  console.log('[gemini-smoke] All checks passed')
}
