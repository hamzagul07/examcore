import { loadAccountContext } from '@/lib/settings/load-account-data'
import { ExamSection } from '@/components/settings/sections/ExamSection'

export const dynamic = 'force-dynamic'

export default async function ExamSettingsPage() {
  const { profile } = await loadAccountContext()

  return (
    <ExamSection
      initialProfile={{
        full_name: profile.full_name,
        board: profile.board,
        level: profile.level,
        subjects: profile.subjects,
        exam_date: profile.exam_date,
        stage: profile.stage,
        primary_goal: profile.primary_goal,
      }}
    />
  )
}
