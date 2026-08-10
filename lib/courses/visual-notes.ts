/**
 * Experimental "diagram notes" — dual-code each note block.
 *
 * Research floor (Mayer / Paivio): words + relevant structure beat words alone;
 * visuals must sit beside the prose (spatial contiguity); no decorative junk.
 * We never invent science diagrams — only structure taken from the note itself
 * (bullets / tip / linked live-diagram step).
 */

export const VISUAL_NOTES_PREF_KEY = 'ms:visual-notes'

export type NoteSketchNode = {
  label: string
  kind: 'idea' | 'tip'
}

export type NoteSketch = {
  title: string
  nodes: NoteSketchNode[]
  /** e.g. "02" when a live-diagram step maps to this note. */
  figNum?: string
  figCaption?: string
}

const MAX_NODES = 5
const MAX_LABEL = 42

/** Strip light markup so sketch labels stay readable. */
export function sketchLabel(raw: string, max = MAX_LABEL): string {
  const clean = raw
    .replace(/\$\$[\s\S]*?\$\$/g, '…')
    .replace(/\$[^$]+\$/g, '…')
    .replace(/`[^`]+`/g, '')
    .replace(/\*\*|__/g, '')
    .replace(/[_*#>[\]()]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
  if (clean.length <= max) return clean
  return `${clean.slice(0, max - 1).trimEnd()}…`
}

function firstSentence(text: string): string {
  const t = text.trim()
  if (!t) return ''
  const m = t.match(/^.{12,120}?[.!?](?:\s|$)/)
  return (m?.[0] || t.slice(0, 100)).trim()
}

export function buildNoteSketch(
  note: { h: string; p?: string; bullets?: string[]; tip?: string },
  opts: { noteIndex: number; stepTitle?: string; stepBody?: string } 
): NoteSketch {
  const nodes: NoteSketchNode[] = []
  const bullets = (note.bullets || []).map((b) => sketchLabel(b)).filter(Boolean)
  if (bullets.length) {
    for (const label of bullets.slice(0, MAX_NODES)) {
      nodes.push({ label, kind: 'idea' })
    }
  } else {
    const lead = sketchLabel(firstSentence(note.p || ''))
    if (lead) nodes.push({ label: lead, kind: 'idea' })
  }
  if (note.tip && nodes.length < MAX_NODES) {
    nodes.push({ label: sketchLabel(note.tip, 36), kind: 'tip' })
  }

  const figNum =
    opts.stepTitle || opts.stepBody
      ? String(opts.noteIndex + 1).padStart(2, '0')
      : undefined
  const figCaption = opts.stepTitle
    ? sketchLabel(opts.stepTitle, 48)
    : opts.stepBody
      ? sketchLabel(opts.stepBody, 48)
      : undefined

  return {
    title: sketchLabel(note.h, 36),
    nodes,
    figNum,
    figCaption,
  }
}
