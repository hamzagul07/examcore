import type { Metadata } from 'next'
import type { ReactNode } from 'react'

/** Invite URLs are private — do not index per-classroom codes. */
export const metadata: Metadata = {
  title: 'Join classroom',
  description: 'Accept a teacher invite and join your MarkScheme classroom.',
  robots: { index: false, follow: false },
}

export default function JoinCodeLayout({ children }: { children: ReactNode }) {
  return children
}
