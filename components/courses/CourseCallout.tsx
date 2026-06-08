'use client'

import type { ReactNode } from 'react'
import {
  AlertTriangle,
  BookMarked,
  BookOpen,
  FlaskConical,
  Lightbulb,
  Sigma,
  StickyNote,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

export type CourseCalloutVariant =
  | 'definition'
  | 'formula'
  | 'worked'
  | 'exam-tip'
  | 'mistake'
  | 'note'
  | 'reading'

const VARIANTS: Record<
  CourseCalloutVariant,
  { label: string; icon: LucideIcon; className: string }
> = {
  definition: { label: 'Definition', icon: BookMarked, className: 'course-callout--definition' },
  formula: { label: 'Key formula', icon: Sigma, className: 'course-callout--formula' },
  worked: { label: 'Worked example', icon: FlaskConical, className: 'course-callout--worked' },
  'exam-tip': { label: 'Exam tip', icon: Lightbulb, className: 'course-callout--exam-tip' },
  mistake: { label: 'Common mistake', icon: AlertTriangle, className: 'course-callout--mistake' },
  note: { label: 'Note', icon: StickyNote, className: 'course-callout--note' },
  reading: { label: 'Further reading', icon: BookOpen, className: 'course-callout--reading' },
}

export function CourseCallout({
  variant,
  title,
  children,
  className = '',
}: {
  variant: CourseCalloutVariant
  title?: string
  children: ReactNode
  className?: string
}) {
  const cfg = VARIANTS[variant]
  const Icon = cfg.icon

  return (
    <aside
      className={`course-callout ${cfg.className} ${className}`.trim()}
      role="note"
      aria-label={title ?? cfg.label}
    >
      <div className="course-callout-icon" aria-hidden>
        <Icon className="h-5 w-5" />
      </div>
      <div className="course-callout-body">
        <p className="course-callout-label">{title ?? cfg.label}</p>
        <div className="course-callout-content">{children}</div>
      </div>
    </aside>
  )
}
