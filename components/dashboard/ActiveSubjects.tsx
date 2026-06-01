import Link from 'next/link'
import { getSubjectById } from '@/lib/profile-options'

type SubjectChip = {
  name: string
  code: string | null
  attemptCount: number
}

type Props = {
  subjects: SubjectChip[]
}

export function ActiveSubjects({ subjects }: Props) {
  if (subjects.length === 0) return null

  return (
    <section className="mb-8">
      <h2 className="text-title mb-4">Subjects active</h2>
      <div className="flex gap-2 overflow-x-auto pb-1 lg:flex-wrap lg:overflow-visible">
        {subjects.map(({ name, code, attemptCount }) => {
          const href = code
            ? `/dashboard/progress?subject=${encodeURIComponent(code)}`
            : '/dashboard/progress'
          const meta = getSubjectById(name)

          return (
            <Link
              key={name}
              href={href}
              className="ec-chip ec-chip-info shrink-0 px-4 py-2.5 text-sm min-h-[44px] inline-flex items-center gap-2"
            >
              <span className="font-semibold">{meta?.label ?? name}</span>
              <span className="font-mono text-xs opacity-80">{attemptCount}</span>
            </Link>
          )
        })}
      </div>
    </section>
  )
}
