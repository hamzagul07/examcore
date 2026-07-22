'use client'

import { ClassBlindspots } from '@/components/teacher/ClassBlindspots'
import type { BlindspotInput } from '@/lib/teacher/blindspots'

/**
 * Visual harness for the class blindspot chart. /teacher/classroom/[id] is
 * auth-gated and needs a real classroom, so fixtures are the only way to look
 * at this. Mirrors the other /dev previews.
 */

function t(
  name: string,
  code: string,
  avgMastery: number,
  studentsAttempted: number,
  totalStudents = 28
): BlindspotInput {
  return { code, name, paper: 'P1', avgMastery, studentsAttempted, totalStudents }
}

const FULL: BlindspotInput[] = [
  t('Integration by parts', '9709.3.4', 28, 22),
  t('Vectors in three dimensions', '9709.3.9', 34, 19),
  t('Differential equations', '9709.3.7', 37, 6), // weak, but thin evidence
  t('Binomial expansion', '9709.1.6', 46, 24),
  t('Trigonometric identities', '9709.3.3', 58, 26),
  t('Logarithms and exponentials', '9709.1.2', 64, 21),
  t('Quadratics', '9709.1.1', 79, 27),
  t('Coordinate geometry', '9709.1.3', 84, 25),
]

const THIN: BlindspotInput[] = [
  t('Numerical solution of equations', '9709.3.8', 41, 2, 30),
  t('Complex numbers', '9709.3.10', 52, 3, 30),
]

export default function BlindspotsPreviewPage() {
  return (
    <div className="mx-auto max-w-[900px] px-4 py-10">
      <h1 className="ms-h2 mb-2">Class blindspots</h1>
      <p className="ms-body-2 mb-8 text-[var(--ec-text-secondary)]">
        Fixture states. A class of 28 unless noted.
      </p>

      <p className="ec-eyebrow mb-3">Full class — one topic with thin evidence</p>
      <div className="mb-10">
        <ClassBlindspots classroomId="demo" blindspots={FULL} />
      </div>

      <p className="ec-eyebrow mb-3">
        Everything thin — intervention correctly unavailable
      </p>
      <div className="mb-10">
        <ClassBlindspots classroomId="demo" blindspots={THIN} />
      </div>

      <p className="ec-eyebrow mb-3">No data</p>
      <ClassBlindspots classroomId="demo" blindspots={[]} />
    </div>
  )
}
