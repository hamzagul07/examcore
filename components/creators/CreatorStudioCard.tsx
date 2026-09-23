import Link from 'next/link'

/** Dashboard entry for a signed-in creator — one line, one number, one door. */
export function CreatorStudioCard({
  handle,
  code,
  marked,
}: {
  handle: string
  code: string
  marked: number
}) {
  return (
    <Link href="/creator" className="ms-cr-studio-card" aria-label="Open your creator studio">
      <span className="ms-cr-studio-card__num">{marked.toLocaleString('en-GB')}</span>
      <span>
        <span className="ms-cr-studio-card__title" style={{ display: 'block' }}>
          answers marked with code {code}
        </span>
        <span className="ms-cr-studio-card__sub">
          Creator studio for @{handle}: share kit, where your followers lose marks, gifts left.
        </span>
      </span>
      <span className="ms-cr-studio-card__go" aria-hidden>
        Open -&gt;
      </span>
    </Link>
  )
}
