export type GscOpportunityKind =
  | 'defend'
  | 'optimize'
  | 'high_priority'
  | 'low_ctr'
  | 'missing_page'
  | 'cannibalization'

export type GscRowLike = {
  query: string
  page: string
  impressions: number
  clicks: number
  ctr: number | null
  position: number | null
}

export type Opportunity = {
  kind: GscOpportunityKind
  query: string
  page: string
  impressions: number
  clicks: number
  ctr: number | null
  position: number | null
  note: string
}

export function classifyGscRow(row: GscRowLike): Opportunity | null {
  const pos = row.position
  const ctr = row.ctr
  const impressions = row.impressions

  if (pos != null && pos >= 11 && pos <= 20 && impressions >= 20) {
    return {
      kind: 'high_priority',
      ...row,
      note: 'Positions 11–20 with demand — push to page 1',
    }
  }
  if (pos != null && pos >= 4 && pos <= 10 && impressions >= 30) {
    return {
      kind: 'optimize',
      ...row,
      note: 'Page-1 adjacent — improve content / internal links',
    }
  }
  if (pos != null && pos > 0 && pos <= 3 && impressions >= 50) {
    return {
      kind: 'defend',
      ...row,
      note: 'Top-3 — defend with freshness and links',
    }
  }
  if (
    impressions >= 80 &&
    (ctr == null || ctr < 0.02) &&
    pos != null &&
    pos <= 15
  ) {
    return {
      kind: 'low_ctr',
      ...row,
      note: 'High impressions, weak CTR — rewrite title/snippet',
    }
  }
  return null
}

export function findCannibalization(rows: GscRowLike[]): Opportunity[] {
  const byQuery = new Map<string, GscRowLike[]>()
  for (const row of rows) {
    const list = byQuery.get(row.query) ?? []
    list.push(row)
    byQuery.set(row.query, list)
  }
  const out: Opportunity[] = []
  for (const [query, list] of byQuery) {
    const pages = [...new Set(list.map((r) => r.page))]
    if (pages.length < 2) continue
    const top = list.sort((a, b) => (a.position ?? 99) - (b.position ?? 99))[0]
    out.push({
      kind: 'cannibalization',
      query,
      page: pages.join(' | '),
      impressions: list.reduce((s, r) => s + r.impressions, 0),
      clicks: list.reduce((s, r) => s + r.clicks, 0),
      ctr: top.ctr,
      position: top.position,
      note: `${pages.length} URLs ranking for the same query`,
    })
  }
  return out
}

export function summarizeOpportunities(rows: GscRowLike[]) {
  const classified = rows
    .map(classifyGscRow)
    .filter((o): o is Opportunity => Boolean(o))
  const cannibal = findCannibalization(rows)
  const all = [...classified, ...cannibal]
  const count = (kind: GscOpportunityKind) => all.filter((o) => o.kind === kind).length
  return {
    defend: count('defend'),
    optimize: count('optimize'),
    highPriority: count('high_priority'),
    lowCtr: count('low_ctr'),
    cannibalization: count('cannibalization'),
    items: all.sort((a, b) => b.impressions - a.impressions).slice(0, 100),
  }
}
