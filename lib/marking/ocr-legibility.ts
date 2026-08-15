/**
 * Did the transcription actually read the handwriting, or invent something?
 *
 * OCR fails without erroring. A photo it cannot read comes back as confident
 * nonsense rather than as an empty string, so the "no handwriting detected" path
 * never fires and the model downstream marks the noise. A real script came back
 * as "WPOT IRR WBET INBRR", "+木村", "R+++", and was scored 0/2 against it.
 *
 * Two signals, both chosen because ordinary exam working does not produce them:
 *
 *   1. Alphabetic runs with no vowel. "WPOT", "WBET", "INBRR" are what letter
 *      shapes become when the reader is guessing. Real words have vowels;
 *      symbolic maths is not alphabetic, so `3x + 7 = 22` is untouched by this.
 *
 *   2. CJK or other non-Latin script in a Latin-script answer. A Physics script
 *      does not contain 木村. This is the model reaching for tokens rather than
 *      reading marks on paper.
 *
 * Deliberately conservative: this triggers a second, more expensive read, and a
 * false positive costs money while a false negative costs a student a wrong
 * mark. Both signals must be more than incidental before it fires.
 */

/** Vowel-less alphabetic runs this long are what guessed letter shapes look like. */
const MIN_RUN = 4

/**
 * Vowel-less strings that are ordinary in exam work and must not count.
 * Short symbolic identifiers are excluded by MIN_RUN; these are the longer ones.
 */
const LEGITIMATE = new Set(['sqrt', 'cosh', 'sinh', 'tanh', 'nth', 'rhs', 'lhs', 'mgh'])

export type LegibilityVerdict = {
  illegible: boolean
  /** Why, for logs and telemetry — never shown to a student. */
  reason: string | null
  vowellessRuns: number
  alphabeticTokens: number
  hasNonLatinScript: boolean
}

export function assessOcrLegibility(text: string | null | undefined): LegibilityVerdict {
  const source = (text ?? '').trim()
  const empty: LegibilityVerdict = {
    illegible: false,
    reason: null,
    vowellessRuns: 0,
    alphabeticTokens: 0,
    hasNonLatinScript: false,
  }
  // Nothing to judge. An empty transcript is already handled as "no handwriting
  // detected" upstream and must not be double-reported as gibberish.
  if (source.length < 24) return empty

  // CJK, Hangul, Hiragana/Katakana, Cyrillic, Arabic, Devanagari. A student may
  // legitimately write in these, but not mixed into an otherwise Latin script,
  // which is the case this catches.
  const nonLatin = /[぀-ヿ㐀-䶿一-鿿가-힯Ѐ-ӿ؀-ۿऀ-ॿ]/
  const hasNonLatinScript = nonLatin.test(source)

  const tokens = source.match(/[A-Za-z]+/g) ?? []
  const alphabeticTokens = tokens.length
  const vowellessRuns = tokens.filter(
    (t) => t.length >= MIN_RUN && !/[aeiouAEIOU]/.test(t) && !LEGITIMATE.has(t.toLowerCase())
  ).length

  // A Latin script with a stray CJK glyph is the clearest tell there is, and one
  // is enough — nothing in a Physics answer produces it by accident.
  if (hasNonLatinScript) {
    return {
      illegible: true,
      reason: 'non-Latin script in a Latin-script answer',
      vowellessRuns,
      alphabeticTokens,
      hasNonLatinScript,
    }
  }

  // Otherwise require both a count and a share: three vowel-less runs in a long
  // script is noise, three in a script of twelve words is a failed read.
  const share = alphabeticTokens > 0 ? vowellessRuns / alphabeticTokens : 0
  if (vowellessRuns >= 3 && share >= 0.15) {
    return {
      illegible: true,
      reason: `${vowellessRuns} of ${alphabeticTokens} words have no vowel`,
      vowellessRuns,
      alphabeticTokens,
      hasNonLatinScript,
    }
  }

  return { ...empty, vowellessRuns, alphabeticTokens, hasNonLatinScript }
}
