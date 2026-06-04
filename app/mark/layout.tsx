import type { ReactNode } from 'react'
import { createPageMetadata } from '@/lib/seo/metadata'
import { PageJsonLd } from '@/components/seo/PageJsonLd'

export const metadata = createPageMetadata({
  title: 'Mark a Cambridge past paper — upload handwritten answers',
  description:
    'Free Cambridge past-paper marking: upload a photo of your handwritten answer or a whole paper. MarkScheme scores against the real mark scheme — B1, M1, A1, MCQ, and essay bands in ~30 seconds.',
  path: '/mark',
})

export default function MarkLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <PageJsonLd
        path="/mark"
        title="Mark a Cambridge past paper"
        description="Free Cambridge past-paper marking: upload handwritten answers and get mark-by-mark feedback from real mark schemes."
        breadcrumbs={[
          { name: 'Home', path: '/' },
          { name: 'Mark a paper', path: '/mark' },
        ]}
      />
      {children}
    </>
  )
}
