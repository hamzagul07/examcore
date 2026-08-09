/**
 * Truncate question/marking prose for list previews without breaking KaTeX.
 * Drops incomplete `$…$` / `$$…$$` runs and trailing half TeX commands.
 */
export function truncateMarkingPreview(
  text: string | null | undefined,
  maxLen = 80,
  emptyFallback = 'Marked submission'
): string {
  const raw = (text ?? '').trim()
  if (!raw) return emptyFallback
  if (raw.length <= maxLen) return raw

  let cutAt = maxLen
  const window = raw.slice(0, maxLen)
  const space = window.lastIndexOf(' ')
  if (space >= Math.floor(maxLen * 0.5)) cutAt = space

  let out = raw.slice(0, cutAt).trimEnd()

  let i = 0
  let mathStart = -1
  let block = false
  while (i < out.length) {
    if (out[i] !== '$') {
      i += 1
      continue
    }
    if (out[i + 1] === '$') {
      if (mathStart === -1) {
        mathStart = i
        block = true
        i += 2
        continue
      }
      if (block) {
        mathStart = -1
        block = false
        i += 2
        continue
      }
    }
    if (mathStart === -1) {
      mathStart = i
      block = false
      i += 1
      continue
    }
    if (!block) {
      mathStart = -1
      i += 1
      continue
    }
    i += 1
  }

  if (mathStart !== -1) {
    out = out.slice(0, mathStart).trimEnd()
  }

  out = out.replace(/\\[a-zA-Z]*$/, '').trimEnd()

  if (!out) {
    out = raw.replace(/\$+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, maxLen).trimEnd()
  }

  if (!out) return emptyFallback
  return `${out}…`
}
