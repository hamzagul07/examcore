'use client'

import { ThemeSwitcher } from '@/components/design-system/ThemeSwitcher'
import { SettingsSectionCard } from '@/components/settings/SettingsSectionCard'

export function PreferencesSection() {
  return (
    <div className="space-y-6">
      <SettingsSectionCard
        title="Appearance"
        description="Choose how Examcore looks on your device."
      >
        <p className="label-overline mb-3">Theme</p>
        <ThemeSwitcher />
        <p className="text-caption mt-4">
          Late Night is our default dark workspace. Zen is a warm sand palette for
          daytime study.
        </p>
      </SettingsSectionCard>

      <SettingsSectionCard title="Motion">
        <p className="text-body">
          Animations follow your system&apos;s reduced motion preference. Update in
          your OS settings to change.
        </p>
      </SettingsSectionCard>

      <SettingsSectionCard title="Notifications">
        <p className="text-body text-[var(--ec-text-secondary)]">Coming soon</p>
        <p className="text-caption mt-2">
          Email and in-app reminders for exam countdowns and usage limits.
        </p>
      </SettingsSectionCard>
    </div>
  )
}
