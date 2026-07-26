/**
 * Aggregation for the confusion report (app/admin/confusion).
 *
 * Pure, so the ranking and the "how did the writing fail" diagnosis can be
 * tested without a database. The rows are one per (lesson, block, intent); a
 * paragraph is the group of rows sharing a block.
 */

export type ExplanationDemandRow = {
  subject_code: string
  lesson_slug: string
  block_key: string
  intent: string
  request_count: number | null
  body: string | null
  updated_at?: string
}

export type BlockDemand = {
  subjectCode: string
  lessonSlug: string
  blockKey: string
  /** Total taps across all three intents. */
  total: number
  /** Per-intent counts, highest first. */
  byIntent: { intent: string; count: number }[]
  /** An explanation body, for recognising which paragraph this is. */
  sample: string
}

export function groupByBlock(rows: ExplanationDemandRow[]): BlockDemand[] {
  const map = new Map<string, BlockDemand>()

  for (const r of rows) {
    if (!r.lesson_slug || !r.block_key) continue
    const key = `${r.lesson_slug}:${r.block_key}`
    const count = Math.max(0, r.request_count ?? 0)
    const existing = map.get(key)
    if (existing) {
      existing.total += count
      existing.byIntent.push({ intent: r.intent, count })
      if (!existing.sample && r.body) existing.sample = r.body
    } else {
      map.set(key, {
        subjectCode: r.subject_code,
        lessonSlug: r.lesson_slug,
        blockKey: r.block_key,
        total: count,
        byIntent: [{ intent: r.intent, count }],
        sample: r.body ?? '',
      })
    }
  }

  const blocks = [...map.values()]
  for (const b of blocks) b.byIntent.sort((a, z) => z.count - a.count)
  return blocks.sort((a, b) => b.total - a.total)
}

/**
 * The intent students overwhelmingly chose, or null when no single one leads.
 *
 * Requires a strict majority rather than a bare plurality: with three intents a
 * 2/2/1 split says the paragraph fails several ways at once, and reporting a
 * winner there would send someone off to fix the wrong thing.
 */
export function diagnoseBlock(block: BlockDemand): string | null {
  if (!block.total) return null
  const top = block.byIntent[0]
  if (!top || top.count * 2 <= block.total) return null
  return top.intent
}
