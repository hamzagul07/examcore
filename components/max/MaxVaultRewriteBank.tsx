import Link from 'next/link'
import type { FullMarksModel } from '@/lib/max/vault-data'

/** Inline rewrite bank with snippets + beat-your-model rematch. */
export function MaxVaultRewriteBank({ models }: { models: FullMarksModel[] }) {
  return (
    <section className="ms-vault__section">
      <div className="ms-vault__section-head">
        <span className="ec-ink-stamp ec-ink-stamp--inline" aria-hidden>
          A*
        </span>
        <p className="ec-eyebrow mb-0">Rewrite bank</p>
        <h2 className="m-0 text-lg font-bold text-[var(--ec-text-primary)]">
          Your full-marks models
        </h2>
      </div>
      <div className="ms-vault__panel ms-vault__panel--brand space-y-4">
        {models.length > 0 ? (
          <ul className="m-0 grid list-none gap-3 pl-0 sm:grid-cols-2">
            {models.map((m) => (
              <li key={m.attemptId} className="ms-vault__model ms-vault__model--rich">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <Link
                    href={`/dashboard/attempt/${m.attemptId}`}
                    className="ec-link font-semibold"
                  >
                    {m.label}
                  </Link>
                  <span className="ms-vault__model-score">
                    {m.marksEarned}/{m.totalMarks}
                    {m.subjectCode ? ` · ${m.subjectCode}` : ''}
                  </span>
                </div>
                {m.rewriteSnippet ? (
                  <p className="ms-vault__rewrite-snippet">
                    “{m.rewriteSnippet}
                    {m.rewriteSnippet.length >= 160 ? '…' : ''}”
                  </p>
                ) : null}
                {m.annotationCount > 0 ? (
                  <p className="text-caption m-0 text-[var(--ec-text-secondary)]">
                    {m.annotationCount} examiner annotation
                    {m.annotationCount === 1 ? '' : 's'}
                  </p>
                ) : null}
                <div className="ms-vault__model-actions">
                  <Link
                    href={`/dashboard/attempt/${m.attemptId}`}
                    className="ec-btn-ghost text-sm"
                  >
                    Read full rewrite
                  </Link>
                  {m.beatHref ? (
                    <Link href={m.beatHref} className="ec-btn-primary text-sm">
                      Beat this model →
                    </Link>
                  ) : (
                    <Link
                      href={`/dashboard/attempt/${m.attemptId}`}
                      className="ec-btn-primary text-sm"
                    >
                      Rematch from attempt →
                    </Link>
                  )}
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-body m-0 text-[var(--ec-text-secondary)]">
            Mark questions where you lose marks — Max saves the annotated full-marks
            rewrite of <em>your</em> script here. Then come back and beat the model.
          </p>
        )}
      </div>
    </section>
  )
}
