import Link from 'next/link'

export type ClassTab = 'week' | 'sets' | 'students' | 'gaps' | 'reviews' | 'settings'

type TabDef = { key: ClassTab; label: string; href: (id: string) => string; v2Only?: boolean }

const enc = encodeURIComponent

const TABS: readonly TabDef[] = [
  { key: 'week', label: 'Week', href: (id) => `/teacher/classroom/${enc(id)}` },
  { key: 'sets', label: 'Sets', href: (id) => `/teacher/classroom/${enc(id)}/assignments`, v2Only: true },
  { key: 'students', label: 'Students', href: (id) => `/teacher/classroom/${enc(id)}/students` },
  { key: 'gaps', label: 'Gaps', href: (id) => `/teacher/classroom/${enc(id)}/gaps` },
  { key: 'reviews', label: 'Reviews', href: (id) => `/teacher/reviews?classroom_id=${enc(id)}` },
  { key: 'settings', label: 'Settings', href: (id) => `/teacher/classroom/${enc(id)}/settings` },
]

/**
 * The class's section tabs (docs/TEACHER_SYSTEM_SPEC.md §4: Week · Sets ·
 * Students · Gaps · Reviews · Settings), on `.ms-teacher-tabs`.
 *
 * A server component: the page says which tab it is (`current`), so the
 * open tab carries `aria-current="page"` in the HTML without a client hook.
 * Every class page renders it under its head:
 *
 *   <ClassTabs classroomId={id} current="settings" />
 *
 * `counts` puts a small tally on a tab (open sets, scripts to review); a
 * count flagged `alert` is inked crimson. `v2` hides Sets when the teacher
 * system v2 is switched off (TEACHER_V2=0).
 */
export function ClassTabs({
  classroomId,
  current,
  counts,
  v2 = true,
}: {
  classroomId: string
  current: ClassTab
  counts?: Partial<Record<ClassTab, { value: number; label: string; alert?: boolean }>>
  v2?: boolean
}) {
  return (
    <nav className="ms-teacher-tabs" aria-label="Class sections">
      {TABS.filter((t) => v2 || !t.v2Only).map((tab) => {
        const count = counts?.[tab.key]
        return (
          <Link
            key={tab.key}
            href={tab.href(classroomId)}
            className="ms-teacher-tabs__tab"
            aria-current={tab.key === current ? 'page' : undefined}
          >
            {tab.label}
            {count && Number.isFinite(count.value) && count.value > 0 ? (
              <>
                <span
                  className={`ms-teacher-tabs__count${count.alert ? ' ms-teacher-tabs__count--alert' : ''}`}
                  aria-hidden
                >
                  {count.value > 99 ? '99+' : count.value}
                </span>
                <span className="sr-only">, {count.label}</span>
              </>
            ) : null}
          </Link>
        )
      })}
    </nav>
  )
}
