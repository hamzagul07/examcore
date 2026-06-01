import type { Metadata } from 'next'
import type { ReactNode } from 'react'

export const metadata: Metadata = {
  title: 'Admin',
  robots: { index: false, follow: false },
}

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="app-shell min-h-screen min-w-0 overflow-x-clip py-8 sm:py-10">
      {children}
    </div>
  )
}
