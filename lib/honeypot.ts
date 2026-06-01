/** Hidden field name bots often fill — must stay empty on legitimate submissions. */
export const HONEYPOT_FIELD = 'company'

export function isHoneypotTripped(value: unknown): boolean {
  return typeof value === 'string' && value.trim().length > 0
}
