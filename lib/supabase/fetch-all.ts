import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Read every row of a table, past PostgREST's row cap.
 *
 * `.limit(20000)` does not do what it looks like it does: PostgREST enforces a
 * server-side maximum (1,000 by default) and silently returns that many. No
 * error, no truncation flag — just fewer rows than exist.
 *
 * That is benign in a report and dangerous in a check. The component-type audit
 * asked for 20,000 rows, received 1,000 of 4,103, and reported that the marking
 * map agreed with every mark scheme in the cache — a clean bill of health drawn
 * from a quarter of the evidence, which is worse than no check at all because
 * it stops anyone looking.
 *
 * Anything that reasons over a whole table should page through it with this.
 */
export async function fetchAllRows<T>(
  client: SupabaseClient,
  table: string,
  columns: string,
  pageSize = 1000
): Promise<T[]> {
  const rows: T[] = []
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await client
      .from(table)
      .select(columns)
      .range(from, from + pageSize - 1)
    if (error) throw new Error(`${table}: ${error.message}`)
    const page = (data ?? []) as T[]
    rows.push(...page)
    // A short page is the last page. Equally, a page that exactly fills the
    // window is not proof there is more — the next request returning empty is.
    if (page.length < pageSize) break
  }
  return rows
}
