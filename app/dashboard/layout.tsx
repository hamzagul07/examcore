import type { ReactNode } from 'react'
import { createPageMetadata } from '@/lib/seo/metadata'

export const metadata = createPageMetadata({
  title: 'Dashboard — your Cambridge revision home',
  description:
    'MarkScheme dashboard: recent past-paper marks, syllabus mastery, and what to practice next for Cambridge A-Level and O-Level.',
  path: '/dashboard',
  index: false,
})

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return <div className="min-w-0 overflow-x-clip">{children}</div>
}
