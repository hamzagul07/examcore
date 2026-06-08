'use client'

import { useEffect, useState } from 'react'
import { ListTree } from 'lucide-react'

export type TocEntry = { id: string; label: string; level: 2 | 3 }

export function CourseLessonToc({ entries }: { entries: TocEntry[] }) {
  const [active, setActive] = useState<string | null>(entries[0]?.id ?? null)

  useEffect(() => {
    if (!entries.length) return

    const observers: IntersectionObserver[] = []
    const visible = new Map<string, number>()

    for (const entry of entries) {
      const el = document.getElementById(entry.id)
      if (!el) continue
      const obs = new IntersectionObserver(
        ([hit]) => {
          if (hit.isIntersecting) visible.set(entry.id, hit.intersectionRatio)
          else visible.delete(entry.id)
          const best = [...visible.entries()].sort((a, b) => b[1] - a[1])[0]
          if (best) setActive(best[0])
        },
        { rootMargin: '-20% 0px -55% 0px', threshold: [0, 0.25, 0.5, 1] }
      )
      obs.observe(el)
      observers.push(obs)
    }

    return () => observers.forEach((o) => o.disconnect())
  }, [entries])

  if (!entries.length) return null

  return (
    <nav className="course-lesson-toc" aria-label="On this page">
      <p className="course-lesson-toc-title">
        <ListTree className="h-4 w-4" aria-hidden />
        On this page
      </p>
      <ol className="course-lesson-toc-list">
        {entries.map((entry) => (
          <li
            key={entry.id}
            className={entry.level === 3 ? 'course-lesson-toc-item--nested' : undefined}
          >
            <a
              href={`#${entry.id}`}
              className={`course-lesson-toc-link${active === entry.id ? ' is-active' : ''}`}
              onClick={(e) => {
                e.preventDefault()
                document.getElementById(entry.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                setActive(entry.id)
              }}
            >
              {entry.label}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  )
}
