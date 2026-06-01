import type { ReactNode } from 'react'
import { createPageMetadata } from '@/lib/seo/metadata'

export const metadata = createPageMetadata({
  title: 'Dashboard',
  description: 'Your study home — recent marks, subjects, and what to practice next.',
  path: '/dashboard',
})

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return <div className="min-w-0 overflow-x-clip">{children}</div>
}
