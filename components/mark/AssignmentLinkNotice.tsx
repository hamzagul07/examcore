import Link from 'next/link'
import { markAssignmentNotice, readMarkAssignmentLink } from '@/lib/teacher/assignments/link'

/**
 * Where a mark sent from a teacher's set went: "Linked to <set> — your
 * teacher can see this mark", with the way back to the set; or, when the
 * upload was not the set's item, why it was not added. Nothing when the mark
 * was not sent from a set (or arrived without the server's answer, as on a
 * reconnect) — it never claims a link the server did not confirm.
 *
 * `value` is the `_assignment` block of a single-question mark result or of
 * the whole-paper init response; it is read defensively because it crossed
 * the network. Shared by /mark and WholePaperFlow so both say it the same way.
 */
export function AssignmentLinkNotice({ value }: { value: unknown }) {
  const link = readMarkAssignmentLink(value)
  if (!link) return null
  const notice = markAssignmentNotice(link)
  // When the set could not be checked it is unknown, so the way back is the
  // student's list of sets rather than one set page.
  const setHref = link.assignment_id
    ? `/dashboard/assignments/${encodeURIComponent(link.assignment_id)}`
    : '/dashboard/assignments'
  return (
    <div
      role="status"
      aria-live="polite"
      className={`ec-card flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between ${
        notice.tone === 'linked'
          ? 'border-[var(--ec-brand)]/30'
          : 'border-[var(--ec-banner-warning-border)] bg-[var(--ec-banner-warning-bg)]'
      }`}
    >
      <div className="flex min-w-0 items-start gap-3">
        <span className="ec-ink-stamp ec-ink-stamp--inline shrink-0" aria-hidden>
          {notice.tone === 'linked' ? 'SET' : 'NB'}
        </span>
        <p className="min-w-0 text-sm text-[var(--ec-text-primary)]">{notice.text}</p>
      </div>
      <Link
        href={setHref}
        className="inline-flex min-h-[44px] shrink-0 items-center gap-1.5 text-sm font-semibold text-[var(--ec-brand)]"
      >
        {notice.tone === 'linked' ? 'Back to the set' : link.assignment_id ? 'Open the set' : 'Your sets'}
        <span className="font-mono text-xs font-bold" aria-hidden>
          -&gt;
        </span>
      </Link>
    </div>
  )
}
