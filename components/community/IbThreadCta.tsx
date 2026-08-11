import 'server-only'

import Link from 'next/link'

type Props = {
  /** Frontmatter subject — a base slug like `chemistry` or `maths-aa`. */
  subject: string
  /** Where the block sits, so the click log can tell guides apart. */
  source: string
  className?: string
}

/**
 * Sends an IB reader from an IA-ideas guide into the thread for their subject.
 *
 * The guides answer "what could I do my IA on" and then stop, which is exactly
 * where the useful part starts: whether the specific question you have landed
 * on will survive the word count. A list of ideas cannot tell you that and a
 * room of people doing the same IA can.
 *
 * Deliberately narrow copy. "Join our community" gets ignored; "post your
 * question and we will tell you if it is workable" is a thing somebody wants
 * done to them at exactly this moment.
 */
export function IbThreadCta({ subject, source, className = '' }: Props) {
  const href = `/community/thread/${encodeURIComponent(subject)}?utm_source=${encodeURIComponent(
    source
  )}&utm_medium=internal&utm_campaign=ib-ia`

  return (
    <aside
      className={`ms-results-day-banner ms-results-day-banner--paper ${className}`.trim()}
      aria-label="IB internal assessment thread"
    >
      <div className="ms-results-day-banner__stamp" aria-hidden="true">
        <span className="ms-results-day-banner__stamp-code">IA</span>
        <span className="ms-results-day-banner__stamp-label">thread</span>
      </div>
      <div className="ms-results-day-banner__body">
        <p className="ms-overline" style={{ color: 'var(--ec-brand)', marginBottom: 6 }}>
          Community · IA thread
        </p>
        <h2 className="ms-h3" style={{ fontSize: '1.1rem', margin: 0 }}>
          Got a question in mind? Find out whether it actually works.
        </h2>
        <p className="ms-body-2" style={{ marginTop: 8, marginBottom: 0, maxWidth: 640 }}>
          Ideas are the easy part. Post the question you are considering and get told
          honestly whether it is too broad, whether the data exists, and whether it will
          hold
          up over the full write-up — while changing it is still cheap.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {/* prefetch={false}: this href is a route handler that reads the
              database and logs the click, so the default would fire it for
              every reader who merely scrolled past. */}
          <Link href={href} prefetch={false} className="ec-btn-primary ec-btn-primary--sm">
            Post your question
            <span className="h-4 w-4" aria-hidden>-&gt;</span>
          </Link>
          <Link href="/community" className="ec-btn-ghost ec-btn-ghost--sm">
            Browse the community
          </Link>
        </div>
      </div>
    </aside>
  )
}
