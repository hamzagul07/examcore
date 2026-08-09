'use client'

import { getSubjectById } from '@/lib/profile-options'
import { LoadingLink } from '@/components/ui/LoadingLink'

type SubjectChip = {
  name: string
  code: string | null
}

type Props = {
  subjects: SubjectChip[]
  title?: string
}

/** Booklet subject slips — no soft chip carousel / mask fade. */
export function ActiveSubjects({ subjects, title = 'Subjects active' }: Props) {
  if (subjects.length === 0) return null

  return (
    <section className="ms-active-subjects mb-8">
      <div className="mb-4 flex items-center gap-2">
        <span className="ec-ink-stamp ec-ink-stamp--inline" aria-hidden>
          ¶
        </span>
        <h2 className="text-title" style={{ margin: 0 }}>
          {title}
        </h2>
      </div>
      <ul className="ms-active-subjects__list">
        {subjects.map(({ name, code }) => {
          const href = code
            ? `/dashboard/progress?subject=${encodeURIComponent(code)}`
            : '/dashboard/progress'
          const meta = getSubjectById(name)

          return (
            <li key={name}>
              <LoadingLink href={href} variant="inline" className="ms-active-subjects__slip">
                {code ? (
                  <span className="ms-active-subjects__code" aria-hidden>
                    {code}
                  </span>
                ) : (
                  <span className="ec-ink-stamp ec-ink-stamp--inline" aria-hidden>
                    SB
                  </span>
                )}
                <span className="ms-active-subjects__name">{meta?.label ?? name}</span>
                <span className="ms-active-subjects__go" aria-hidden>
                  -&gt;
                </span>
              </LoadingLink>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
