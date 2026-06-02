import type { ReactNode } from 'react'
import { createPageMetadata } from '@/lib/seo/metadata'

export const metadata = createPageMetadata({
  title: 'Create account — start marking past papers free',
  description:
    'Join MarkScheme free. Upload Cambridge past-paper answers, get mark-by-mark feedback from real mark schemes, and revise faster.',
  path: '/auth/signup',
})

export default function SignUpLayout({ children }: { children: ReactNode }) {
  return children
}
