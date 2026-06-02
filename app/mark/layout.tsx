import type { ReactNode } from 'react'
import { createPageMetadata } from '@/lib/seo/metadata'

export const metadata = createPageMetadata({
  title: 'Mark a Cambridge past paper — upload handwritten answers',
  description:
    'Free Cambridge past-paper marking: upload a photo of your handwritten answer or a whole paper. MarkScheme scores against the real mark scheme — B1, M1, A1, MCQ, and essay bands in ~30 seconds.',
  path: '/mark',
})

export default function MarkLayout({ children }: { children: ReactNode }) {
  return children
}
