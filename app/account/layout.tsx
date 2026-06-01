import { SettingsShell } from '@/components/settings/SettingsShell'

export default function AccountLayout({ children }: { children: React.ReactNode }) {
  return <SettingsShell>{children}</SettingsShell>
}
