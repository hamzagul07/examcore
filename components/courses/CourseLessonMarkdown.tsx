'use client'

import { RichTextRenderer } from '@/components/RichTextRenderer'

export function CourseLessonMarkdown({ content }: { content: string }) {
  return (
    <RichTextRenderer
      text={content}
      variant="light"
      contentKind="question"
      className="course-lesson-prose"
    />
  )
}
