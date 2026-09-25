'use client'

import { useEffect, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { setsHref } from '@/components/teacher/assignments/links'

type Status = 'open' | 'closed' | 'draft'

const OPTIONS: Array<{ value: Status; label: string }> = [
  { value: 'open', label: 'Open' },
  { value: 'closed', label: 'Closed' },
  { value: 'draft', label: 'Drafts' },
]

/**
 * Open / Closed / Drafts on the Sets page (docs/TEACHER_SYSTEM_SPEC.md §4:
 * "SegmentedControl Open/Closed/Drafts"). The list itself is server-rendered
 * from `?status=`; choosing a tab replaces the URL in a transition, so the
 * control answers at once while the list loads, and the busy state is
 * announced.
 */
export function SetStatusTabs({ classroomId, status }: { classroomId: string; status: Status }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [value, setValue] = useState<Status>(status)
  useEffect(() => setValue(status), [status])

  return (
    <div aria-busy={pending || undefined}>
      <SegmentedControl<Status>
        value={value}
        onChange={(next) => {
          if (next === value) return
          setValue(next)
          startTransition(() => {
            router.replace(setsHref(classroomId, next), { scroll: false })
          })
        }}
        options={OPTIONS}
        aria-label="Which sets to show"
        className="ms-teacher-start__choices"
        optionClassName="ms-teacher-start__choice"
      />
      <p className="sr-only" role="status" aria-live="polite">
        {pending ? 'Loading sets…' : ''}
      </p>
    </div>
  )
}
