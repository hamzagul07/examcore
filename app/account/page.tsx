import { SettingsMobileIndex } from '@/components/settings/SettingsShell'
import { ProfileSection } from '@/components/settings/sections/ProfileSection'
import { loadAccountContext } from '@/lib/settings/load-account-data'

export const dynamic = 'force-dynamic'

/**
 * Master-detail settings index (ACC-01):
 * - Phone: category list
 * - Desktop: Profile panel in the detail column (no media-query redirect)
 */
export default async function AccountIndexPage() {
  const { email, profile } = await loadAccountContext()

  return (
    <>
      <SettingsMobileIndex />
      <div className="hidden lg:block">
        <ProfileSection
          email={email}
          initialFullName={profile.full_name}
          initialUsername={profile.username}
          board={profile.board}
          level={profile.level}
          subjects={profile.subjects}
        />
      </div>
    </>
  )
}
