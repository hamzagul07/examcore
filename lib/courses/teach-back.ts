/**
 * Feynman-style teach-back: student explains the topic; we name the gaps.
 * Pure helpers live here so prompts and parsing are testable without Gemini.
 */

export type TeachBackGap = {
  /** Short label for the missing idea (≤6 words). */
  idea: string
  /** One calm sentence on why it matters for marks. */
  why: string
}

export type TeachBackResult = {
  verdict: 'solid' | 'partial' | 'thin'
  /** One-line examiner-tone summary. */
  summary: string
  gaps: TeachBackGap[]
}

const MAX_EXPLANATION = 2_400
const MAX_GAPS = 4

export function clampTeachBackExplanation(raw: string): string {
  return raw.trim().slice(0, MAX_EXPLANATION)
}

export function buildTeachBackPrompt(input: {
  title: string
  topicCode: string
  lessonBrief: string
  explanation: string
}): { system: string; user: string } {
  const system = [
    'You are a strict but kind A-level / IB examiner helping a student teach a topic back.',
    'Compare their explanation to the lesson brief. Name only genuinely missing or wrong ideas.',
    'Do not praise fluff. Do not invent syllabus content outside the brief.',
    'summary and gaps must be about the TOPIC and the student explanation — never about JSON, fields, or formatting.',
    'Return ONLY compact JSON matching:',
    '{"verdict":"solid"|"partial"|"thin","summary":"…","gaps":[{"idea":"…","why":"…"}]}',
    'verdict solid = covers the essentials with at most one minor miss;',
    'partial = got the shape but missed mark-earning ideas;',
    'thin = mostly incomplete or confused.',
    `At most ${MAX_GAPS} gaps. idea ≤ 6 words. why one sentence. summary ≤ 140 chars.`,
  ].join(' ')

  const user = [
    `Topic: ${input.title} (${input.topicCode})`,
    '',
    'Lesson brief:',
    input.lessonBrief,
    '',
    'Student explanation:',
    input.explanation,
  ].join('\n')

  return { system, user }
}

/** Pull a short on-disk brief so the model never trusts client-supplied content. */
export function lessonBriefFromParts(parts: {
  title: string
  summary?: string
  simpleSummary?: string
  steps?: string[]
  objectives?: string[]
  takeaways?: string[]
}): string {
  const lines: string[] = [`Title: ${parts.title}`]
  const summary = (parts.simpleSummary || parts.summary || '').trim()
  if (summary) lines.push(`Summary: ${summary}`)
  if (parts.objectives?.length) {
    lines.push('Objectives:')
    for (const o of parts.objectives.slice(0, 6)) lines.push(`- ${o}`)
  }
  if (parts.steps?.length) {
    lines.push('Key steps:')
    for (const s of parts.steps.slice(0, 6)) lines.push(`- ${s}`)
  }
  if (parts.takeaways?.length) {
    lines.push('Takeaways:')
    for (const t of parts.takeaways.slice(0, 5)) lines.push(`- ${t}`)
  }
  // Keep brief short — long briefs push Flash to truncate the JSON mid-string.
  return lines.join('\n').slice(0, 1_800)
}

/** Soften common model JSON nits before JSON.parse. */
function normalizeTeachBackJson(slice: string): string {
  return slice
    .replace(/^\uFEFF/, '')
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/,\s*([}\]])/g, '$1')
}

export function parseTeachBackResponse(raw: string): TeachBackResult | null {
  const trimmed = raw.trim()
  if (!trimmed) return null
  const start = trimmed.indexOf('{')
  const end = trimmed.lastIndexOf('}')
  if (start < 0 || end <= start) return null
  const slice = normalizeTeachBackJson(trimmed.slice(start, end + 1))
  let parsed: unknown
  try {
    parsed = JSON.parse(slice)
  } catch {
    return null
  }
  if (!parsed || typeof parsed !== 'object') return null
  const obj = parsed as Record<string, unknown>
  const verdictRaw =
    typeof obj.verdict === 'string' ? obj.verdict.trim().toLowerCase() : ''
  const verdict =
    verdictRaw === 'solid' || verdictRaw === 'partial' || verdictRaw === 'thin'
      ? verdictRaw
      : null
  if (!verdict) return null
  const summary = typeof obj.summary === 'string' ? obj.summary.trim().slice(0, 200) : ''
  if (!summary) return null
  const gapsRaw = Array.isArray(obj.gaps) ? obj.gaps : []
  const gaps: TeachBackGap[] = []
  for (const g of gapsRaw.slice(0, MAX_GAPS)) {
    if (!g || typeof g !== 'object') continue
    const idea = typeof (g as { idea?: unknown }).idea === 'string'
      ? (g as { idea: string }).idea.trim().slice(0, 48)
      : ''
    const why = typeof (g as { why?: unknown }).why === 'string'
      ? (g as { why: string }).why.trim().slice(0, 180)
      : ''
    if (idea && why) gaps.push({ idea, why })
  }
  return { verdict, summary, gaps }
}

/**
 * Rejects model output that talks about JSON / fields instead of the topic.
 * The blind repair pass used to invent "missing gaps array" style nonsense.
 */
export function isPlausibleTeachBackResult(result: TeachBackResult): boolean {
  const blob = [
    result.summary,
    ...result.gaps.map((g) => `${g.idea} ${g.why}`),
  ]
    .join(' ')
    .toLowerCase()
  if (
    /\b(json|gaps array|summary field|valid json|model output|incomplete '|broken model)\b/.test(
      blob
    )
  ) {
    return false
  }
  // Empty gaps is fine for a solid verdict; thin/partial with zero gaps is odd but allowed.
  return true
}

/**
 * Finish truncated Flash JSON like:
 * {"verdict":"thin","summary":"The student defined base/
 * so a mid-string cut still yields a usable result.
 */
export function salvageTeachBackResponse(raw: string): TeachBackResult | null {
  const direct = parseTeachBackResponse(raw)
  if (direct) return direct

  const verdict = raw.match(/"verdict"\s*:\s*"(solid|partial|thin)"/i)?.[1]?.toLowerCase() as
    | TeachBackResult['verdict']
    | undefined
  if (!verdict) return null

  // Avoid /s (dotAll) — tsconfig target is ES2017; [\s\S] covers newlines in escapes.
  const summaryMatch = raw.match(/"summary"\s*:\s*"((?:\\[\s\S]|[^"\\])*)"?/)
  let summary = ''
  if (summaryMatch?.[1]) {
    summary = summaryMatch[1]
      .replace(/\\n/g, ' ')
      .replace(/\\"/g, '"')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 200)
  } else {
    // Truncated inside the summary string — take whatever followed.
    const open = raw.match(/"summary"\s*:\s*"([\s\S]*)$/)
    summary = (open?.[1] || '')
      .replace(/["{}\[\]]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 160)
  }
  if (summary.length < 12) {
    summary =
      verdict === 'solid'
        ? 'Covers the essentials.'
        : verdict === 'partial'
          ? 'Got the shape — some mark-earning ideas still missing.'
          : 'Too thin for the exam standard yet.'
  }

  const gaps: TeachBackGap[] = []
  const gapsBlock = raw.match(/"gaps"\s*:\s*\[([\s\S]*)/)?.[1] || ''
  const ideaRe =
    /\{\s*"idea"\s*:\s*"((?:\\.|[^"\\])*)"\s*,\s*"why"\s*:\s*"((?:\\.|[^"\\])*)"/g
  let m: RegExpExecArray | null
  while ((m = ideaRe.exec(gapsBlock)) && gaps.length < MAX_GAPS) {
    const idea = m[1]?.replace(/\\"/g, '"').trim().slice(0, 48)
    const why = m[2]?.replace(/\\"/g, '"').trim().slice(0, 180)
    if (idea && why) gaps.push({ idea, why })
  }

  const salvaged = { verdict, summary, gaps }
  return isPlausibleTeachBackResult(salvaged) ? salvaged : null
}
