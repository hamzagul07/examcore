import type { ReactNode } from 'react'
import { createPageMetadata } from '@/lib/seo/metadata'

export const metadata = createPageMetadata({
  title: 'Sign in — Cambridge past paper marking',
  description:
    'Sign in to MarkScheme to mark handwritten Cambridge A-Level and O-Level past papers, track progress, and use your monthly allowance.',
  path: '/auth/signin',
})

export default function SignInLayout({ children }: { children: ReactNode }) {
  return children
}
