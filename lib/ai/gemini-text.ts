import {
  GoogleGenAI,
  type Content,
  type FunctionDeclaration,
  type GenerateContentResponse,
} from '@google/genai'
import { withGeminiRetry } from '@/lib/marking/gemini-retry'

/** Primary text model for marking, chat, segmentation, OCR, and course generation. */
export const GEMINI_TEXT_MODEL = 'gemini-2.5-flash' as const

/** Image generation fallbacks for course diagrams (see scripts/generate-course-diagram.mjs). */
export const GEMINI_IMAGE_MODELS = [
  'gemini-2.5-flash-image',
  'gemini-2.0-flash-preview-image-generation',
] as const

export function getGeminiApiKey(): string | undefined {
  return process.env.GEMINI_API_KEY?.trim() || undefined
}

let _client: GoogleGenAI | null = null

export function getGeminiClient(): GoogleGenAI {
  const key = getGeminiApiKey()
  if (!key) throw new Error('GEMINI_API_KEY is not configured')
  if (!_client) _client = new GoogleGenAI({ apiKey: key })
  return _client
}

export function isGeminiConfigured(): boolean {
  return Boolean(getGeminiApiKey())
}

export type GeminiTextOptions = {
  system?: string
  maxOutputTokens?: number
  temperature?: number
  tools?: FunctionDeclaration[]
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

export async function generateGeminiText(
  prompt: string,
  opts: GeminiTextOptions = {}
): Promise<string> {
  const client = getGeminiClient()
  const response = await withGeminiRetry(
    () =>
      client.models.generateContent({
        model: GEMINI_TEXT_MODEL,
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        config: buildConfig(opts),
      }),
    { label: 'gemini-text' }
  )
  return response.text?.trim() ?? ''
}

export async function generateGeminiChatText(
  messages: GeminiChatMessage[],
  opts: GeminiTextOptions = {}
): Promise<string> {
  const client = getGeminiClient()
  const response = await withGeminiRetry(
    () =>
      client.models.generateContent({
        model: GEMINI_TEXT_MODEL,
        contents: toGeminiContents(messages),
        config: buildConfig(opts),
      }),
    { label: 'gemini-chat' }
  )
  return response.text?.trim() ?? ''
}

export async function generateGeminiWithContents(
  contents: Content[],
  opts: GeminiTextOptions = {}
): Promise<GenerateContentResponse> {
  const client = getGeminiClient()
  return withGeminiRetry(
    () =>
      client.models.generateContent({
        model: GEMINI_TEXT_MODEL,
        contents,
        config: buildConfig(opts),
      }),
    { label: 'gemini-contents' }
  )
}

export async function* streamGeminiWithContents(
  contents: Content[],
  opts: GeminiTextOptions = {}
): AsyncGenerator<string> {
  const client = getGeminiClient()
  const stream = await withGeminiRetry(
    () =>
      client.models.generateContentStream({
        model: GEMINI_TEXT_MODEL,
        contents,
        config: buildConfig(opts),
      }),
    { label: 'gemini-stream' }
  )
  for await (const chunk of stream) {
    const text = chunk.text
    if (text) yield text
  }
}

function buildConfig(opts: GeminiTextOptions) {
  return {
    systemInstruction: opts.system,
    maxOutputTokens: opts.maxOutputTokens,
    temperature: opts.temperature,
    tools: opts.tools ? [{ functionDeclarations: opts.tools }] : undefined,
  }
}
