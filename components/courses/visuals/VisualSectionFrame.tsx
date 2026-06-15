import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'

export type VisualSectionAccent = 'brand' | 'success' | 'warm' | 'cool' | 'exam' | 'violet'

export function VisualSectionFrame({
  id,
  title,
  hint,
  badge,
  icon: Icon,
  accent = 'brand',
  children,
  className = '',
  bodyClassName = '',
}: {
  id?: string
  title: string
  hint?: string
  badge?: string
  icon: LucideIcon
  accent?: VisualSectionAccent
  children: ReactNode
  className?: string
  bodyClassName?: string
}) {
  return (
    <section
      id={id}
      className={`course-visual-section course-visual-section--${accent} scroll-mt-28 ${className}`.trim()}
    >
      <header className="course-visual-section-header">
        <span className="course-visual-section-icon" aria-hidden>
          <Icon className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="course-visual-section-title-row">
            <h2 className="course-visual-section-title">{title}</h2>
            {badge ? <span className="course-visual-section-badge">{badge}</span> : null}
          </div>
          {hint ? <p className="course-visual-section-hint">{hint}</p> : null}
        </div>
      </header>
      <div className={`course-visual-section-body ${bodyClassName}`.trim()}>{children}</div>
    </section>
  )
}
