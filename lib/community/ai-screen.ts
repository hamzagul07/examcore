import { generateGeminiText, isGeminiConfigured } from '@/lib/ai/gemini-text'
import { GEMINI_FLASH_MODEL } from '@/lib/ai/gemini-models'

export type ScreenVerdict = { ok: boolean; reason?: string }

/**
 * Moderation classifier for user-contributed content.
 *
 * Used **after** publish (see moderate-async.ts) so posts/comments feel instant.
 * FAIL-OPEN: if Gemini is unconfigured or errors, content stays published — reports
 * and the admin queue are the backstop.
 */
export async function screenContribution(input: {
  kind: 'note' | 'question' | 'answer'
  title?: string
  body: string
  subject: string
}): Promise<ScreenVerdict> {
  if (!isGeminiConfigured()) return { ok: true }
  const prompt = `You are a content-moderation classifier for a free study website where students post ${input.kind}s about exam subjects.
Decide whether to publish. REJECT ONLY if the content is clearly: spam or advertising; abusive, hateful or harassing; sexual or explicit; sharing personal contact details (phone, address, socials for solicitation); or pure gibberish/empty.
ACCEPTABLE: genuine study content even if imperfect, short, or slightly off-topic. When unsure, ACCEPT.
Subject: ${input.subject}
Title: ${input.title ?? '(none)'}
Content: """${input.body.slice(0, 4000)}"""
Reply with ONLY compact JSON — {"ok":true} to publish, or {"ok":false,"reason":"<short friendly reason>"} to hold.`
  try {
    const text = await generateGeminiText(prompt, {
      model: GEMINI_FLASH_MODEL,
      temperature: 0,
      maxOutputTokens: 120,
    })
    const m = text.match(/\{[\s\S]*\}/)
    if (!m) return { ok: true }
    const parsed = JSON.parse(m[0]) as { ok?: boolean; reason?: string }
    if (parsed.ok === false) {
      const reason =
        typeof parsed.reason === 'string' && parsed.reason.trim()
          ? parsed.reason.trim().slice(0, 200)
          : 'This post was held for review — please keep it on-topic and respectful.'
      return { ok: false, reason }
    }
    return { ok: true }
  } catch (err) {
    console.error('[community/ai-screen] moderation call failed, failing open:', err)
    return { ok: true }
  }
}
