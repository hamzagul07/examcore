'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import type { ContinueCatalogEntry } from '@/lib/courses/margin-notes/continue-learning'
import { getContinueLearning } from '@/lib/courses/margin-notes/continue-learning'
import { accentCssVar } from '@/lib/courses/margin-notes/subject-meta'
import { useCourseProgressRevision } from '@/components/courses/CourseProgressClient'
import { Ring } from '@/components/courses/margin-notes/Ring'

type Props = {
  catalog: ContinueCatalogEntry[]
  screenLabel?: string
}

export function ContinueLearningStrip({ catalog, screenLabel }: Props) {
  const progressRev = useCourseProgressRevision()
  const cont = useMemo(
    () => getContinueLearning(catalog),
    [catalog, progressRev]
  )
  if (!cont) return null
  return (
    <Link
      className="continue card"
      href={cont.href}
      data-screen-label={screenLabel ?? 'Continue learning'}
    >
      <div className="continue-ring">
        <Ring pct={cont.prog} size={62} stroke={5} color={accentCssVar(cont.acc)} />
      </div>
      <div className="continue-body">
        <p className="micro continue-kicker">PICK UP WHERE YOU LEFT OFF</p>
        <h3 className="h3 continue-title">
          {cont.name} {cont.code} ·{' '}
          <span className="continue-topic">
            {cont.topicCode} {cont.topicTitle}
          </span>
        </h3>
        {cont.unitLabel ? (
          <p className="body-2 continue-blurb">{cont.unitLabel}</p>
        ) : null}
      </div>
      <span className="continue-cta btn-primary sm">Resume →</span>
    </Link>
  )
}
