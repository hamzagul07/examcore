/**
 * The one name formatter allowed to put a person's name into an AI prompt or
 * an email (docs/TEACHER_SYSTEM_SPEC.md §2.2, §8). "Amira Khan" → "Amira K.".
 *
 * `user_profiles.full_name` is free text the user typed, so it is untrusted
 * twice over:
 *
 *   - In a prompt it is an injection vector. "Ignore previous instructions"
 *     is a perfectly storable full name. Keeping only the first word and one
 *     initial caps any payload at a couple of tokens, and dropping everything
 *     that is not a letter removes the punctuation ([[ACTION:…]], newlines,
 *     quotes, colons) that structured injections lean on.
 *   - In an email or a notification it can carry markup. Tags are removed
 *     first and every remaining non-letter becomes a separator, so the output
 *     is only letters, combining marks, apostrophes and hyphens, a space and
 *     a trailing dot: nothing an HTML or Markdown renderer treats specially.
 *
 * It also keeps a student's surname out of places the teacher's class can
 * see, which is the privacy half of the rule.
 *
 * Deliberately dependency-free so client components can import it without
 * pulling in the subject registry (lib/teacher/subject.ts re-exports it for
 * server code that wants both).
 */

/** Used when a name is missing or has no letters in it. */
export const DISPLAY_NAME_FALLBACK = 'Student'

/** A first name longer than this is truncated; nobody's is, and payloads are. */
export const MAX_FIRST_NAME_CHARS = 24

const HTML_TAG = /<[^>]*>/g
const NOT_NAME_CHAR = /[^\p{L}\p{M}'’-]+/gu
const HAS_LETTER = /\p{L}/u
// A token may not start with a combining mark, apostrophe or hyphen (the
// initial would be one), nor end with an apostrophe or hyphen.
const LEADING_JUNK = /^[\p{M}'’-]+/u
const TRAILING_JUNK = /['’-]+$/u

function codePoints(value: string): string[] {
  return Array.from(value)
}

/**
 * "Amira K." from "Amira Khan"; "Amira" from "Amira"; the fallback from null,
 * blank, or a name with no letters at all. The first name keeps the user's
 * own casing except for a capitalised first letter; the initial is always
 * upper case.
 */
export function displayName(fullName: string | null, fallback: string = DISPLAY_NAME_FALLBACK): string {
  if (typeof fullName !== 'string') return fallback

  const tokens = fullName
    .normalize('NFKC')
    .replace(HTML_TAG, ' ')
    .replace(NOT_NAME_CHAR, ' ')
    .split(/\s+/)
    .map((t) => t.replace(LEADING_JUNK, '').replace(TRAILING_JUNK, ''))
    .filter((t) => HAS_LETTER.test(t))

  if (tokens.length === 0) return fallback

  const firstChars = codePoints(tokens[0]).slice(0, MAX_FIRST_NAME_CHARS)
  firstChars[0] = firstChars[0].toUpperCase()
  const first = firstChars.join('')

  if (tokens.length === 1) return first

  const initial = codePoints(tokens[tokens.length - 1])[0].toUpperCase()
  return `${first} ${initial}.`
}
