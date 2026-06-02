import type { ReactNode } from 'react'
import { createPageMetadata } from '@/lib/seo/metadata'

export const metadata = createPageMetadata({
  title: 'Progress',
  description: 'Track mastery, insights, and attempt history across your Cambridge subjects.',
  path: '/dashboard/progress',
  index: false,
})

export default function ProgressLayout({ children }: { children: ReactNode }) {
  return <div className="min-w-0 overflow-x-clip">{children}</div>
}
