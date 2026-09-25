'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ThemeSwitcher } from '@/components/design-system/ThemeSwitcher'
import { NotificationBell } from '@/components/community/NotificationBell'
import { teacherNavItems } from '@/lib/site-nav'

type Props = {
  /**
   * `false` renders the header without its links or bell.
   *
   * Used on teacher setup, where the visitor is not a teacher yet: every
   * destination would 403 them. They still get the teacher wordmark, so they
   * can see which part of the product they are in, and a way to sign out.
   */
  showNav?: boolean
  /**
   * Whether the v2 teacher system is on (lib/teacher/flags.ts). Evaluated by
   * the server layout and passed in: TEACHER_V2 is not a NEXT_PUBLIC_ variable,
   * so this component cannot read it itself.
   */
  v2?: boolean
}

/**
 * Teacher header — Desk · Classes · Reviews on the left, notifications, theme,
 * account and sign-out on the right (docs/TEACHER_SYSTEM_SPEC.md §4).
 *
 * At ≤900px the link row hides and TeacherTabBar carries navigation, the same
 * split the student header and MobileTabBar use, so a phone never shows the
 * destinations twice.
 */
export function TeacherNav({ showNav = true, v2 = true }: Props = {}) {
  const pathname = usePathname() ?? ''
  const items = teacherNavItems(v2)

  return (
    <header className="ms-teacher-nav">
      <div className="ms-teacher-nav__inner">
        <Link
          href={showNav ? '/teacher/dashboard' : '/for-teachers'}
          className="ms-teacher-nav__brand"
          aria-label={showNav ? 'MarkScheme Teacher — your desk' : 'MarkScheme for teachers'}
        >
          <span className="ms-teacher-nav__brand-stamp" aria-hidden>
            TCH
          </span>
          <span aria-hidden>
            MarkScheme <span className="ms-teacher-nav__brand-sub">Teacher</span>
          </span>
        </Link>

        {showNav ? (
          <nav className="ms-teacher-nav__links" aria-label="Teacher navigation">
            {items.map((item) => {
              const active = item.isActive(pathname)
              return (
                <Link
                  key={item.id}
                  href={item.href}
                  className="ms-teacher-nav__link"
                  aria-current={active ? 'page' : undefined}
                >
                  <span className="ms-teacher-nav__stamp" aria-hidden>
                    {item.stamp}
                  </span>
                  {item.label}
                </Link>
              )
            })}
          </nav>
        ) : null}

        <div className="ms-teacher-nav__spacer" />

        <div className="ms-teacher-nav__utils">
          {/* The bell is the community notification feed, which is also where
              submissions, removals and seat decisions land for a teacher. It
              renders nothing when the feed is switched off. */}
          {showNav && v2 ? <NotificationBell /> : null}
          <ThemeSwitcher />
          {showNav ? (
            <Link
              href="/account"
              className="ms-teacher-nav__util ms-teacher-nav__util--wide"
              aria-label="Account settings"
              aria-current={pathname.startsWith('/account') ? 'page' : undefined}
            >
              <span aria-hidden>ACC</span>
            </Link>
          ) : null}
          <form action="/auth/signout" method="POST" className="inline-flex">
            <button type="submit" className="ms-teacher-nav__util" aria-label="Sign out">
              <span aria-hidden>OUT</span>
            </button>
          </form>
        </div>
      </div>
    </header>
  )
}
