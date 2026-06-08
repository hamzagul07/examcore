#!/usr/bin/env node
/** Explain P3 "70 variants" count from audit inventory. */
import { readFileSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const audit = JSON.parse(
  readFileSync(join(ROOT, 'scripts/audit-9702-output-clean.json'), 'utf8')
)

const byPaper = { 1: [], 2: [], 3: [], 4: [], 5: [] }

for (const row of audit.byYearPaperVariant) {
  if (row.hasQp) byPaper[row.paper].push(row)
}

const perSessionP3 = {}
for (const row of byPaper[3]) {
  if (!perSessionP3[row.session]) perSessionP3[row.session] = []
  perSessionP3[row.session].push(row.component)
}

const summary = {
  qp_counts_by_paper: audit.qpByPaper,
  p3_total: byPaper[3].length,
  p1_total: byPaper[1].length,
  avg_p3_per_session: +(byPaper[3].length / audit.sessionCount).toFixed(2),
  avg_p1_per_session: +(byPaper[1].length / audit.sessionCount).toFixed(2),
  p3_components_seen: [...new Set(byPaper[3].map((r) => r.component))].sort(),
  p3_per_session: Object.fromEntries(
    Object.entries(perSessionP3)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([sess, comps]) => [sess, comps.sort()])
  ),
  p3_variant_range: {
    min_per_session: Math.min(...Object.values(perSessionP3).map((c) => c.length)),
    max_per_session: Math.max(...Object.values(perSessionP3).map((c) => c.length)),
  },
}

console.log(JSON.stringify(summary, null, 2))
