'use client'

import type { CSSProperties, ReactNode } from 'react'
import { cn } from '@/lib/utils'

type ExamSheetProps = {
  head?: ReactNode
  headRight?: ReactNode
  tally?: ReactNode
  cite?: ReactNode
  className?: string
  style?: CSSProperties
  children?: ReactNode
}

export function ExamSheet({
  head,
  headRight,
  tally,
  cite,
  className,
  style,
  children,
}: ExamSheetProps) {
  return (
    <div className={cn('ec-exam-sheet', className)} style={style}>
      {tally ? <div className="ec-exam-tally">{tally}</div> : null}
      {head ? (
        <div className="ec-exam-sheet__head">
          <span>{head}</span>
          <span>{headRight}</span>
        </div>
      ) : null}
      {children}
      {cite ? <div className="ec-scheme-cite">{cite}</div> : null}
    </div>
  )
}

type MarkStampProps = {
  children: ReactNode
  ok?: boolean
  className?: string
  style?: CSSProperties
}

export function MarkStamp({ children, ok = true, className, style }: MarkStampProps) {
  return (
    <span
      className={cn('ec-mark-stamp', ok ? 'ec-mark-stamp--ok' : 'ec-mark-stamp--no', className)}
      style={style}
    >
      {children}
    </span>
  )
}

type ExamSheetLineProps = {
  work: ReactNode
  mark?: ReactNode
  ok?: boolean
  note?: ReactNode
  noteOk?: boolean
  active?: boolean
  onClick?: () => void
  stampDelayMs?: number
}

export function ExamSheetLine({
  work,
  mark,
  ok = true,
  note,
  noteOk,
  active,
  onClick,
  stampDelayMs,
}: ExamSheetLineProps) {
  return (
    <div>
      <div
        className={cn(
          'ec-exam-sheet__line',
          onClick && 'ec-exam-sheet__line--interactive',
          active && 'ec-exam-sheet__line--active'
        )}
        onClick={onClick}
        onKeyDown={
          onClick
            ? (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  onClick()
                }
              }
            : undefined
        }
        role={onClick ? 'button' : undefined}
        tabIndex={onClick ? 0 : undefined}
      >
        <span className="ec-exam-sheet__work font-handwritten">{work}</span>
        {mark ? (
          <MarkStamp ok={ok} style={stampDelayMs ? { animationDelay: `${stampDelayMs}ms` } : undefined}>
            {mark}
          </MarkStamp>
        ) : null}
      </div>
      {note ? (
        <span className={noteOk ? 'ec-exam-note--green' : 'ec-exam-note--red'}>{note}</span>
      ) : null}
    </div>
  )
}
