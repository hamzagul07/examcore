import { JoinPageChrome } from '@/components/join/JoinPageChrome'

export default function JoinLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="app-shell flex min-h-screen items-center justify-center">
      <JoinPageChrome>{children}</JoinPageChrome>
    </main>
  )
}
