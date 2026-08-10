import Link from 'next/link'
import type { VaultQuestionBank } from '@/lib/max/vault-question-bank'

/** Cambridge question bank — attempt, then check against the official mark scheme. */
export function MaxVaultQuestionBank({ bank }: { bank: VaultQuestionBank | null }) {
  if (!bank) return null

  return (
    <section className="ms-vault__section" aria-labelledby="ms-vault-qbank-title">
      <div className="ms-vault__section-head">
        <span className="ec-ink-stamp ec-ink-stamp--inline" aria-hidden>
          QB
        </span>
        <p className="ec-eyebrow mb-0">Cambridge question bank</p>
        <h2 id="ms-vault-qbank-title" className="m-0 text-lg font-bold text-[var(--ec-text-primary)]">
          Sit a question. Check the mark scheme.
        </h2>
      </div>
      <div className="ms-vault__panel ms-vault__panel--blue space-y-4">
        <p className="text-body m-0 text-[var(--ec-text-secondary)]">
          {bank.note} Max pulls real Cambridge papers for{' '}
          <strong className="text-[var(--ec-text-primary)]">{bank.subjectLabel}</strong>
          {bank.questions.some((q) => q.source === 'weakness')
            ? ' — weak topics first when we have your marks.'
            : '.'}
        </p>

        {bank.questions.length > 0 ? (
          <ul className="ms-vault__qbank m-0 list-none pl-0">
            {bank.questions.map((q) => (
              <li key={q.id} className="ms-vault__qbank-card">
                <div className="ms-vault__qbank-meta">
                  <span className="ms-vault__qbank-paper">
                    {q.paperCode} · Q{q.questionNumber}
                    {q.totalMarks != null ? ` · ${q.totalMarks} marks` : ''}
                  </span>
                  <span
                    className={
                      q.source === 'weakness'
                        ? 'ms-vault__qbank-tag ms-vault__qbank-tag--weak'
                        : 'ms-vault__qbank-tag'
                    }
                  >
                    {q.source === 'weakness' ? 'Your gap' : 'Syllabus'}
                  </span>
                </div>
                <p className="ms-vault__qbank-topic m-0">{q.topicLabel}</p>
                {q.stem ? (
                  <p className="ms-vault__qbank-stem m-0">{q.stem}</p>
                ) : (
                  <p className="ms-vault__qbank-stem ms-vault__qbank-stem--muted m-0">
                    {q.reason}
                  </p>
                )}
                <div className="ms-vault__qbank-actions">
                  <Link href={q.attemptHref} className="ec-btn-primary text-sm">
                    Attempt &amp; check scheme →
                  </Link>
                  {q.topicHubHref ? (
                    <Link href={q.topicHubHref} className="ec-btn-ghost text-sm">
                      More on this topic
                    </Link>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-body m-0 text-[var(--ec-text-secondary)]">
            No bank rows yet for this subject. Mark anything once, or browse the full
            Cambridge paper desk below — every mark feeds this shelf.
          </p>
        )}

        <p className="text-caption m-0">
          <Link href={bank.papersHubHref} className="ec-link font-semibold">
            Browse all Cambridge papers for {bank.subjectCode} →
          </Link>
        </p>
      </div>
    </section>
  )
}
