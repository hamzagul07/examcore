import Link from 'next/link'
import type { Board } from '@/lib/community/posts'

function submitHref(opts: { subjectCode?: string; board?: Board; kind?: string }) {
  const params = new URLSearchParams()
  if (opts.board) params.set('board', opts.board)
  if (opts.subjectCode) params.set('subject', opts.subjectCode)
  if (opts.kind) params.set('kind', opts.kind)
  const qs = params.toString()
  return qs ? `/community/submit?${qs}` : '/community/submit'
}

export function CreatePostBar({
  subjectCode,
  board,
  signedIn,
}: {
  subjectCode?: string
  board?: Board
  signedIn: boolean
}) {
  const href = submitHref({ subjectCode, board })
  return (
    <div className="rc-create-bar">
      <div className="rc-create-avatar" aria-hidden>✎</div>
      {signedIn ? (
        <Link href={href} className="rc-create-input">
          Create a post…
        </Link>
      ) : (
        <Link href="/auth/signin?next=/community/submit" className="rc-create-input">
          Sign in to create a post…
        </Link>
      )}
      <Link href={href} className="rc-create-go" aria-label="Create post">
        +
      </Link>
    </div>
  )
}
