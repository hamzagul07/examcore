import type { ReactNode } from 'react'
import { Newsreader } from 'next/font/google'
import './course-tokens.css'
import './course-premium.css'

const newsreader = Newsreader({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
  variable: '--font-reading',
})

export default function CoursesLayout({ children }: { children: ReactNode }) {
  return <div className={`course-root ${newsreader.variable}`}>{children}</div>
}
