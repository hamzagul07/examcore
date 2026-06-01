'use client'

import {
  ExaminerInkOverlay,
  type LineReference,
} from '@/components/examiner-ink/ExaminerInkOverlay'
import { toAnswerPhotoStoragePath } from '@/lib/storage/answer-photo-paths'

export function ExaminerInkPerPage({
  pages,
  animate = false,
  attemptId,
}: {
  pages: Array<{ photo_url: string; line_references: LineReference[] }>
  animate?: boolean
  attemptId?: string
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
            attemptId={attemptId}
            photoRef={toAnswerPhotoStoragePath(page.photo_url)}
            animate={animate}
          />
        </div>
      ))}
    </div>
  )
}
