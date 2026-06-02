import type { ReactNode } from 'react'
import { createPageMetadata } from '@/lib/seo/metadata'

export const metadata = createPageMetadata({
  title: 'Welcome — set up your study profile',
  description:
    'Choose your Cambridge level and subjects so MarkScheme can tailor past-paper marking and progress.',
  path: '/onboarding',
  index: false,
})

export default function OnboardingLayout({ children }: { children: ReactNode }) {
  return <div className="min-w-0 overflow-x-clip">{children}</div>
}
