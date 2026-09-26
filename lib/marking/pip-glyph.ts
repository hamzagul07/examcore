/**
 * The glyph on a mark pip (ScoreReveal): the examiner's own code when the
 * label is one (M1, A1, B2 …), written the way a script shows a withheld mark
 * — B1 not awarded is "B0". Anything else falls back to a tick or a cross, so
 * the earned/lost difference is always carried by the glyph as well as the
 * fill.
 */
export function pipGlyph(label: string, earned: boolean): string {
  const code = /^([A-Z]{1,2})(\d)$/.exec(label.trim())
  if (!code) return earned ? '✓' : '✗'
  return earned ? `${code[1]}${code[2]}` : `${code[1]}0`
}
