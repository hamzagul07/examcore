import Link from 'next/link'
import type { TipTestWithStats } from '@/lib/creators/tips'
import { TipTestStatusButton } from '@/components/creators/TipTestStatusButton'

/**
 * A creator's tip tests. Public on the space (active only), managed in the
 * studio (all, with pause/resume and the straight-to-marking link).
 */
export function TipTestList({
  tips,
  handle,
  code,
  manage = false,
}: {
  tips: TipTestWithStats[]
  handle: string
  code: string
  manage?: boolean
}) {
  if (!tips.length) {
    return (
      <p className="ms-cr-empty">
        {manage
          ? 'No tip tests yet. Turn a tip you already posted into a question below — the number you get back is your next video.'
          : `@${handle} hasn’t published a tip test yet.`}
      </p>
    )
  }
  return (
    <div className="ms-cr-tips">
      {tips.map((t) => {
        const href = `/with/${encodeURIComponent(handle)}/${t.slug}`
        const markHref = `/mark?code=${encodeURIComponent(code)}&tip=${t.id}`
        return (
          <article key={t.id} className={`ms-cr-tipcard${t.status === 'paused' ? ' ms-cr-tipcard--paused' : ''}`}>
            <div className="ms-cr-tipcard__head">
              <div className="min-w-0">
                <p className="ms-cr-tip__meta">
                  {t.subjectLabel} · {t.totalMarks} marks
                  {t.status === 'paused' ? ' · paused' : ''}
                </p>
                <h3 className="ms-cr-tipcard__title">
                  <Link href={href}>{t.title}</Link>
                </h3>
              </div>
              {manage ? <TipTestStatusButton id={t.id} status={t.status} /> : null}
            </div>
            <p className="ms-cr-tipcard__tip">{t.tip}</p>
            <div className="ms-cr-tipcard__stats">
              <span>
                <strong>{t.stats.attempts.toLocaleString('en-GB')}</strong> tried it
              </span>
              <span>
                <strong>{t.stats.avgPct === null ? '—' : `${t.stats.avgPct}%`}</strong> average
              </span>
              <span>
                <strong>{t.stats.fullMarks.toLocaleString('en-GB')}</strong> full marks
              </span>
              {manage ? (
                <span className="ms-cr-tipcard__link">
                  Link: <code>{markHref}</code>
                </span>
              ) : (
                <Link href={markHref} className="ec-btn-underline">
                  Try it -&gt;
                </Link>
              )}
            </div>
          </article>
        )
      })}
    </div>
  )
}
