import type { ReactNode } from 'react'

export const metadata = {
  title: 'Welcome',
  robots: { index: false, follow: false },
}

export default function OnboardingLayout({ children }: { children: ReactNode }) {
  return <div className="min-w-0 overflow-x-clip">{children}</div>
}
