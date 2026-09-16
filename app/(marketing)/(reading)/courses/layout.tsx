import type { ReactNode } from 'react'
import { readingFontsClassName } from '@/app/fonts/reading'

/**
 * Course routes carry the reading typefaces (app/fonts/reading.ts). The
 * wrapper is display:contents so it changes nothing about layout — it only
 * publishes the --font-reading-* variables the lesson CSS reads.
 */
export default function CoursesLayout({ children }: { children: ReactNode }) {
  return (
    <div className={readingFontsClassName} style={{ display: 'contents' }}>
      {children}
    </div>
  )
}
