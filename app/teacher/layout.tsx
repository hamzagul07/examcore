import { TeacherNav } from '@/components/teacher/TeacherNav'

export default function TeacherLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen">
      <TeacherNav />
      <main className="app-shell min-h-[calc(100vh-4rem)]">{children}</main>
    </div>
  )
}
