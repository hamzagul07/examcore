import { loadAccountContext } from '@/lib/settings/load-account-data'
import { StudyAccountSection } from '@/components/settings/sections/StudyAccountSection'

export const dynamic = 'force-dynamic'

export default async function StudySettingsPage() {
  const { profile } = await loadAccountContext()

  return <StudyAccountSection initialProfile={profile} />
}
