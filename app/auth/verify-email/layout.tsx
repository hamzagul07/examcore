import type { ReactNode } from 'react'
import { createPageMetadata } from '@/lib/seo/metadata'

export const metadata = createPageMetadata({
  title: 'Verify your email',
  description: 'Confirm your email address to finish setting up MarkScheme.',
  path: '/auth/verify-email',
  index: false,
})

export default function VerifyEmailLayout({ children }: { children: ReactNode }) {
  return children
}
