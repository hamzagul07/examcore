/**
 * A step card's title, taken from its caption.
 *
 * The title used to be the caption cut at the first full stop or dash, which
 * turned "A power supply provides the e.m.f. that drives charge…" into
 * "A power supply provides the e" — the abbreviation's own dots did the
 * cutting, and the diagram's header and step cards both showed the stump.
 * This takes the first sentence (skipping dots inside abbreviations such as
 * e.m.f., p.d., i.e., Fig.) and, when that is still long, cuts at a word
 * boundary with an ellipsis so a title never ends mid-word.
 */

const MAX_TITLE = 44

/* "e.m.f.", "(p.d.", "i.e.", "Fig.", "etc." — the dot belongs to the word.
   A lone letter before the dot ("…across R.") is a variable ending a sentence. */
const ABBREVIATION_TAIL = /(?:^|[\s(])(?:[A-Za-z](?:\.[A-Za-z])+|fig|eg|ie|etc|vs|approx|no)\.$/i

export function firstClause(text: string): string {
  const src = text.trim()
  const dash = src.search(/\s[—–]\s/)
  let end = dash >= 0 ? dash : src.length
  const stop = /\.(?=\s)/g
  let m: RegExpExecArray | null
  while ((m = stop.exec(src)) && m.index < end) {
    // "e.m.f." / "p.d." / "Fig." — a dot that belongs to the word, not the sentence.
    if (ABBREVIATION_TAIL.test(src.slice(0, m.index + 1))) continue
    end = m.index
    break
  }
  return src.slice(0, end).trim()
}

export function stepTitleFromCaption(caption: string | undefined, index: number): string {
  const clause = caption ? firstClause(caption) : ''
  if (!clause) return `Step ${index + 1}`
  if (clause.length <= MAX_TITLE) return clause
  const cut = clause.slice(0, MAX_TITLE)
  const atWord = cut.lastIndexOf(' ')
  const head = atWord > MAX_TITLE / 2 ? cut.slice(0, atWord) : cut
  return `${head.replace(/[,;:\s]+$/, '')}…`
}
