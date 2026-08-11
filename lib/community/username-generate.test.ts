import { allLongestCandidates, generateUsername, ADJECTIVES, NOUNS } from './username-generate'
import { validateUsername } from './username'

let failed = 0
function fail(label: string) {
  failed++
  console.error(`FAIL ${label}`)
}
function eq(actual: unknown, expected: unknown, label: string) {
  if (actual !== expected) {
    failed++
    console.error(`FAIL ${label}: got ${JSON.stringify(actual)} want ${JSON.stringify(expected)}`)
  }
}

// --- the guarantee that matters: no wordlist entry can produce a handle the
// username rules reject. A too-long adjective/noun pair would otherwise only
// show up as a real user unable to post their first comment. ---
for (const candidate of allLongestCandidates()) {
  const check = validateUsername(candidate)
  if (!check.ok) fail(`generated handle rejected: ${candidate} (${check.error})`)
}

// --- and the same for actually generated handles, suffix included ---
for (let i = 0; i < 500; i++) {
  const u = generateUsername()
  const check = validateUsername(u)
  if (!check.ok) fail(`generated handle rejected: ${u} (${check.error})`)
  // validateUsername lowercases; a handle that changes under normalisation
  // would be stored differently from what we showed the user.
  if (check.ok) eq(check.username, u, `handle is already normalised: ${u}`)
}

// --- wordlists must stay non-empty, or generation silently yields "undefined_undefined".
// Widened off the `as const` literal types so the comparison is a real runtime
// check rather than something tsc folds away. ---
const adjectives: readonly string[] = ADJECTIVES
const nouns: readonly string[] = NOUNS
if (adjectives.length === 0) fail('ADJECTIVES is empty')
if (nouns.length === 0) fail('NOUNS is empty')

// --- enough room that first-comment collisions stay rare ---
const space = adjectives.length * nouns.length * 900
if (space < 100_000) fail(`handle space too small: ${space}`)

if (failed) {
  console.error(`\nusername-generate.test.ts: ${failed} FAILED`)
  process.exit(1)
}
console.log('username-generate.test.ts: all passed')
