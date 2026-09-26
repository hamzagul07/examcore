import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { TeacherNav } from '@/components/teacher/TeacherNav'
import { TeacherTabBar } from '@/components/teacher/TeacherTabBar'
import { isTeacherV2 } from '@/lib/teacher/flags'

export const metadata: Metadata = {
  title: { default: 'Teacher desk', template: '%s · Teacher' },
  robots: { index: false, follow: false },
}

/**
 * The teacher frame: header (Desk · Classes · Reviews · bell · theme · account
 * · sign out), the phone tab bar, and one <main> every teacher page renders
 * into. Access is enforced before this runs — proxy.ts sends anyone without
 * the teacher role back to /dashboard — and each page re-checks its own data.
 *
 * The v2 flag is read here, on the server, and handed to the client nav:
 * TEACHER_V2 is not a public env var, so the client cannot read it.
 */
export default function TeacherLayout({ children }: { children: ReactNode }) {
  const v2 = isTeacherV2()

  return (
    <div className="min-h-screen min-w-0 overflow-x-clip">
      <a
        href="#teacher-main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[100] focus:rounded focus:bg-[var(--ec-paper)] focus:px-4 focus:py-3 focus:shadow-[var(--ec-shadow-hard)]"
      >
        Skip to content
      </a>
      <TeacherNav v2={v2} />
      <main
        id="teacher-main"
        tabIndex={-1}
        className={`app-shell ms-teacher-layout min-h-[calc(100vh-4rem)] min-w-0 outline-none${
          v2 ? ' app-shell-tabbed' : ''
        }`}
      >
        {children}
      </main>
      {v2 ? <TeacherTabBar /> : null}
    </div>
  )
}
