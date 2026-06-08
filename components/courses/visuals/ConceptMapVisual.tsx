'use client'

import { useState } from 'react'
import { Network } from 'lucide-react'
import type { VisualTemplate } from '@/lib/courses/visual-types'
import { VisualSectionFrame } from '@/components/courses/visuals/VisualSectionFrame'
import { CourseRichText } from '@/components/courses/CourseRichText'

export function ConceptMapVisual({
  center,
  nodes,
}: {
  center: string
  nodes: string[]
  template?: VisualTemplate
}) {
  const [active, setActive] = useState(0)
  const slice = nodes.slice(0, 6)

  return (
    <VisualSectionFrame
      title="How it all connects"
      hint="The big idea sits in the middle — tap a linked idea to explore how it fits."
      icon={Network}
      accent="violet"
      className="course-concept-map"
    >
      <div className="course-concept-map-layout">
        <div className="course-concept-map-canvas">
          <div className="course-concept-core">
            <p className="course-concept-core-label">Main topic</p>
            <p className="course-concept-core-title">{center}</p>
          </div>
          <div className="course-concept-nodes-grid" role="list">
            {slice.map((node, i) => (
              <button
                key={`${i}-${node.slice(0, 24)}`}
                type="button"
                role="listitem"
                onClick={() => setActive(i)}
                className={`course-concept-node ${active === i ? 'is-active' : ''}`}
              >
                <CourseRichText
                  content={node}
                  variant="inline"
                  breakAnywhere={false}
                  className="course-concept-node-text"
                />
              </button>
            ))}
          </div>
        </div>
        <div className="course-concept-focus">
          <p className="course-concept-focus-label">You selected</p>
          <div className="course-concept-focus-detail">
            <CourseRichText content={slice[active]} variant="prose" breakAnywhere={false} />
          </div>
          <aside className="course-concept-think-panel">
            <p>
              Think about how this links back to <strong>{center}</strong> before you try past-paper
              questions. That connection is what examiners reward.
            </p>
          </aside>
        </div>
      </div>
    </VisualSectionFrame>
  )
}
