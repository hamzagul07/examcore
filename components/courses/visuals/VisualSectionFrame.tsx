import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'

export type VisualSectionAccent = 'brand' | 'success' | 'warm' | 'cool' | 'exam' | 'violet'

export function VisualSectionFrame({
  title,
  hint,
  icon: Icon,
  accent = 'brand',
  children,
  className = '',
  bodyClassName = '',
}: {
  title: string
  hint?: string
  icon: LucideIcon
  accent?: VisualSectionAccent
  children: ReactNode
  className?: string
  bodyClassName?: string
}) {
  return (
    <section
      className={`course-visual-section course-visual-section--${accent} ${className}`.trim()}
    >
      <header className="course-visual-section-header">
        <span className="course-visual-section-icon" aria-hidden>
          <Icon className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <h2 className="course-visual-section-title">{title}</h2>
          {hint ? <p className="course-visual-section-hint">{hint}</p> : null}
        </div>
      </header>
      <div className={`course-visual-section-body ${bodyClassName}`.trim()}>{children}</div>
    </section>
  )
}
