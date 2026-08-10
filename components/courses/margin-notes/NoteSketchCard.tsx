'use client'

import type { NoteSketch } from '@/lib/courses/visual-notes'

/**
 * Paper-ink dual-code panel for one note.
 * Structure only — never a fake science diagram.
 */
export function NoteSketchCard({
  sketch,
  onOpenFig,
}: {
  sketch: NoteSketch
  onOpenFig?: () => void
}) {
  return (
    <aside className="note-sketch" aria-label="Diagram of this note">
      <div className="note-sketch-head">
        <span className="note-sketch-k mono">SKETCH</span>
        <span className="note-sketch-title">{sketch.title}</span>
      </div>

      {sketch.nodes.length > 0 ? (
        <ol className="note-sketch-flow">
          {sketch.nodes.map((n, i) => (
            <li
              key={`${n.kind}-${i}`}
              className={`note-sketch-node note-sketch-node--${n.kind}`}
            >
              <span className="note-sketch-dot mono" aria-hidden>
                {n.kind === 'tip' ? '!' : String(i + 1).padStart(2, '0')}
              </span>
              <span className="note-sketch-label">{n.label}</span>
            </li>
          ))}
        </ol>
      ) : (
        <p className="note-sketch-empty micro">Read the prose — this block is thin.</p>
      )}

      {sketch.figNum && sketch.figCaption ? (
        onOpenFig ? (
          <button type="button" className="note-sketch-fig" onClick={onOpenFig}>
            <span className="mono">FIG · {sketch.figNum}</span>
            <span>{sketch.figCaption}</span>
          </button>
        ) : (
          <p className="note-sketch-fig note-sketch-fig--static">
            <span className="mono">FIG · {sketch.figNum}</span>
            <span>{sketch.figCaption}</span>
          </p>
        )
      ) : null}
    </aside>
  )
}
