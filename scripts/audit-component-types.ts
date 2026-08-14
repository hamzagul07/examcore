/**
 * Check the component marking-type map against the mark schemes themselves.
 *
 *   pnpm audit:component-types
 *
 * `component-types.ts` decides how a paper is marked when no scheme is cached
 * for the specific question. It was hand-written, and one entry was wrong in a
 * way nothing could catch: Economics Paper 3 was declared level_of_response and
 * is multiple choice, so students marking it were handed an essay-marking
 * prompt for a paper of lettered answers.
 *
 * Extracted schemes settle it. Each cached row carries the shape the real mark
 * scheme had — an answer key, a marks array, or bands — so the papers already
 * in the cache are evidence against which the map is only a claim. This turns
 * that into a check that runs, rather than an audit somebody remembers to do.
 *
 * Exits non-zero on any disagreement.
 */
process.loadEnvFile?.('.env.local')

// Marks the file as a module — see the note in attribution-report.ts.
export {}

type Shape = { mcq: number; point: number; lor: number }

/**
 * A minority style above this share is worth mentioning, but never worth
 * changing the map for.
 *
 * `mixed` is not a free label. On the only path where the map is consulted at
 * all — no cached scheme for the question — it skips the verify pass and then
 * prompts point-based anyway, so it buys the imprecision of both styles and the
 * check of neither. The dominant style is always the better fallback, and a
 * genuine essay inside a point-dominant paper is caught by the
 * extended-response router instead.
 */
const MINORITY_NOTE_THRESHOLD = 0.15
/** Fewer rows than this is too little to contradict a hand-written entry. */
const MIN_ROWS = 5

function rankShapes(s: Shape) {
  return [
    { type: 'mcq' as const, n: s.mcq },
    { type: 'point_based' as const, n: s.point },
    { type: 'level_of_response' as const, n: s.lor },
  ].sort((a, b) => b.n - a.n)
}

/** The style the map should declare: whichever the schemes mostly are. */
function evidencedType(s: Shape): 'mcq' | 'point_based' | 'level_of_response' {
  return rankShapes(s)[0].type
}

/** A second style worth knowing about, without being worth switching to. */
function minorityNote(s: Shape): string | null {
  const total = s.mcq + s.point + s.lor
  const [, second] = rankShapes(s)
  if (!second || second.n === 0) return null
  const share = second.n / total
  if (share < MINORITY_NOTE_THRESHOLD) return null
  return `${second.type} in ${Math.round(share * 100)}% of rows`
}

async function main() {
  const { createServiceClient } = await import('../lib/supabase/service')
  const { getComponentMarkingType } = await import('../lib/marking/component-types')
  const service = createServiceClient()

  // Paged, not `.limit()`. PostgREST caps a select at 1,000 rows regardless of
  // the limit asked for, and this audit's first version read 1,000 of 4,103 and
  // announced that the map agreed with every scheme in the cache.
  const { fetchAllRows } = await import('../lib/supabase/fetch-all')
  const rows = await fetchAllRows<{ paper_code: string; mark_scheme: unknown }>(
    service,
    'mark_schemes',
    'paper_code, mark_scheme'
  )
  console.log(`Read ${rows.length} cached mark scheme row(s).`)

  const byPaper = new Map<string, Shape>()
  for (const row of rows) {
    if (!row.paper_code) continue
    const ms = (row.mark_scheme ?? {}) as Record<string, unknown>
    const s = byPaper.get(row.paper_code) ?? { mcq: 0, point: 0, lor: 0 }
    if ('answer_key' in ms) s.mcq++
    else if ('bands' in ms) s.lor++
    else if ('marks' in ms) s.point++
    byPaper.set(row.paper_code, s)
  }

  const mismatches: string[] = []
  const notes: string[] = []
  let checked = 0
  let thin = 0

  for (const [paperCode, shape] of [...byPaper].sort()) {
    const total = shape.mcq + shape.point + shape.lor
    if (total < MIN_ROWS) {
      thin++
      continue
    }
    const [subject, component] = paperCode.split('/')
    if (!subject || !component) continue

    checked++
    const claimed = getComponentMarkingType(subject, component)
    const evidenced = evidencedType(shape)
    const note = minorityNote(shape)
    if (note) notes.push(`  ${paperCode.padEnd(10)} mostly ${evidenced}, also ${note}`)
    // `mixed` in the map is never contradicted by evidence of one style, and is
    // never recommended by this audit either — see MINORITY_NOTE_THRESHOLD.
    if (claimed === evidenced || claimed === 'mixed') continue

    mismatches.push(
      `  ${paperCode.padEnd(10)} map says ${claimed.padEnd(18)} schemes say ${evidenced.padEnd(18)} ` +
        `(${total} rows: ${shape.mcq} mcq / ${shape.point} point / ${shape.lor} bands)`
    )
  }

  console.log(
    `\nCOMPONENT TYPE AUDIT — ${checked} paper(s) with enough extracted schemes to check` +
      (thin ? `, ${thin} skipped as too thin` : '') +
      '\n'
  )

  if (notes.length) {
    console.log('Papers carrying a second marking style (informational):')
    for (const n of notes) console.log(n)
    console.log('')
  }

  if (!mismatches.length) {
    console.log('The map agrees with every mark scheme in the cache.\n')
    return
  }

  console.log(`${mismatches.length} disagreement(s) — the schemes are the evidence:\n`)
  for (const m of mismatches) console.log(m)
  console.log(
    '\nCorrect lib/marking/component-types.ts, then pin the change in\n' +
      'lib/marking/component-types.evidence.test.ts.\n'
  )
  process.exitCode = 1
}

void main().catch((err) => {
  console.error(err)
  process.exit(1)
})
