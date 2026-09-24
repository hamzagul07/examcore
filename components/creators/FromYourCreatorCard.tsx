import Link from 'next/link'
import { creatorMarkPath, creatorSpacePath } from '@/lib/creators/codes'
import { CreatorAvatar } from '@/components/creators/CreatorAvatar'

/**
 * On the dashboard of a student who joined through a creator: the creator's
 * name, their latest post, and the code — the "guide their students" half of
 * the program, kept to one card.
 */
export function FromYourCreatorCard({
  handle,
  displayName,
  code,
  latestPost,
}: {
  handle: string
  displayName: string
  code: string
  latestPost: { title: string; href: string } | null
}) {
  return (
    <aside className="ms-cr-mine" aria-label={`Your creator, @${handle}`}>
      <CreatorAvatar name={displayName} />
      <div className="min-w-0 flex-1">
        <p className="ms-cr-postmark__overline">Your creator</p>
        <p className="ms-cr-mine__title">
          You joined through <strong>@{handle}</strong>. Every answer you get marked counts for
          them.
        </p>
        {latestPost ? (
          <p className="ms-cr-mine__tip">
            Latest from {displayName}:{' '}
            <Link href={latestPost.href} className="ec-btn-underline">
              {latestPost.title}
            </Link>
          </p>
        ) : null}
      </div>
      <div className="ms-cr-mine__actions">
        <Link href={creatorMarkPath(code)} className="ec-btn-secondary inline-flex min-h-[40px] items-center px-3">
          Mark with {code}
        </Link>
        <Link href={creatorSpacePath(handle)} className="ms-cr-studio-card__go">
          Space -&gt;
        </Link>
      </div>
    </aside>
  )
}
