import { jsonrepair } from 'jsonrepair'

/** Locate a balanced `{...}` segment starting at `start`, ignoring braces inside strings. */
function sliceBalancedObject(text: string, start: number): string | null {
  if (text[start] !== '{') return null
  let depth = 0
  let inString = false
  let escape = false

  for (let i = start; i < text.length; i++) {
    const ch = text[i]
    if (inString) {
      if (escape) {
        escape = false
      } else if (ch === '\\') {
        escape = true
      } else if (ch === '"') {
        inString = false
      }
      continue
    }
    if (ch === '"') {
      inString = true
      continue
    }
    if (ch === '{') depth++
    else if (ch === '}') {
      depth--
      if (depth === 0) return text.slice(start, i + 1)
    }
  }
  return null
}

function* iterJsonObjectCandidates(text: string): Generator<string> {
  const trimmed = text.trim()
  if (!trimmed) return

  const fence =
    trimmed.match(/```json\s*([\s\S]*?)```/i) ||
    trimmed.match(/```\s*([\s\S]*?)```/)
  if (fence?.[1]) {
    yield fence[1].trim()
  }

  let idx = 0
  while (idx < trimmed.length) {
    const start = trimmed.indexOf('{', idx)
    if (start === -1) break
    const slice = sliceBalancedObject(trimmed, start)
    if (!slice) break
    yield slice
    idx = start + 1
  }

  yield trimmed
}

/**
 * Escape backslashes that JSON does not recognise, leaving real escapes alone.
 *
 * Models writing mark schemes emit LaTeX inside JSON strings — `"$61.5(\%)$"`,
 * `\frac`, `\left` — and a lone backslash before anything outside
 * `"\/bfnrtu` is not a legal JSON escape, so the whole document fails to parse
 * on one percent sign. `jsonrepair` then "fixes" it into a shape without the
 * key the caller wanted, so the failure surfaced as "all extracted questions
 * failed validation" for a paper whose extraction was in fact perfect: 57KB of
 * complete, correct JSON, thrown away over `\%`.
 *
 * Scanned left to right so a valid escape is consumed whole. A naive
 * `replace(/\\(?!["\\/bfnrtu])/g, …)` corrupts `\\%`, whose first
 * backslash is legal and whose second then looks lone.
 */
const JSON_ESCAPE_SCAN = new RegExp(
  // A legal escape, captured, OR a lone backslash that is not one.
  '\\\\(["\\\\/bfnrtu]|u[0-9a-fA-F]{4})|\\\\',
  'g'
)

function escapeInvalidJsonEscapes(input: string): string {
  return input.replace(JSON_ESCAPE_SCAN, (match, valid: string | undefined) =>
    valid ? match : '\\\\'
  )
}

function tryParseJson(candidate: string): unknown | null {
  const jsonString = candidate.trim()
  if (!jsonString) return null
  try {
    return JSON.parse(jsonString)
  } catch {
    // Repair invalid escapes BEFORE jsonrepair sees the string. jsonrepair is
    // good at missing commas and trailing junk, and destructive on this — it
    // returns an object rather than an error, which is why nothing upstream
    // noticed.
    try {
      return JSON.parse(escapeInvalidJsonEscapes(jsonString))
    } catch {
      /* fall through to jsonrepair */
    }
    try {
      return JSON.parse(jsonrepair(escapeInvalidJsonEscapes(jsonString)))
    } catch {
      try {
        return JSON.parse(jsonrepair(jsonString))
      } catch {
        return null
      }
    }
  }
}

/** Prefer marking / extraction payloads when the model emits several JSON objects. */
function scoreJsonCandidate(parsed: unknown): number {
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return 0
  const obj = parsed as Record<string, unknown>
  let score = Object.keys(obj).length
  if (Array.isArray(obj.marks_awarded)) {
    score += 100 + obj.marks_awarded.length
  }
  if (typeof obj.marks_earned === 'number') score += 50
  if (typeof obj.total_marks === 'number') score += 25
  if (typeof obj.summary === 'string' && obj.summary.trim()) score += 20
  if (obj.band_result && typeof obj.band_result === 'object') score += 30
  if (typeof obj.full_text === 'string') score += 15
  if (Array.isArray(obj.lines)) score += 10
  // The wrapper must outrank the things it contains. A paper extraction is
  // `{questions:[…]}` and each question carries its own numeric `total_marks`,
  // which scores +25 below — so at +10 a single question (30) beat the document
  // holding all forty of them (12), and `extractJSON` confidently returned one
  // question as if it were the paper. Same shape of fix as `objectives`.
  if (Array.isArray(obj.questions)) score += 100 + obj.questions.length
  // Syllabus-extraction payload: the wrapper {syllabus_year, objectives:[…]}
  // must outrank an individual objective object (which has more keys).
  if (Array.isArray(obj.objectives)) score += 100 + obj.objectives.length
  // Topic tagging: {tags:[…]} wraps objects carrying objective_number and
  // confidence, so a single tag (2 keys) beat the wrapper holding them (1 key)
  // and every tagging response came back as one tag with no `tags` key —
  // parseTaggingResponse then returned nothing at all. Third instance of the
  // same bug after `questions` and `objectives`; topic-tagger.test.ts has been
  // failing on main the whole time, unseen because CI never ran it.
  if (Array.isArray(obj.tags)) score += 100 + obj.tags.length
  return score
}

export function extractJSON(text: string): unknown {
  const seen = new Set<string>()
  let best: unknown = null
  let bestScore = -1

  for (const candidate of iterJsonObjectCandidates(text)) {
    const key = candidate.trim()
    if (!key || seen.has(key)) continue
    seen.add(key)
    const parsed = tryParseJson(key)
    if (parsed === null) continue
    const score = scoreJsonCandidate(parsed)
    if (score > bestScore) {
      bestScore = score
      best = parsed
    }
  }

  if (best !== null) return best
  throw new SyntaxError('Could not parse JSON from model response')
}
