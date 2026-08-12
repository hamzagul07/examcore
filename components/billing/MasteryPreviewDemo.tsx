import { deriveDemoDashboard } from '@/lib/demo/derive'
import { DEMO_STUDENT, DEMO_SUBJECT_CODE } from '@/lib/demo/student'
import { SyllabusCoverage } from '@/components/progress/SyllabusCoverage'
import { GradeTrajectory } from '@/components/progress/GradeTrajectory'
import { MasteryMatrix } from '@/components/progress/MasteryMatrix'

/**
 * What sits behind the mastery lock for someone who has marked nothing.
 *
 * The teaser used to blur whatever the page passed it, which for a free account
 * with no attempts is the *empty* state — so the lock was covering three
 * placeholder panels and the reader learned nothing about what they were being
 * asked to pay for. This renders the seeded student instead, using the same
 * derivation the real dashboard runs, so the shape under the blur is a real
 * mastery map with real topic names and a real trajectory.
 *
 * A student who has marked something keeps seeing their own data behind the
 * lock — theirs is always more persuasive than ours, and swapping it for a
 * stranger's would be both worse copy and mildly dishonest. See the branch in
 * app/dashboard/progress/page.tsx.
 */
export function MasteryPreviewDemo() {
  const d = deriveDemoDashboard()

  return (
    <div className="space-y-5">
      <SyllabusCoverage
        masteries={d.masteries}
        coverage={d.coverage}
        hasAnyData
        subjectLabel={d.subjectLine}
        totalTopics={d.totalTopics}
      />
      <GradeTrajectory
        attempts={d.attempts}
        prediction={d.prediction}
        ibMode={false}
        targetGrade={DEMO_STUDENT.targetGrade}
      />
      <MasteryMatrix
        parentMasteries={d.parentMasteries}
        attempts={d.attempts}
        hasAnyData
        subjectCode={DEMO_SUBJECT_CODE}
        subjectLabel={DEMO_STUDENT.subjectLabel}
      />
    </div>
  )
}
