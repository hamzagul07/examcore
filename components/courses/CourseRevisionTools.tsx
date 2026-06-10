'use client'

import { useState, type ReactNode } from 'react'
import { ChevronDown, Layers } from 'lucide-react'

type ToolSection = {
  id: string
  label: string
  content: ReactNode
}

export function CourseRevisionTools({ sections }: { sections: ToolSection[] }) {
  const [open, setOpen] = useState(false)

  if (!sections.length) return null

  return (
    <section id="revision-tools" className="course-revision-tools scroll-mt-28">
      <button
        type="button"
        className="course-revision-tools-toggle"
        aria-expanded={open}
        aria-controls="revision-tools-panel"
        onClick={() => setOpen((v) => !v)}
      >
        <span className="flex min-w-0 items-center gap-2.5">
          <Layers className="h-4 w-4 shrink-0 text-[var(--ec-brand)]" aria-hidden />
          <span className="min-w-0 text-left">
            <span className="block text-sm font-semibold text-[var(--ec-text-primary)]">
              Revision tools
            </span>
            <span className="block text-xs text-[var(--ec-text-secondary)]">
              {sections.map((s) => s.label).join(' · ')}
            </span>
          </span>
        </span>
        <ChevronDown
          className={`h-5 w-5 shrink-0 text-[var(--ec-text-secondary)] transition-transform ${open ? 'rotate-180' : ''}`}
          aria-hidden
        />
      </button>

      {open ? (
        <div id="revision-tools-panel" className="course-revision-tools-panel space-y-8">
          {sections.map((section) => (
            <div key={section.id} id={section.id} className="scroll-mt-28">
              {section.content}
            </div>
          ))}
        </div>
      ) : null}
    </section>
  )
}
