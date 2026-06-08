import { FlaskConical } from 'lucide-react'
import type { WorkedExampleItem } from '@/lib/courses/lesson-layout'
import { CourseWorkedExampleReveal } from '@/components/courses/CourseWorkedExampleReveal'

export function CourseWorkedExamples({
  examples,
  isMcqPaper,
}: {
  examples: WorkedExampleItem[]
  isMcqPaper?: boolean
}) {
  if (!examples.length) return null

  const heading = examples.length === 1 ? 'Worked example' : 'Worked examples'

  return (
    <section id="worked-examples" className="lesson-worked-examples scroll-mt-28">
      <header className="lesson-worked-examples-header">
        <FlaskConical className="h-5 w-5 shrink-0" aria-hidden />
        <div>
          <h2 className="lesson-worked-examples-title">{heading}</h2>
          <p className="lesson-worked-examples-subtitle">
            See the formulas applied step by step.
          </p>
        </div>
      </header>
      <ol className="lesson-worked-examples-list">
        {examples.map((example, i) => (
          <li key={example.id} id={example.id} className="lesson-worked-examples-item scroll-mt-28">
            <CourseWorkedExampleReveal
              question={example.question}
              solution={example.solution}
              index={examples.length > 1 ? i + 1 : undefined}
              diagrams={example.diagrams}
              isMcqPaper={isMcqPaper}
            />
          </li>
        ))}
      </ol>
    </section>
  )
}
