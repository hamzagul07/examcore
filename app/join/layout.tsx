import type { ReactNode } from 'react'
import { createPageMetadata } from '@/lib/seo/metadata'
import { JoinPageChrome } from '@/components/join/JoinPageChrome'

export const metadata = createPageMetadata({
  title: 'Join a classroom',
  description: 'Accept a teacher invite and join your class on Examcore.',
  path: '/join',
})

export default function JoinLayout({ children }: { children: ReactNode }) {
  return (
    <main className="app-shell flex min-h-screen min-w-0 items-center justify-center overflow-x-clip px-4">
      <JoinPageChrome>{children}</JoinPageChrome>
    </main>
  )
}
