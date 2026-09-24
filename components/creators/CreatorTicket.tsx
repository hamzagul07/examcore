import Link from 'next/link'
import { creatorMarkPath } from '@/lib/creators/codes'

type Props = {
  handle: string
  code: string
  giftMarks: number
  /** Flat, unrotated variant for dense layouts (the studio, the grid). */
  flat?: boolean
  /** A specimen on the directory page — no live link behind it. */
  example?: boolean
}

/**
 * The code as an object: a ticket with a tear line, the way a real one sits
 * on a desk. The one thing a follower needs to remember is the code, so it is
 * the biggest thing on it.
 */
export function CreatorTicket({ handle, code, giftMarks, flat = false, example = false }: Props) {
  return (
    <aside
      className={`ms-cr-ticket${flat ? ' ms-cr-ticket--flat' : ''}`}
      aria-label={example ? 'Example creator code' : `Creator code ${code}`}
    >
      <div className="ms-cr-ticket__head">
        <span>Creator code</span>
        <span>@{handle}</span>
      </div>
      <p className="ms-cr-ticket__code">{code}</p>
      {giftMarks > 0 ? (
        <p className="ms-cr-ticket__gift">
          <strong>+{giftMarks}</strong> free marks when you sign up
        </p>
      ) : (
        <p className="ms-cr-ticket__gift">Free marking, no account needed</p>
      )}
      <div className="ms-cr-ticket__tear" aria-hidden />
      {example ? (
        <span className="ec-btn-primary ms-cr-ticket__cta" aria-hidden>
          <span className="ms-cr-ticket__cta-text">Get marked with @{handle}</span>
          <span className="font-mono text-[11px] font-bold">-&gt;</span>
        </span>
      ) : (
        <Link href={creatorMarkPath(code)} className="ec-btn-primary ms-cr-ticket__cta">
          <span className="ms-cr-ticket__cta-text">Get marked with @{handle}</span>
          <span className="font-mono text-[11px] font-bold" aria-hidden>
            -&gt;
          </span>
        </Link>
      )}
      <p className="ms-cr-ticket__fine">
        real mark schemes · examiner ink on every mark · your first mark needs no account
      </p>
    </aside>
  )
}
