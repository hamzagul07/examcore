import { PrivacySection } from '@/components/settings/sections/PrivacySection'
import { SettingsSectionCard } from '@/components/settings/SettingsSectionCard'

export const dynamic = 'force-dynamic'

export default function PrivacySettingsPage() {
  return (
    <div className="space-y-6">
      <PrivacySection />
      {/* What the teacher system keeps about a student, and where it is in
          their export (docs/TEACHER_SYSTEM_SPEC.md §8; the export itself is
          GET /api/account/export → `classrooms`). */}
      <SettingsSectionCard
        title="Classes and teachers"
        description="What joining a class shares, and what your export includes."
      >
        <ul className="text-body m-0 list-disc space-y-2 pl-5">
          <li>
            A teacher sees the work you mark in their class&apos;s subject from the day you join. Classmates never see
            your name or your marks, and teachers never see your email address.
          </li>
          <li>
            If you leave a class, the teacher keeps the marks for sets you already handed in; nothing you mark after
            that is shared. You can leave a class from your account page.
          </li>
          <li>
            Your data export includes your classes, the sets you were given or handed work in for, your hand-ins,
            your teachers&apos; notes and the marking decisions they shared with you, and a log of teacher actions
            about you (such as viewing your work or leaving feedback).
          </li>
        </ul>
      </SettingsSectionCard>
    </div>
  )
}
