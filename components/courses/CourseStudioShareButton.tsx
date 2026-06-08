'use client'

import { Share2 } from 'lucide-react'

export function CourseStudioShareButton() {
  return (
    <button
      type="button"
      className="course-studio-icon-btn"
      aria-label="Share lesson"
      onClick={() => {
        if (typeof navigator !== 'undefined' && navigator.share) {
          void navigator.share({
            title: document.title,
            url: window.location.href,
          })
        } else if (typeof navigator !== 'undefined') {
          void navigator.clipboard.writeText(window.location.href)
        }
      }}
    >
      <Share2 className="h-4 w-4" aria-hidden />
    </button>
  )
}
