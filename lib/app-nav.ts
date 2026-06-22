/** Primary app routes shown in header (desktop) and mobile drawer (guests). */
export type AppNavItem = {
  href: string
  label: string
  isActive: (pathname: string) => boolean
}

export const APP_NAV_ITEMS: AppNavItem[] = [
  {
    href: '/mark',
    label: 'Mark',
    isActive: (p) => p === '/mark' || p.startsWith('/mark/'),
  },
  {
    href: '/courses',
    label: 'Courses',
    isActive: (p) => p === '/courses' || p.startsWith('/courses/'),
  },
  {
    href: '/ib',
    label: 'IB',
    isActive: (p) => p === '/ib' || p.startsWith('/ib/'),
  },
  {
    href: '/subjects',
    label: 'Subjects',
    isActive: (p) => p === '/subjects' || p.startsWith('/subjects/'),
  },
  {
    href: '/community',
    label: 'Community',
    isActive: (p) => p === '/community' || p.startsWith('/community/'),
  },
  {
    href: '/dashboard/progress',
    label: 'Progress',
    isActive: (p) =>
      p.startsWith('/dashboard/progress') ||
      p.startsWith('/dashboard/attempt/') ||
      p === '/dashboard',
  },
  {
    href: '/account',
    label: 'Account',
    isActive: (p) => p.startsWith('/account'),
  },
]
