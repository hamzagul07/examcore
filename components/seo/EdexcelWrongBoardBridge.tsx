import Link from 'next/link'

type EdexcelWrongBoardBridgeProps = {
  /** Short context line — defaults to Results Day wrong-board copy. */
  body?: string
  className?: string
}

/**
 * Cambridge-traffic rescue: IAL students land on CAIE tools during Results week.
 * Keep links on live SEO + mark surfaces only (no new dialects).
 */
export function EdexcelWrongBoardBridge({
  body = 'Sitting Edexcel International, not Cambridge? IAL Maths grades cash in via UMS across units (WMA11…) — not a 9709 threshold table.',
  className = '',
}: EdexcelWrongBoardBridgeProps) {
  return (
    <aside
      className={`mt-8 flex flex-wrap items-center justify-between gap-4 ec-card ec-card--paper border border-[var(--ec-border)] px-5 py-4 ${className}`.trim()}
      aria-label="Edexcel International A Level — wrong board rescue"
    >
      <div className="min-w-0 max-w-[520px]">
        <span
          className="inline-grid h-6 min-w-6 place-items-center rounded border border-[var(--ec-brand-border)] bg-[var(--ec-brand-muted)] px-1.5 font-mono text-[10px] font-bold tracking-wide text-[var(--ec-brand)]"
          aria-hidden
        >
          IAL
        </span>
        <p className="ms-body-2 mt-2" style={{ marginBottom: 0 }}>
          {body}
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Link
          href="/blog/edexcel-ial-maths-grade-boundaries-ums-2026"
          className="ec-btn-secondary ec-btn-secondary--sm"
        >
          IAL UMS explainer
        </Link>
        <Link
          href="/results-2026/edexcel"
          className="ec-btn-ghost ec-btn-ghost--sm"
        >
          Edexcel results hub
        </Link>
        <Link
          href="/mark?board=edexcel&subject=WMA11"
          className="ec-btn-primary ec-btn-primary--sm"
        >
          Mark WMA11 <span className="h-4 w-4" aria-hidden>-&gt;</span>
        </Link>
      </div>
    </aside>
  )
}
