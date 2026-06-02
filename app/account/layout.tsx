import type { ReactNode } from 'react'
import { createPageMetadata } from '@/lib/seo/metadata'
import { SettingsShell } from '@/components/settings/SettingsShell'

export const metadata = createPageMetadata({
  title: 'Account settings',
  description: 'Manage your MarkScheme profile, billing, study preferences, and privacy.',
  path: '/account',
  index: false,
})

export default function AccountLayout({ children }: { children: ReactNode }) {
  return <SettingsShell>{children}</SettingsShell>
}
