/** Strip HTML img tags; preserve alt as markdown placeholder when present. */
export function stripImgTags(text: string): string {
  return text
    .replace(
      /<img[^>]*\s+alt=["']([^"']*)["'][^>]*\/?>/gi,
      (_, alt) => (alt?.trim() ? `[Figure: ${alt.trim()}]` : '[Figure]')
    )
    .replace(/<img[^>]*\/?>/gi, '[Figure]')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

export type McqOption = {
  letter: string
  text: string
}

/**
 * Split MCQ stem from A–D options when embedded in question text.
 * Handles "A $21\\,m$", "A. text", table rows "| A | ... |", etc.
 */
export function parseMcqOptions(text: string): {
  stem: string
  options: McqOption[]
} {
  const cleaned = stripImgTags(text)
  const optionRe =
    /(?:^|\n)\s*(?:\|?\s*)?([A-D])\s*(?:[\.\):\-]|\s+\$|\s+[A-Za-z])/gm
  const matches = [...cleaned.matchAll(optionRe)]

  if (matches.length < 2) {
    return { stem: cleaned, options: [] }
  }

  const firstIdx = matches[0].index ?? 0
  const stem = cleaned.slice(0, firstIdx).trim()
  const optionsBlock = cleaned.slice(firstIdx)
  const options: McqOption[] = []

  for (let i = 0; i < matches.length; i++) {
    const letter = matches[i][1]
    const start = (matches[i].index ?? 0) - firstIdx
    const end =
      i + 1 < matches.length
        ? (matches[i + 1].index ?? optionsBlock.length) - firstIdx
        : optionsBlock.length
    let chunk = optionsBlock.slice(start, end).trim()
    chunk = chunk
      .replace(new RegExp(`^\\|?\\s*${letter}\\s*[\\|\\.]?\\s*`, 'i'), '')
      .replace(/^\|\s*/, '')
      .replace(/\s*\|$/, '')
      .trim()
    if (chunk) options.push({ letter, text: chunk })
  }

  return { stem: stem || cleaned, options }
}
