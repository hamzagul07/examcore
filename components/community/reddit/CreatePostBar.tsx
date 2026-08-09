import Link from 'next/link'
import type { Board } from '@/lib/community/posts'
import { buildSignInHref } from '@/lib/auth-redirect'

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
  // Guests: both affordances share the same sign-in URL with return to submit (COM-02).
  const actionHref = signedIn ? href : buildSignInHref(href)
  const label = signedIn ? 'Create a post…' : 'Sign in to create a post…'

  return (
    <div className="rc-create-bar">
      <div className="rc-create-avatar" aria-hidden>
        ✎
      </div>
      <Link href={actionHref} className="rc-create-input">
        {label}
      </Link>
      <Link href={actionHref} className="rc-create-go" aria-label={label}>
        +
      </Link>
    </div>
  )
}
