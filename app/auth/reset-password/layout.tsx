import type { ReactNode } from 'react'
import { createPageMetadata } from '@/lib/seo/metadata'

export const metadata = createPageMetadata({
  title: 'Choose a new password',
  description: 'Set a new password for your MarkScheme account.',
  path: '/auth/reset-password',
  index: false,
})

export default function ResetPasswordLayout({ children }: { children: ReactNode }) {
  return children
}
