import type { ReactNode } from 'react'
import { getPageMetadata } from '@/lib/seo/page-meta'
import { PageJsonLd } from '@/components/seo/PageJsonLd'

export const metadata = getPageMetadata('/mark')

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
