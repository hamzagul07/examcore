import Link from 'next/link'

export function CreatePostBar({ subjectCode, signedIn }: { subjectCode?: string; signedIn: boolean }) {
  const href = subjectCode ? `/community/submit?subject=${subjectCode}` : '/community/submit'
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
