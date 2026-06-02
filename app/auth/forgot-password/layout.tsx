import type { ReactNode } from 'react'
import { createPageMetadata } from '@/lib/seo/metadata'

export const metadata = createPageMetadata({
  title: 'Reset password',
  description: 'Request a password reset link for your MarkScheme account.',
  path: '/auth/forgot-password',
  index: false,
})

export default function ForgotPasswordLayout({ children }: { children: ReactNode }) {
  return children
}
