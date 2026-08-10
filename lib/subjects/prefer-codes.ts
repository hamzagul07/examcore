/**
 * Expand a stored subject/unit code into aliases used across mark pickers and
 * course catalogs (IB profile codes are `ib-biology-hl`; course cards use
 * `biology-hl`; assessment catalog subjects are often level-agnostic
 * `ib-biology`).
 */
export function expandSubjectCodeAliases(code: string): string[] {
  const raw = code.trim()
  if (!raw) return []

  const out: string[] = []
  const seen = new Set<string>()
  const add = (value: string) => {
    if (!value || seen.has(value)) return
    seen.add(value)
    out.push(value)
  }

  add(raw)
  if (raw.startsWith('ib-')) add(raw.slice(3))
  else add(`ib-${raw}`)

  const withoutLevel = raw.replace(/-(hl|sl)$/i, '')
  if (withoutLevel !== raw) {
    add(withoutLevel)
    if (withoutLevel.startsWith('ib-')) add(withoutLevel.slice(3))
    else add(`ib-${withoutLevel}`)
  }

  return out
}

/**
 * Reorder a subject/unit code list so the user's chosen codes appear first
 * (preserving their profile order), then the remaining codes unchanged.
 */
export function preferSubjectCodesFirst(
  codes: readonly string[],
  preferred: readonly string[]
): string[] {
  if (!preferred.length || !codes.length) return [...codes]

  const available = new Set(codes)
  const seen = new Set<string>()
  const head: string[] = []

  for (const pref of preferred) {
    const match = expandSubjectCodeAliases(pref).find(
      (alias) => available.has(alias) && !seen.has(alias)
    )
    if (!match) continue
    head.push(match)
    seen.add(match)
  }

  if (head.length === 0) return [...codes]
  return [...head, ...codes.filter((code) => !seen.has(code))]
}

/** Same idea for objects keyed by a subject code field. */
export function preferSubjectsByCodeFirst<T>(
  items: readonly T[],
  preferredCodes: readonly string[],
  getCode: (item: T) => string
): T[] {
  const { yours, rest } = splitPreferredSubjects(items, preferredCodes, getCode)
  return yours.length ? [...yours, ...rest] : [...items]
}

/**
 * Split a catalog into the student's matched subjects (profile order) and the
 * remainder — useful for hub pages that keep level/group sections below a
 * "Your subjects" pin.
 */
export function splitPreferredSubjects<T>(
  items: readonly T[],
  preferredCodes: readonly string[],
  getCode: (item: T) => string
): { yours: T[]; rest: T[] } {
  if (!preferredCodes.length || !items.length) {
    return { yours: [], rest: [...items] }
  }

  const byCode = new Map<string, T>()
  for (const item of items) {
    const code = getCode(item)
    if (!byCode.has(code)) byCode.set(code, item)
  }

  const seen = new Set<string>()
  const yours: T[] = []
  for (const pref of preferredCodes) {
    const matchCode = expandSubjectCodeAliases(pref).find(
      (alias) => byCode.has(alias) && !seen.has(alias)
    )
    if (!matchCode) continue
    const item = byCode.get(matchCode)
    if (!item) continue
    yours.push(item)
    seen.add(matchCode)
  }

  return {
    yours,
    rest: items.filter((item) => !seen.has(getCode(item))),
  }
}
