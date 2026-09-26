import type { OmniAIAction } from './types'

const ACTION_PATTERN = /\[\[ACTION:([^\]]+)\]\]/g

/**
 * The only shape of `href` a model-emitted CTA may carry: a same-origin
 * relative path.
 *
 * The href of a `render_cta` directive is written by the model and rendered by
 * `InlineCTA` as a real link. The model's prompt contains user-controlled
 * text (context.data fields, a student's OCR'd answer, a teacher's roster), so
 * `[[ACTION:render_cta|text=Claim refund|href=https://evil]]` was a
 * one-line phishing primitive (code review 2026-09-25, §2 "model-controlled
 * CTA href"). Same-origin paths are the only destinations a CTA has ever
 * legitimately needed.
 *
 * Rules, in order: must start with exactly one "/" (a second one makes
 * "//evil.com" protocol-relative); no backslash anywhere (browsers normalise
 * "/\evil.com" to "//evil.com" — the same bug the auth redirect had, §1); no
 * whitespace or control characters. Query strings and fragments are fine.
 */
export const SAFE_RELATIVE_HREF_RE = /^\/(?![/\\])[^\s\\\u0000-\u001f]*$/

export function isSafeRelativeHref(href: unknown): href is string {
  return typeof href === 'string' && SAFE_RELATIVE_HREF_RE.test(href)
}

/** Strip action directives from streamed/display text. */
export function stripActionDirectives(text: string): string {
  return text.replace(ACTION_PATTERN, '').trim()
}

export function parseActionDirective(directive: string): OmniAIAction {
  const parts = directive.split('|')
  const type = parts[0]?.trim() || 'none'
  const params: Record<string, string> = {}

  for (let i = 1; i < parts.length; i++) {
    const eq = parts[i].indexOf('=')
    if (eq === -1) continue
    const key = parts[i].slice(0, eq).trim()
    const value = parts[i].slice(eq + 1).trim()
    if (key && value) params[key] = value
  }

  if (type === 'render_cta') {
    // An href that is present but not a same-origin path means the model was
    // steered (or hallucinated a domain). Drop the whole CTA rather than swap
    // in the signup link: "Claim refund → /auth/signup" is a misleading button,
    // and no button is the honest rendering of a directive we refused.
    if ('href' in params && !isSafeRelativeHref(params.href)) {
      return { type: 'none', params: {} }
    }
    return {
      type,
      params,
      cta: {
        text: params.text || 'Get started',
        href: params.href || '/auth/signup',
        style: params.style === 'secondary' ? 'secondary' : 'primary',
      },
    }
  }

  return { type, params }
}

export function extractActionFromText(fullText: string): {
  cleanText: string
  action: OmniAIAction | null
} {
  const match = fullText.match(ACTION_PATTERN)
  if (!match || match.length === 0) {
    return { cleanText: fullText.trim(), action: null }
  }

  const directiveMatch = fullText.match(/\[\[ACTION:([^\]]+)\]\]/)
  if (!directiveMatch) {
    return { cleanText: stripActionDirectives(fullText), action: null }
  }

  return {
    cleanText: stripActionDirectives(fullText),
    action: parseActionDirective(directiveMatch[1]),
  }
}

/** Remove partial action directive at end of streaming buffer. */
export function stripPartialActionTail(text: string): string {
  const openIdx = text.lastIndexOf('[[ACTION:')
  if (openIdx === -1) return text
  const after = text.slice(openIdx)
  if (after.includes(']]')) return stripActionDirectives(text)
  return text.slice(0, openIdx).trimEnd()
}
