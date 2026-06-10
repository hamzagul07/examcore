'use client'

import type { MarkAwarded } from '@/components/MarkingResultView'
import type { LorBandResult } from '@/lib/marking/types'
import { RichTextRenderer } from '@/components/RichTextRenderer'

type MarkAuditPanelProps = {
  marks: MarkAwarded[]
  selectedIndex: number
  onSelect: (index: number) => void
  marksEarned: number
  totalMarks: number
  gradeLabel?: string | null
  schemeLabel?: string | null
  bandResult?: LorBandResult | null
}

function auditDescription(mark: MarkAwarded): string {
  const ref = mark.line_reference?.trim()
  if (ref) return ref
  const reasoning = mark.reasoning?.trim() ?? ''
  if (reasoning.length <= 120) return reasoning
  return `${reasoning.slice(0, 117)}…`
}

function examinerNote(mark: MarkAwarded): string {
  const note = mark.margin_note?.trim()
  if (note) return note
  return mark.reasoning?.trim() ?? ''
}

export function MarkAuditPanel({
  marks,
  selectedIndex,
  onSelect,
  marksEarned,
  totalMarks,
  gradeLabel,
  schemeLabel,
  bandResult,
}: MarkAuditPanelProps) {
  const selected = marks[selectedIndex] ?? marks[0]
  const noteText = selected ? examinerNote(selected) : ''

  return (
    <div className="ms-audit">
      <div className="ms-audit-card">
        <div className="ms-audit-head">
          <span className="ms-micro">MARK AUDIT</span>
          {schemeLabel ? <span className="ms-micro">{schemeLabel}</span> : null}
        </div>
        {marks.map((mark, i) => (
          <button
            key={String(mark.mark_id)}
            type="button"
            className={[
              'ms-audit-row',
              mark.earned ? 'earn' : 'lost',
              selectedIndex === i ? 'sel' : '',
            ]
              .filter(Boolean)
              .join(' ')}
            onClick={() => onSelect(i)}
            aria-pressed={selectedIndex === i}
          >
            <span className="code">{mark.type}</span>
            <span className="desc">{auditDescription(mark)}</span>
            <span className="pts">{mark.earned ? '+1' : '0'}</span>
          </button>
        ))}
        <div className="ms-audit-total">
          <span
            className="font-mono text-sm font-bold"
            style={{ color: 'var(--ec-brand)' }}
          >
            TOTAL {marksEarned} / {totalMarks}
          </span>
          {gradeLabel ? (
            <span className="ms-grade-pill">running estimate: grade {gradeLabel}</span>
          ) : null}
        </div>
      </div>

      {bandResult ? (
        <div className="ms-examiner-note-card" style={{ marginTop: 16 }}>
          <p className="ms-overline" style={{ marginBottom: 4 }}>
            Band placement
          </p>
          <div className="ms-band-meter" aria-hidden="true">
            {[1, 2, 3, 4].map((level) => (
              <span
                key={level}
                className={level <= bandResult.level ? 'on' : undefined}
              />
            ))}
          </div>
          <div className="flex justify-between gap-3">
            <span className="ms-micro">L1 · L2 · L3 · L4</span>
            <span className="ms-grade-pill">
              Level {bandResult.level} — {bandResult.marks_awarded}/{bandResult.marks_available}
            </span>
          </div>
          <div className="mt-4 text-sm leading-relaxed text-[var(--ec-text-secondary)]">
            <RichTextRenderer text={bandResult.justification} />
          </div>
        </div>
      ) : null}

      {selected && noteText ? (
        <div className="ms-examiner-note-card">
          <p className="ms-overline" style={{ marginBottom: 10 }}>
            Examiner&apos;s note — {selected.type}
          </p>
          <span
            className={[
              'ms-greennote block',
              !selected.earned ? 'ms-greennote--lost' : '',
            ]
              .filter(Boolean)
              .join(' ')}
          >
            <RichTextRenderer text={noteText} />
          </span>
        </div>
      ) : null}
    </div>
  )
}
