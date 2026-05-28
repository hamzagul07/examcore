import { TeacherNav } from '@/components/teacher/TeacherNav'

export default function TeacherLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen">
      <TeacherNav />
      <main>{children}</main>
    </div>
  )
}
