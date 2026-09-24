import type { ReactNode } from 'react'
import { createPageMetadata } from '@/lib/seo/metadata'

export const metadata = createPageMetadata({
  title: 'Creator studio',
  description: 'Your creator space on MarkScheme: share kit, answers marked, where your followers lose marks.',
  path: '/creator',
  index: false,
})

export default function CreatorLayout({ children }: { children: ReactNode }) {
  return <div className="min-w-0 overflow-x-clip">{children}</div>
}
