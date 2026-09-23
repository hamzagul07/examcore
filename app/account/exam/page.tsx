import { loadAccountContext } from '@/lib/settings/load-account-data'
import { ExamSection } from '@/components/settings/sections/ExamSection'
import { sanitizeNextPath } from '@/lib/auth-redirect'

export const dynamic = 'force-dynamic'

export default async function ExamSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>
}) {
  const [{ profile }, params] = await Promise.all([loadAccountContext(), searchParams])
  // /mark sends students here to change the board it locks to; give them
  // the way back once they have. Internal paths only.
  const returnTo = params.next ? sanitizeNextPath(params.next, '') || null : null

  return (
    <ExamSection
      returnTo={returnTo}
      role={profile.role}
      initialProfile={{
        full_name: profile.full_name,
        board: profile.board,
        level: profile.level,
        subjects: profile.subjects,
        exam_date: profile.exam_date,
        target_grade: profile.target_grade,
        stage: profile.stage,
        primary_goal: profile.primary_goal,
      }}
    />
  )
}
