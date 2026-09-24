export function buildQuestionSlug(
  paperCode: string,
  paperSession: string,
  questionNumber: string
): string {
  const paper = paperCode
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
  const session = paperSession
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
  const q = questionNumber.toLowerCase().replace(/[^a-z0-9]+/g, '')
  return `${paper}-${session}-q${q}`
}

export function normalizeQuestionNumber(q: string): string {
  return q.toLowerCase().replace(/[^a-z0-9]/g, '')
}

/** Reverse {@link buildQuestionSlug} for exact DB lookups (sitemap + /questions/[slug]). */
export function parseQuestionSlug(slug: string): {
  paperCode: string
  paperSession: string
  questionNumberNorm: string
} | null {
  const qIdx = slug.lastIndexOf('-q')
  if (qIdx <= 0) return null
  const body = slug.slice(0, qIdx)
  const questionNumberNorm = slug.slice(qIdx + 2).toLowerCase()
  if (!questionNumberNorm) return null

  const bodyMatch = body.match(/^(\d{4}-\d{2})-(.+)$/)
  if (!bodyMatch) return null

  const paperCode = bodyMatch[1].replace('-', '/')
  const sessionSlug = bodyMatch[2]
  const sessionMatch = sessionSlug.match(/^([a-z]+)-([a-z]+)-(\d{4})$/)
  const paperSession = sessionMatch
    ? `${capitalize(sessionMatch[1])}/${capitalize(sessionMatch[2])} ${sessionMatch[3]}`
    : sessionSlug.replace(/-/g, ' ')

  return { paperCode, paperSession, questionNumberNorm }
}

function capitalize(word: string): string {
  return word.charAt(0).toUpperCase() + word.slice(1)
}
