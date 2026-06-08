import { Sparkles } from 'lucide-react'
import type { SimpleExplanation } from '@/lib/courses/types'
import { CourseRichText } from '@/components/courses/CourseRichText'

export function CourseSimpleExplanation({ data }: { data: SimpleExplanation }) {
  return (
    <section id="simple-explanation" className="lesson-simple-explanation scroll-mt-28">
      <header className="lesson-simple-explanation-header">
        <Sparkles
          className="lesson-simple-explanation-icon h-5 w-5 shrink-0"
          aria-hidden
        />
        <div>
          <h2 className="lesson-simple-explanation-title">In simple terms</h2>
          <p className="lesson-simple-explanation-subtitle">
            A friendly intro before the formal notes — no jargon, no formulas yet.
          </p>
        </div>
      </header>
      <div className="lesson-simple-explanation-body">
        <CourseRichText content={data.summary} variant="prose" />
      </div>
      {data.analogy ? (
        <aside className="lesson-simple-explanation-analogy">
          <h3 className="lesson-simple-explanation-analogy-title">Think of it like…</h3>
          <CourseRichText content={data.analogy} variant="prose" />
        </aside>
      ) : null}
    </section>
  )
}
