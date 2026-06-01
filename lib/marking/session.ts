export function sessionNameToCode(sessionName: string): string | null {
  const match = sessionName.match(
    /(May\/June|October\/November|February\/March)\s+(\d{4})/i
  )
  if (!match) return null
  const [, season, year] = match
  const yearCode = year.slice(2)
  const lowered = season.toLowerCase()
  const seasonCode = lowered.includes('may')
    ? 's'
    : lowered.includes('october')
      ? 'w'
      : lowered.includes('february')
        ? 'm'
        : null
  if (!seasonCode) return null
  return `${seasonCode}${yearCode}`
}

export function sessionCodeToName(code: string): string | null {
  const match = code.toLowerCase().match(/^([smw])(\d{2})$/)
  if (!match) return null
  const [, letter, yy] = match
  const year = 2000 + parseInt(yy, 10)
  const season =
    letter === 's'
      ? 'May/June'
      : letter === 'w'
        ? 'October/November'
        : letter === 'm'
          ? 'February/March'
          : null
  return season ? `${season} ${year}` : null
}

export function sessionCodeToYear(code: string): number | null {
  const match = code.toLowerCase().match(/^[smw](\d{2})$/)
  if (!match) return null
  return 2000 + parseInt(match[1], 10)
}

export function seasonNameFromSessionCode(code: string): string | null {
  const match = code.toLowerCase().match(/^([smw])\d{2}$/)
  if (!match) return null
  return match[1] === 's'
    ? 'May/June'
    : match[1] === 'w'
      ? 'October/November'
      : match[1] === 'm'
        ? 'February/March'
        : null
}

export function sessionCodeFromYearSeason(
  year: number,
  season: string
): string | null {
  const yy = String(year).slice(-2)
  const lowered = season.toLowerCase()
  const letter = lowered.includes('may')
    ? 's'
    : lowered.includes('october')
      ? 'w'
      : lowered.includes('february')
        ? 'm'
        : null
  return letter ? `${letter}${yy}` : null
}
