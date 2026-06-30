'use client'

import { useEffect, useState } from 'react'
import type { BlogHeading } from '@/lib/blog/meta'

type Props = {
  headings: BlogHeading[]
}

export function BlogTableOfContents({ headings }: Props) {
  const h2s = headings.filter((h) => h.level === 2)
  const [activeId, setActiveId] = useState<string | null>(null)

  useEffect(() => {
    if (h2s.length < 3) return
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)
        if (visible[0]) setActiveId(visible[0].target.id)
      },
      // Activate a heading once it reaches the upper third of the viewport.
      { rootMargin: '0px 0px -70% 0px', threshold: 0 }
    )
    for (const h of headings) {
      const el = document.getElementById(h.id)
      if (el) observer.observe(el)
    }
    return () => observer.disconnect()
  }, [headings, h2s.length])

  if (h2s.length < 3) return null

  return (
    <>
      <nav className="ms-blog-toc-mobile lg:hidden" aria-label="On this page">
        <p className="ms-overline mb-2">Jump to</p>
        <ol>
          {h2s.map((h) => (
            <li key={h.id}>
              <a href={`#${h.id}`}>{h.text}</a>
            </li>
          ))}
        </ol>
      </nav>

      <nav className="ms-blog-toc hidden lg:block" aria-label="On this page">
        <p className="ms-overline">On this page</p>
        <ol className="mt-2 space-y-0">
          {headings.map((h) => {
            const active = h.id === activeId
            return (
              <li key={h.id} className={h.level === 3 ? 'pl-3' : undefined}>
                <a
                  href={`#${h.id}`}
                  data-active={active ? 'true' : undefined}
                  aria-current={active ? 'location' : undefined}
                >
                  {h.text}
                </a>
              </li>
            )
          })}
        </ol>
      </nav>
    </>
  )
}
