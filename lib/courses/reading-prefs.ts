/**
 * The reader's typography choices for course lessons, kept in the browser.
 *
 * Why a choice at all: the best-controlled study of screen reading (Wallace
 * et al., TOCHI 2022, 352 readers) found no single fastest font and a 35%
 * spread between an individual's fastest and slowest — so the page offers a
 * small, well-chosen set and remembers what the student picked. The
 * "airy" spacing is the one dyslexia intervention with solid evidence
 * (letter and line spacing, not special letterforms). See
 * docs/COURSE_TYPOGRAPHY.md.
 *
 * Pure apart from the two localStorage helpers, which never throw.
 */

export type ReadingFont = 'default' | 'book' | 'clear'
export type ReadingSize = 's' | 'm' | 'l' | 'xl'

export type ReadingPrefs = {
  font: ReadingFont
  size: ReadingSize
  /** Wider letter, word and line spacing. */
  air: boolean
}

export const READING_PREF_KEY = 'ms_reading_prefs'

export const DEFAULT_READING_PREFS: ReadingPrefs = { font: 'default', size: 'm', air: false }

export const READING_FONT_LABEL: Record<ReadingFont, string> = {
  default: 'Sans',
  book: 'Book',
  clear: 'Clear',
}

export const READING_FONT_HINT: Record<ReadingFont, string> = {
  default: 'Noto Sans — the typeface that scored best on speed and comprehension together.',
  book: 'Literata — a reading serif made for e-books; sits well beside maths.',
  clear: 'Atkinson Hyperlegible — every letter shaped to stay distinct (I, l, 1; O, 0).',
}

const FONTS: ReadonlySet<string> = new Set<ReadingFont>(['default', 'book', 'clear'])
const SIZES: ReadonlySet<string> = new Set<ReadingSize>(['s', 'm', 'l', 'xl'])

/** Tolerant: anything unrecognised falls back field by field. */
export function parseReadingPrefs(raw: string | null | undefined): ReadingPrefs {
  if (!raw) return { ...DEFAULT_READING_PREFS }
  try {
    const v = JSON.parse(raw) as Partial<Record<keyof ReadingPrefs, unknown>>
    if (!v || typeof v !== 'object') return { ...DEFAULT_READING_PREFS }
    return {
      font: typeof v.font === 'string' && FONTS.has(v.font) ? (v.font as ReadingFont) : DEFAULT_READING_PREFS.font,
      size: typeof v.size === 'string' && SIZES.has(v.size) ? (v.size as ReadingSize) : DEFAULT_READING_PREFS.size,
      air: v.air === true,
    }
  } catch {
    return { ...DEFAULT_READING_PREFS }
  }
}

export function readReadingPrefs(): ReadingPrefs {
  try {
    return parseReadingPrefs(window.localStorage.getItem(READING_PREF_KEY))
  } catch {
    return { ...DEFAULT_READING_PREFS }
  }
}

export function writeReadingPrefs(prefs: ReadingPrefs): void {
  try {
    window.localStorage.setItem(READING_PREF_KEY, JSON.stringify(prefs))
  } catch {
    /* private mode, quota — the choice just does not persist */
  }
}

/** True when nothing differs from the defaults (so the menu can say so). */
export function isDefaultReading(prefs: ReadingPrefs): boolean {
  return prefs.font === 'default' && prefs.size === 'm' && !prefs.air
}
