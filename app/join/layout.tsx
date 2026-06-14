import type { ReactNode } from 'react'
import { createPageMetadata } from '@/lib/seo/metadata'
import { JoinPageChrome } from '@/components/join/JoinPageChrome'

export const metadata = createPageMetadata({
  title: 'Join a classroom on MarkScheme',
  description:
    'Accept your teacher\'s invite code and join a MarkScheme classroom for Cambridge past-paper marking and class progress.',
  path: '/join',
})

export default function JoinLayout({ children }: { children: ReactNode }) {
  return (
    <main className="app-shell ms-join-shell flex min-h-screen min-w-0 items-center justify-center overflow-x-clip px-4">
      <JoinPageChrome>{children}</JoinPageChrome>
    </main>
  )
}
