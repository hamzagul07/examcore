'use client'

import { motion, useReducedMotion, type Variants } from 'framer-motion'
import {
  demoQuestion,
  type AnchoredMark,
  type AnnotationMark,
  type DemoAnswerLine,
  type DemoMark,
  type ScoreMark,
  type TickMark,
  type UnderlineMark,
} from './demo-data'
import { heroDemoEntrance, heroDemoEntranceReduced } from './motion'

const inkEase: [number, number, number, number] = [0.34, 1.56, 0.64, 1]

function markEntrance(delay: number, reduced: boolean): Variants {
  if (reduced) {
    return { hidden: { opacity: 1 }, visible: { opacity: 1 } }
  }
  return {
    hidden: { opacity: 0, scale: 0.92, filter: 'blur(6px)' },
    visible: {
      opacity: 1,
      scale: 1,
      filter: 'blur(0px)',
      transition: { duration: 0.35, delay, ease: inkEase },
    },
  }
}

function underlineDraw(delay: number, reduced: boolean): Variants {
  if (reduced) {
    return { hidden: { scaleX: 1 }, visible: { scaleX: 1 } }
  }
  return {
    hidden: { scaleX: 0 },
    visible: {
      scaleX: 1,
      transition: { duration: 0.35, delay, ease: inkEase },
    },
  }
}

const handwriting = 'font-[family-name:var(--ec-font-handwriting)]'

function DemoHeader({ children }: { children: string }) {
  return (
    <p className="font-mono text-[12px] tracking-[0.04em] text-[var(--ec-text-secondary)]">
      {children}
    </p>
  )
}

function DemoQuestion({ children }: { children: string }) {
  return (
    <p className="ec-question-text mt-3 text-[15px] leading-[1.5] md:text-[16px]">
      {children}
    </p>
  )
}

function DemoScoreBadge({ mark, reduced }: { mark: ScoreMark; reduced: boolean }) {
  return (
    <motion.span
      aria-hidden
      variants={markEntrance(mark.delay, reduced)}
      className="absolute right-5 top-5 rounded-full bg-[var(--ec-ink-red)] px-3 py-1 text-[13px] font-medium text-[var(--ec-surface-raised)]"
    >
      {mark.label}
    </motion.span>
  )
}

function TickGlyph({ mark, reduced }: { mark: TickMark; reduced: boolean }) {
  return (
    <motion.span
      aria-hidden
      variants={markEntrance(mark.delay, reduced)}
      className={`absolute left-full top-0 ml-3 leading-none text-[var(--ec-ink-red)] ${handwriting} text-[26px] md:text-[32px]`}
    >
      ✓
    </motion.span>
  )
}

function UnderlineStroke({
  mark,
  reduced,
}: {
  mark: UnderlineMark
  reduced: boolean
}) {
  return (
    <motion.span
      aria-hidden
      variants={underlineDraw(mark.delay, reduced)}
      style={{ transformOrigin: 'left' }}
      className="absolute inset-x-0 -bottom-[2px] block h-[2px] rounded-full bg-[var(--ec-ink-red)]"
    />
  )
}

function AnnotationNote({
  mark,
  reduced,
}: {
  mark: AnnotationMark
  reduced: boolean
}) {
  return (
    <motion.span
      aria-hidden
      variants={markEntrance(mark.delay, reduced)}
      className={`mt-1 block text-[var(--ec-ink-red)] ${handwriting} text-[14px] md:absolute md:right-0 md:top-0 md:mt-0 md:max-w-[9rem] md:text-right md:text-[16px]`}
    >
      {mark.label}
    </motion.span>
  )
}

type DemoAnswerProps = { reduced: boolean; marks: readonly AnchoredMark[] } & (
  | { lines: readonly DemoAnswerLine[]; imageSrc?: never }
  | { imageSrc: string; lines?: never }
)

function DemoAnswer(props: DemoAnswerProps) {
  // SWAP POINT: to mark a real scanned paper instead of web-rendered text, pass
  // `imageSrc` (the scanned answer image) instead of `lines`. Implement the branch
  // below by rendering the image and absolutely positioning each mark over it using
  // normalized x/y coordinates stored alongside the mark data. Only the `lines`
  // path is implemented today; the prop union keeps the future swap non-breaking.
  const lines = props.lines
  if (!lines) {
    return null
  }

  const { marks, reduced } = props

  return (
    <ul className="mt-6 md:mt-8">
      {lines.map((line) => {
        const lineMarks = marks.filter((m) => m.anchorLineId === line.id)
        const tick = lineMarks.find((m): m is TickMark => m.type === 'tick')
        const underline = lineMarks.find(
          (m): m is UnderlineMark => m.type === 'underline',
        )
        const annotation = lineMarks.find(
          (m): m is AnnotationMark => m.type === 'annotation',
        )

        return (
          <li key={line.id} className="relative md:pr-44">
            <span
              className={`relative inline-block leading-[1.8] text-[var(--ec-text-primary)] ${handwriting} text-[22px] md:text-[26px]`}
            >
              {line.text}
              {underline && (
                <UnderlineStroke mark={underline} reduced={reduced} />
              )}
              {tick && <TickGlyph mark={tick} reduced={reduced} />}
            </span>
            {annotation && (
              <AnnotationNote mark={annotation} reduced={reduced} />
            )}
          </li>
        )
      })}
    </ul>
  )
}

function isAnchored(mark: DemoMark): mark is AnchoredMark {
  return mark.type !== 'score'
}

export function ExaminerInkDemo() {
  const prefersReducedMotion = useReducedMotion()
  const reduced = Boolean(prefersReducedMotion)
  const entrance = reduced ? heroDemoEntranceReduced : heroDemoEntrance

  const anchoredMarks = demoQuestion.marks.filter(isAnchored)
  const scoreMark = demoQuestion.marks.find(
    (m): m is ScoreMark => m.type === 'score',
  )

  return (
    <div>
      <motion.figure
        variants={entrance}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.2 }}
        role="img"
        aria-label="Demonstration of Examcore marking a Physics past paper question, earning 3 out of 4 marks"
        className="relative rounded-[16px] border border-[var(--ec-border)] bg-[var(--ec-surface-raised)] p-6 shadow-[var(--ec-card-shadow)] md:p-10"
      >
        {scoreMark && <DemoScoreBadge mark={scoreMark} reduced={reduced} />}
        <DemoHeader>{demoQuestion.subjectCode}</DemoHeader>
        <DemoQuestion>{demoQuestion.question}</DemoQuestion>
        <DemoAnswer
          lines={demoQuestion.answer}
          marks={anchoredMarks}
          reduced={reduced}
        />
      </motion.figure>
      <p className="mt-4 text-center text-[13px] text-[var(--ec-text-secondary)]">
        This is a real Physics 9702 question with a simulated answer. Actual
        marking takes about 45 seconds.
      </p>
    </div>
  )
}
