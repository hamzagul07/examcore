'use client'

import { RichTextRenderer } from '@/components/RichTextRenderer'
import type { MarkSchemeRubric } from '@/lib/marking/mark-scheme-display'
import { MARKING_TYPE_LABELS } from '@/components/mark/QuestionPreviewPanel'

type Props = {
  rubric: MarkSchemeRubric
  activeMarkType?: string | null
  compact?: boolean
  /** Suppress the band-descriptor list — used when the Mark Gap band ladder
   * already renders it, so level-of-response results don't show it twice. */
  hideBands?: boolean
}

export function MarkSchemeRubricPanel({
  rubric,
  activeMarkType,
  compact = false,
  hideBands = false,
}: Props) {
  const activeKey = activeMarkType?.trim().toUpperCase() ?? null

  // Nothing to show once bands are hidden and the rest is empty — don't render
  // a header-only shell (happens for a level-of-response result whose only
  // rubric content was the band list the ladder now owns).
  const showBands = rubric.bands.length > 0 && !hideBands
  const hasContent =
    rubric.points.length > 0 ||
    showBands ||
    rubric.indicative_content.length > 0 ||
    rubric.common_errors.length > 0 ||
    rubric.acceptable_final_answers.length > 0 ||
    !!rubric.notes
  if (!hasContent) return null

  return (
    <section className={`ms-scheme-rubric ${compact ? 'ms-scheme-rubric--compact' : ''}`.trim()}>
      <div className="ms-scheme-rubric-head">
        <p className="ms-micro" style={{ marginBottom: 0 }}>
          OFFICIAL MARK SCHEME
        </p>
        <span className="ms-scheme-rubric-type">
          {MARKING_TYPE_LABELS[rubric.style]}
        </span>
      </div>

      {rubric.points.length > 0 ? (
        <ol className="ms-scheme-rubric-points">
          {rubric.points.map((point) => (
            <li
              key={`${point.type}-${point.id}`}
              className={
                activeKey && point.type.toUpperCase() === activeKey ? 'is-active' : undefined
              }
            >
              <span className="ms-scheme-rubric-code">{point.type}</span>
              <span className="ms-scheme-rubric-desc">
                <RichTextRenderer text={point.description} contentKind="mark_scheme" />
              </span>
            </li>
          ))}
        </ol>
      ) : null}

      {showBands ? (
        <div className="ms-scheme-rubric-bands">
          {rubric.bands.map((band) => (
            <div key={band.level} className="ms-scheme-rubric-band">
              <p className="ms-scheme-rubric-band-label">
                Level {band.level} · {band.marks_min}–{band.marks_max} marks
              </p>
              <div className="text-sm leading-relaxed text-[var(--ec-text-secondary)]">
                <RichTextRenderer text={band.descriptor} contentKind="mark_scheme" />
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {rubric.indicative_content.length > 0 ? (
        <div className="ms-scheme-rubric-extra">
          <p className="ms-micro" style={{ marginBottom: 8 }}>
            INDICATIVE CONTENT
          </p>
          <ul className="ms-scheme-rubric-list">
            {rubric.indicative_content.map((item, i) => (
              <li key={i}>
                <RichTextRenderer text={item} contentKind="mark_scheme" />
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {rubric.common_errors.length > 0 ? (
        <div className="ms-scheme-rubric-extra">
          <p className="ms-micro" style={{ marginBottom: 8 }}>
            COMMON ERRORS
          </p>
          <ul className="ms-scheme-rubric-list">
            {rubric.common_errors.map((item, i) => (
              <li key={i}>
                <RichTextRenderer text={item} contentKind="mark_scheme" />
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {rubric.acceptable_final_answers.length > 0 ? (
        <p className="ms-scheme-rubric-answers">
          <span className="ms-micro">ACCEPTABLE ANSWERS · </span>
          <RichTextRenderer
            text={rubric.acceptable_final_answers.join(', ')}
            contentKind="mark_scheme"
          />
        </p>
      ) : null}

      {rubric.notes ? (
        <p className="ms-scheme-rubric-notes">
          <RichTextRenderer text={rubric.notes} contentKind="mark_scheme" />
        </p>
      ) : null}
    </section>
  )
}
