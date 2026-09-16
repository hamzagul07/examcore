import type { ReactNode } from 'react'
import { readingFontsClassName } from '@/app/fonts/reading'

/** IB lessons share the reading typefaces with the Cambridge course routes. */
export default function IbCoursesLayout({ children }: { children: ReactNode }) {
  return (
    <div className={readingFontsClassName} style={{ display: 'contents' }}>
      {children}
    </div>
  )
}
