import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { TeacherNav } from '@/components/teacher/TeacherNav'

export const metadata: Metadata = {
  title: 'Teacher',
  robots: { index: false, follow: false },
}

export default function TeacherLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen min-w-0 overflow-x-clip">
      <TeacherNav />
      <main className="app-shell min-h-[calc(100vh-4rem)] min-w-0">{children}</main>
    </div>
  )
}
