'use client'

import Link from 'next/link'
import { buildSignUpHref } from '@/lib/auth-redirect'
import { buildMarkReturnPath } from '@/lib/exam-systems/paths'
import { CREATOR_CODE_PARAM, creatorSpacePath } from '@/lib/creators/codes'
import type { MarkCreator } from '@/components/creators/CreatorCodeChip'
import { CreatorAvatar } from '@/components/creators/CreatorAvatar'

/**
 * Under the score, when the answer was marked with a creator code: the
 * creator gets their name back on the result, and a guest gets the one
 * signup ask that is specific to them — the code, and the marks it carries.
 */
export function PostMarkCreatorCard({
  creator,
  tipTitle = null,
  signedIn,
  markBoard,
  subjectCode,
}: {
  creator: MarkCreator
  /** The tip test this answer was written for, when there was one. */
  tipTitle?: string | null
  signedIn: boolean
  markBoard?: string | null
  subjectCode?: string | null
}) {
  const returnPath = buildMarkReturnPath({ board: markBoard ?? null, subject: subjectCode ?? null })
  const base = buildSignUpHref(returnPath)
  const signupHref = `${base}${base.includes('?') ? '&' : '?'}${CREATOR_CODE_PARAM}=${encodeURIComponent(creator.code)}`

  return (
    <aside className="ms-cr-postmark" aria-label={`Marked with @${creator.handle}`}>
      <div className="ms-cr-postmark__head">
        <CreatorAvatar name={creator.displayName} />
        <div className="min-w-0">
          <p className="ms-cr-postmark__overline">Marked with @{creator.handle}</p>
          <p className="ms-cr-postmark__title">
            This answer just counted for <strong>{creator.displayName}</strong>
            {tipTitle ? (
              <>
                {' '}
                — and for the tip &ldquo;{tipTitle}&rdquo;
              </>
            ) : null}
            .
          </p>
        </div>
        <span className="ms-cr-card__code" aria-hidden>
          code {creator.code}
        </span>
      </div>
      {signedIn ? (
        <p className="ms-cr-postmark__body">
          Every answer you get marked with the code shows up on their space — as a number, never
          as your script.
        </p>
      ) : (
        <p className="ms-cr-postmark__body">
          Sign up with code <strong>{creator.code}</strong>
          {creator.giftMarks > 0 ? (
            <>
              {' '}
              and <strong>+{creator.giftMarks} free marks</strong> land on your account
            </>
          ) : null}
          . This mark comes with you.
        </p>
      )}
      <div className="ms-cr-postmark__actions">
        {signedIn ? (
          <Link
            href={creatorSpacePath(creator.handle)}
            className="ec-btn-secondary inline-flex min-h-[44px] items-center px-4"
          >
            Back to @{creator.handle}&apos;s space
          </Link>
        ) : (
          <>
            <Link
              href={signupHref}
              className="ec-btn-primary inline-flex min-h-[44px] items-center gap-2 px-4"
            >
              Sign up with code {creator.code}
              <span className="font-mono text-[11px] font-bold" aria-hidden>
                -&gt;
              </span>
            </Link>
            <Link href={creatorSpacePath(creator.handle)} className="ec-btn-underline">
              @{creator.handle}&apos;s space
            </Link>
          </>
        )}
      </div>
    </aside>
  )
}
