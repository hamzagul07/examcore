import type { OmniAIAction } from './types'

const ACTION_PATTERN = /\[\[ACTION:([^\]]+)\]\]/g

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

  const action: OmniAIAction = { type, params }

  if (type === 'render_cta') {
    action.cta = {
      text: params.text || 'Get started',
      href: params.href || '/auth/signup',
      style: params.style === 'secondary' ? 'secondary' : 'primary',
    }
  }

  return action
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
