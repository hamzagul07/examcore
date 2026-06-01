import type { LucideIcon } from 'lucide-react'
import {
  User,
  GraduationCap,
  Calendar,
  CreditCard,
  SlidersHorizontal,
  Shield,
} from 'lucide-react'

export type SettingsNavItem = {
  slug: string
  label: string
  description: string
  href: string
  icon: LucideIcon
}

export const SETTINGS_NAV: SettingsNavItem[] = [
  {
    slug: 'profile',
    label: 'Profile',
    description: 'Display name and email',
    href: '/account/profile',
    icon: User,
  },
  {
    slug: 'study',
    label: 'Account',
    description: 'Subjects, level, and security',
    href: '/account/study',
    icon: GraduationCap,
  },
  {
    slug: 'exam',
    label: 'Exam',
    description: 'Exam date and countdown',
    href: '/account/exam',
    icon: Calendar,
  },
  {
    slug: 'billing',
    label: 'Billing',
    description: 'Plan, usage, and payments',
    href: '/account/billing',
    icon: CreditCard,
  },
  {
    slug: 'preferences',
    label: 'Preferences',
    description: 'Theme and accessibility',
    href: '/account/preferences',
    icon: SlidersHorizontal,
  },
  {
    slug: 'privacy',
    label: 'Privacy & data',
    description: 'Data export and account deletion',
    href: '/account/privacy',
    icon: Shield,
  },
]

export function settingsNavItem(pathname: string): SettingsNavItem | undefined {
  return SETTINGS_NAV.find(
    (item) => pathname === item.href || pathname.startsWith(`${item.href}/`)
  )
}
