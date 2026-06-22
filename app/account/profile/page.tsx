import { loadAccountContext } from '@/lib/settings/load-account-data'
import { ProfileSection } from '@/components/settings/sections/ProfileSection'

export const dynamic = 'force-dynamic'

export default async function ProfileSettingsPage() {
  const { email, profile } = await loadAccountContext()

  return (
    <ProfileSection
      email={email}
      initialFullName={profile.full_name}
      initialUsername={profile.username}
      board={profile.board}
      level={profile.level}
      subjects={profile.subjects}
    />
  )
}
