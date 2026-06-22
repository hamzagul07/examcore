import { loadAccountContext } from '@/lib/settings/load-account-data'
import { PreferencesSection } from '@/components/settings/sections/PreferencesSection'

export const dynamic = 'force-dynamic'

export default async function PreferencesSettingsPage() {
  const { notifications } = await loadAccountContext()

  return (
    <PreferencesSection
      initialExamReminders={notifications.emailExamReminders}
      initialProductUpdates={notifications.emailProductUpdates}
      initialCommunityReplies={notifications.emailCommunityReplies}
      initialCommunityDigest={notifications.emailCommunityDigest}
    />
  )
}
