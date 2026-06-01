import type { ReactNode } from 'react'
import { createPageMetadata } from '@/lib/seo/metadata'

export const metadata = createPageMetadata({
  title: 'Mark your answer',
  description:
    'Upload Cambridge past-paper working and get examiner-grade feedback in about 30 seconds. Single questions or whole papers.',
  path: '/mark',
})

export default function MarkLayout({ children }: { children: ReactNode }) {
  return children
}
