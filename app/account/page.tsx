import { SettingsMobileIndex } from '@/components/settings/SettingsShell'
import { ProfileSection } from '@/components/settings/sections/ProfileSection'
import { loadAccountContext } from '@/lib/settings/load-account-data'
import { MyClassesCard } from '@/components/account/MyClassesCard'
import { loadAccountClasses } from '@/lib/settings/load-account-data'
import { studentRequestTimeZone } from '@/lib/student/assignments'

export const dynamic = 'force-dynamic'

/**
 * Master-detail settings index (ACC-01):
 * - Phone: category list
 * - Desktop: Profile panel in the detail column (no media-query redirect)
 */
export default async function AccountIndexPage() {
  const { email, profile } = await loadAccountContext()
  // Classes the student joined, with Leave. Hidden when they are in none.
  const classes = await loadAccountClasses()
  const classesTimeZone = classes.length > 0 ? await studentRequestTimeZone() : undefined

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
      {classes.length > 0 ? (
        <div className="mt-6">
          <MyClassesCard classes={classes} timeZone={classesTimeZone} />
        </div>
      ) : null}
    </>
  )
}
