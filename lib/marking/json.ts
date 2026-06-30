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

function tryParseJson(candidate: string): unknown | null {
  const jsonString = candidate.trim()
  if (!jsonString) return null
  try {
    return JSON.parse(jsonString)
  } catch {
    try {
      return JSON.parse(jsonrepair(jsonString))
    } catch {
      return null
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
  if (Array.isArray(obj.questions)) score += 10
  // Syllabus-extraction payload: the wrapper {syllabus_year, objectives:[…]}
  // must outrank an individual objective object (which has more keys).
  if (Array.isArray(obj.objectives)) score += 100 + obj.objectives.length
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
