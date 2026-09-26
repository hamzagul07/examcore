import { MathText } from '@/components/MathText'
import type { AssignmentPrintModel } from '@/lib/teacher/assignments/print-model'
import { LocalTime } from '@/components/teacher/assignments/LocalTime'

function formatMarks(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(1)
}

/**
 * A set as a handout (docs/TEACHER_SYSTEM_SPEC.md §4 `.../assignments/[aid]/print`:
 * AssignmentPrintSheet on `.ec-exam-sheet` + `.ec-scheme-cite`, question text
 * and marks only, footer join code).
 *
 * It reads like an exam paper: title, class and due date, a line for the
 * student's name, instructions, then each item numbered with its marks, its
 * question (maths rendered) and the paper it came from. The mark scheme is
 * never on it — print-model.ts only ever carries question text. The footer
 * has the class code so a student without the class can join from the
 * sheet. `.ms-teacher-print` drops the app chrome and shadows when printed.
 */
export function AssignmentPrintSheet({
  model,
  origin,
  timeZone,
}: {
  model: AssignmentPrintModel
  /** "https://markscheme.app", for the printed join link. */
  origin: string
  timeZone?: string
}) {
  return (
    <article className="ms-teacher-print ec-exam-sheet" aria-labelledby="print-title">
      <header className="ms-teacher-print__head">
        <h1 id="print-title" className="ms-teacher-print__title">
          {model.title}
        </h1>
        <p className="m-0 font-mono text-xs text-[var(--ec-text-secondary)]">
          {model.is_mock ? 'MOCK · ' : ''}
          {model.class_name}
          {model.due_at ? (
            <>
              {' · Due '}
              <LocalTime iso={model.due_at} variant="long" timeZone={timeZone} />
            </>
          ) : null}
          {model.timed_minutes ? ` · ${model.timed_minutes} minutes` : ''}
          {model.total_marks !== null ? ` · ${formatMarks(model.total_marks)} marks` : ''}
        </p>
      </header>

      <p className="mt-4 mb-0 font-mono text-sm text-[var(--ec-text-secondary)]">
        Name ________________________________
      </p>

      {model.instructions ? (
        <p className="mt-4 mb-0 whitespace-pre-line text-[var(--ec-text-primary)]">{model.instructions}</p>
      ) : null}

      {model.items.length === 0 ? (
        <p className="mt-6 text-[var(--ec-text-secondary)]">This set has no items yet.</p>
      ) : (
        <ol className="ms-teacher-print__items mt-2">
          {model.items.map((item) => (
            <li key={item.item_id} className="ms-teacher-print__item">
              {item.marks !== null ? (
                <span className="ms-teacher-print__marks">
                  [{formatMarks(item.marks)}]<span className="sr-only"> marks</span>
                </span>
              ) : null}
              <p className="m-0 leading-relaxed text-[var(--ec-text-primary)]">
                <strong className="mr-2 font-mono">{item.number}.</strong>
                {item.text ? (
                  <MathText text={item.text} />
                ) : (
                  <span className="text-[var(--ec-text-secondary)]">
                    The question text is not in our bank — answer it from the paper
                    {item.reference ? ` (${item.reference})` : ''}.
                  </span>
                )}
              </p>
              {item.reference ? <p className="ec-scheme-cite mb-0">{item.reference}</p> : null}
            </li>
          ))}
        </ol>
      )}

      <footer className="ms-teacher-print__footer">
        {model.join_code && model.join_path ? (
          <>
            Not in the class yet? Join with code <strong>{model.join_code}</strong> at {origin.replace(/^https?:\/\//, '')}
            {model.join_path}
          </>
        ) : (
          model.class_name
        )}
      </footer>
    </article>
  )
}
