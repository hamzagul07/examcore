import Link from 'next/link'
import { ArrowRight } from 'lucide-react'

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
      className={`mt-8 flex flex-wrap items-center justify-between gap-4 ec-card border border-[var(--ec-border)] px-5 py-4 ${className}`.trim()}
      aria-label="Edexcel International A Level — wrong board rescue"
    >
      <p className="ms-body-2" style={{ margin: 0, maxWidth: 520 }}>
        {body}
      </p>
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
          Mark WMA11 <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </aside>
  )
}
