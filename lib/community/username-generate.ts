/**
 * Handle generation for auto-assigned community usernames.
 *
 * Kept free of `server-only` and of any DB import so the wordlists can be
 * checked against the username rules in a test — a wordlist edit that pushes a
 * handle over 20 characters would otherwise only surface as a user failing to
 * post.
 */

/**
 * Words the generator draws from.
 *
 * Deliberately bland and exam-neutral: this handle is auto-assigned, so it has
 * to be something nobody could be embarrassed to have been given. Nothing about
 * ability, nothing that reads as a judgement, no adjectives that pair badly.
 */
export const ADJECTIVES = [
  'quiet', 'brisk', 'steady', 'clever', 'keen', 'bright', 'calm', 'swift',
  'neat', 'sharp', 'sunny', 'lucky', 'plucky', 'merry', 'bold',
] as const

export const NOUNS = [
  'comet', 'quill', 'atlas', 'ember', 'harbour', 'lantern', 'meadow', 'pebble',
  'compass', 'beacon', 'willow', 'anchor', 'falcon', 'cedar', 'marble',
] as const

/** 3-digit suffix keeps the namespace wide without making the handle unwieldy. */
function randomSuffix(): string {
  return String(100 + Math.floor(Math.random() * 900))
}

/** One candidate handle, e.g. `quiet_comet142`. Uniqueness is the DB's job. */
export function generateUsername(): string {
  const a = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)]
  const n = NOUNS[Math.floor(Math.random() * NOUNS.length)]
  return `${a}_${n}${randomSuffix()}`
}

/** Every handle the generator can produce, with the suffix at its longest.
 *  Used by the test to prove the wordlists cannot outgrow the username rules. */
export function allLongestCandidates(): string[] {
  const out: string[] = []
  for (const a of ADJECTIVES) for (const n of NOUNS) out.push(`${a}_${n}999`)
  return out
}
