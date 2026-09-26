'use client'

import type { CSSProperties, ReactNode } from 'react'
import { RichTextRenderer } from '@/components/RichTextRenderer'
import {
  paperFooterCode,
  parseQuestionNumber,
  sessionCoverLabel,
  splitQuestionParts,
  type QuestionPart,
} from '@/lib/exam-paper/question-parts'

/**
 * A question, set the way the paper prints it.
 *
 * Every other place we showed a question dressed it as a card: a chip, a
 * heading, a grey box. A student who has sat a Cambridge paper recognises a
 * question by its furniture — the bold number hanging in the margin, the
 * lettered parts in their own column, the marks ranged right in brackets, the
 * dotted lines waiting for an answer, the code in the footer. Setting it that
 * way is not decoration: it is the cue that says "this is the real thing, sit
 * it properly".
 *
 * Only layout conventions are reproduced — no board names, logos or crests.
 * Text rendering is pluggable so lesson content (CourseRichText) and marking
 * content (RichTextRenderer) both fit.
 */

export type ExamPaperRender = (text: string) => ReactNode

const defaultRender: ExamPaperRender = (text) => (
  <RichTextRenderer text={text} contentKind="question" variant="dark" />
)

type SheetProps = {
  /** "9702/22" — printed in the footer code and the running head. */
  paperCode?: string | null
  /** "s23" or "May/June 2023". */
  session?: string | null
  /** "Physics" — printed in the running head. */
  subjectName?: string | null
  /** "Paper 2 AS Level Structured Questions". */
  paperName?: string | null
  /** Page label printed top-centre, as on the paper ("2"). */
  page?: string | number | null
  /** Show "[Turn over" on the footer's right, as odd pages do. */
  turnOver?: boolean
  /** Slot above the questions (e.g. the "Answer all questions" rubric). */
  rubric?: ReactNode
  /** Slot below the questions, inside the sheet (e.g. actions). */
  foot?: ReactNode
  /** Optional dense mode for sidebars and previews. */
  compact?: boolean
  className?: string
  style?: CSSProperties
  children?: ReactNode
}

export function ExamPaperSheet({
  paperCode,
  session,
  subjectName,
  paperName,
  page,
  turnOver,
  rubric,
  foot,
  compact,
  className,
  style,
  children,
}: SheetProps) {
  const code = paperFooterCode(paperCode, session)
  const cover = sessionCoverLabel(session)
  const showHead = !!(subjectName || paperName || page != null)
  return (
    <div
      className={`xp-sheet${compact ? ' xp-sheet--compact' : ''}${className ? ` ${className}` : ''}`}
      style={style}
      data-screen-label="Exam paper"
    >
      {showHead ? (
        <div className="xp-head" aria-hidden={page == null && !subjectName ? true : undefined}>
          <span className="xp-head__left">
            {subjectName ? <span className="xp-head__subject">{subjectName}</span> : null}
            {paperName ? <span className="xp-head__paper">{paperName}</span> : null}
          </span>
          <span className="xp-head__page">{page ?? ''}</span>
          <span className="xp-head__right">{cover ?? ''}</span>
        </div>
      ) : null}
      {rubric ? <div className="xp-rubric">{rubric}</div> : null}
      <div className="xp-body">{children}</div>
      {foot ? <div className="xp-foot-slot">{foot}</div> : null}
      <div className="xp-foot">
        <span className="xp-foot__code">{code ?? (paperCode ?? '')}</span>
        <span className="xp-foot__turn">{turnOver ? '[Turn over' : ''}</span>
      </div>
    </div>
  )
}

type QuestionProps = {
  /** "3(b)(i)" — number goes to the margin, parts become the leading label. */
  questionNumber?: string | null
  /** The question body; line-start "(a)"/"(i)" labels and trailing "[n]" are laid out. */
  text?: string | null
  /** Pre-split parts, when the caller already has them. Wins over `text`. */
  parts?: QuestionPart[]
  /** Marks for the whole question, printed on the last line when parts state none. */
  totalMarks?: number | null
  /** Dotted answer lines under the question (0 = none). */
  answerLines?: number
  /** Something to print after the text, inside the question column. */
  after?: ReactNode
  render?: ExamPaperRender
  /** Render as the only question on the page: no top rule. */
  first?: boolean
  className?: string
}

export function ExamPaperQuestion({
  questionNumber,
  text,
  parts: givenParts,
  totalMarks,
  answerLines = 0,
  after,
  render = defaultRender,
  first,
  className,
}: QuestionProps) {
  const number = parseQuestionNumber(questionNumber)
  const parts = givenParts ?? splitQuestionParts(text)
  const anyPartMarks = parts.some((p) => typeof p.marks === 'number')
  // A leaf sub-part ("3(b)(i)") stored flat: print its own label in the part
  // column, so the student sees "(b)(i)" beside the stem as they would on paper.
  const leafLabel =
    number.parts.length && parts.length === 1 && !parts[0].label
      ? number.parts.map((p) => `(${p})`).join(' ')
      : null

  return (
    <div
      className={`xp-q${first ? ' xp-q--first' : ''}${className ? ` ${className}` : ''}`}
      data-screen-label="Exam paper — question"
    >
      <span className="xp-q__n" aria-label={number.number ? `Question ${number.printed}` : undefined}>
        {number.number ?? ''}
      </span>
      <div className="xp-q__col">
        {parts.map((p, i) => {
          const isLast = i === parts.length - 1
          const marks =
            typeof p.marks === 'number'
              ? p.marks
              : isLast && !anyPartMarks && typeof totalMarks === 'number' && totalMarks > 0
                ? totalMarks
                : null
          const label = p.label ?? (i === 0 ? leafLabel : null)
          return (
            <div key={i} className={`xp-part${label ? '' : ' xp-part--stem'}`}>
              {label ? <span className="xp-part__label">{label}</span> : null}
              <div className="xp-part__text">
                {render(p.text)}
                {marks != null ? (
                  <span className="xp-marks" aria-label={`${marks} mark${marks === 1 ? '' : 's'}`}>
                    [{marks}]
                  </span>
                ) : null}
              </div>
            </div>
          )
        })}
        {answerLines > 0 ? (
          <div className="xp-lines" aria-hidden="true">
            {Array.from({ length: answerLines }, (_, i) => (
              <span key={i} className="xp-line" />
            ))}
          </div>
        ) : null}
        {after}
      </div>
    </div>
  )
}

/** The paper's own instruction line, for use in `rubric`. */
export function ExamPaperRubric({
  totalMarks,
  children,
}: {
  totalMarks?: number | null
  children?: ReactNode
}) {
  return (
    <>
      <p className="xp-rubric__line">
        Answer <strong>all</strong> questions.
      </p>
      <p className="xp-rubric__line">
        The number of marks is given in brackets [ ] at the end of each question or part question.
        {typeof totalMarks === 'number' && totalMarks > 0 ? (
          <>
            {' '}
            The total mark for this paper is <strong>{totalMarks}</strong>.
          </>
        ) : null}
      </p>
      {children}
    </>
  )
}
