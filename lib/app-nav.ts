/** Primary app routes shown in header (desktop) and mobile drawer (guests). */
export type AppNavItem = {
  href: string
  label: string
  isActive: (pathname: string) => boolean
}

export const APP_NAV_ITEMS: AppNavItem[] = [
  {
    href: '/dashboard',
    label: 'Dashboard',
    isActive: (p) => p === '/dashboard',
  },
  {
    href: '/mark',
    label: 'Mark',
    isActive: (p) => p === '/mark' || p.startsWith('/mark/'),
  },
  {
    href: '/dashboard/progress',
    label: 'Progress',
    isActive: (p) =>
      p.startsWith('/dashboard/progress') || p.startsWith('/dashboard/attempt/'),
  },
  {
    href: '/account',
    label: 'Account',
    isActive: (p) => p.startsWith('/account'),
  },
]
