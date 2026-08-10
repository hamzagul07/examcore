import Link from 'next/link'
import type { VaultCourseLesson } from '@/lib/max/vault-exclusives'

/** Weak-topic course path — MarkScheme lessons, not blog roundups. */
export function MaxVaultCoursePath({
  lessons,
  subjectCode,
  subjectName,
}: {
  lessons: VaultCourseLesson[]
  subjectCode: string | null
  subjectName: string | null
}) {
  if (lessons.length === 0 && !subjectCode) return null

  return (
    <section className="ms-vault__section">
      <div className="ms-vault__section-head">
        <span className="ec-ink-stamp ec-ink-stamp--inline" aria-hidden>
          CR
        </span>
        <p className="ec-eyebrow mb-0">Courses · Max path</p>
        <h2 className="m-0 text-lg font-bold text-[var(--ec-text-primary)]">
          Courses that strengthen your weak areas
        </h2>
      </div>
      <div className="ms-vault__panel ms-vault__panel--blue space-y-4">
        <p className="text-body m-0 text-[var(--ec-text-secondary)]">
          {lessons.length > 0
            ? subjectName
              ? `These lessons are already pulled from your weakest ${subjectName} topics. Keep marking — the list gets more precise.`
              : 'These lessons are already pulled from your weakest topics. Keep marking — the list gets more precise.'
            : 'Right now you see the normal syllabus path. Mark questions so Vault can rebuild this list around your real weak spots.'}
        </p>
        <p className="text-caption m-0 text-[var(--ec-text-secondary)]">
          New in courses: <strong className="text-[var(--ec-text-primary)]">learn with live diagrams</strong>.
          Videos are coming soon if reading feels hard.
        </p>
        {lessons.length > 0 ? (
          <ul className="ms-vault__course-grid">
            {lessons.map((l) => (
              <li key={l.href} className="ms-vault__course-card">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-xs font-bold text-[var(--ec-acc-blue)]">
                    {l.topicCode}
                  </span>
                  {l.hasDiagram ? (
                    <span className="ms-vault__pill ms-vault__pill--gold">Learn with diagram</span>
                  ) : null}
                </div>
                <Link href={l.href} className="ec-link mt-1 block text-base font-bold">
                  {l.title}
                </Link>
                <p className="text-caption m-0 mt-1 text-[var(--ec-text-secondary)]">{l.reason}</p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-body m-0 text-[var(--ec-text-secondary)]">
            <Link href="/mark" className="ec-link font-semibold">
              Mark a few questions
            </Link>{' '}
            so we can pin the exact lessons that close your gaps.
          </p>
        )}
        {subjectCode ? (
          <p className="text-caption m-0">
            <Link
              href={`/courses/${encodeURIComponent(subjectCode)}`}
              className="ec-link font-semibold"
            >
              Browse the full {subjectCode} course (diagrams included) →
            </Link>
          </p>
        ) : null}
      </div>
    </section>
  )
}
