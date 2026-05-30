'use client'

import {
  ExaminerInkOverlay,
  type LineReference,
} from '@/components/examiner-ink/ExaminerInkOverlay'

export function ExaminerInkPerPage({
  pages,
  animate = false,
}: {
  pages: Array<{ photo_url: string; line_references: LineReference[] }>
  animate?: boolean
}) {
  if (!pages.length) return null

  return (
    <div className="space-y-6">
      {pages.map((page, i) => (
        <div key={page.photo_url + i}>
          {pages.length > 1 && (
            <p className="ec-label-tech mb-2">PAGE {i + 1}</p>
          )}
          <ExaminerInkOverlay
            imageUrl={page.photo_url}
            lineReferences={page.line_references}
            animate={animate}
          />
        </div>
      ))}
    </div>
  )
}
