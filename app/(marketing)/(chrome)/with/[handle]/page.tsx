import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createPageMetadata } from '@/lib/seo/metadata'
import {
  getAudienceGapReport,
  getCreatorByHandle,
  getCreatorStats,
} from '@/lib/creators/service'
import { creatorMarkPath, creatorSpacePath } from '@/lib/creators/codes'
import { headlineGap } from '@/lib/teacher/cohort-gaps'
import { isCommunityEnabled } from '@/lib/community/enabled'
import { listPosts } from '@/lib/community/posts'
import { communityPostHref } from '@/lib/community/post-url'
import { CreatorAvatar } from '@/components/creators/CreatorAvatar'
import { CreatorLinks } from '@/components/creators/CreatorLinks'
import { CreatorStatTiles } from '@/components/creators/CreatorStatTiles'
import { CreatorTicket } from '@/components/creators/CreatorTicket'

export const dynamic = 'force-dynamic'

type Props = { params: Promise<{ handle: string }> }

export async function generateMetadata({ params }: Props) {
  const { handle } = await params
  const creator = await getCreatorByHandle(handle)
  if (!creator) return {}
  const gift =
    creator.giftMarks > 0 ? `${creator.giftMarks} free marks` : 'free marking'
  return createPageMetadata({
    title: `Study with ${creator.displayName} (@${creator.handle})`,
    description: `${creator.displayName}'s space on MarkScheme. Use code ${creator.code} for ${gift}: your answer marked against the real mark scheme with examiner-style feedback, no account needed for the first one.`,
    path: creatorSpacePath(creator.handle),
    ogImagePath: `/api/og/creator/${encodeURIComponent(creator.handle)}`,
  })
}

export default async function CreatorSpacePage({ params }: Props) {
  const { handle } = await params
  const creator = await getCreatorByHandle(handle)
  if (!creator) notFound()

  const [stats, report, posts] = await Promise.all([
    getCreatorStats(creator),
    getAudienceGapReport(creator.code),
    isCommunityEnabled()
      ? listPosts({ authorId: creator.userId, sort: 'new', limit: 6 })
      : Promise.resolve([]),
  ])
  const gap = headlineGap(report)
  const since = new Date(creator.since).toLocaleDateString('en-GB', {
    month: 'long',
    year: 'numeric',
  })

  return (
    <div className="ms-cr-page">
      <section className="ms-cr-hero" aria-labelledby="creator-name">
        <div className="ms-cr-hero__copy">
          <div className="ms-cr-hero__kicker">
            <span className="ms-cr-badge">
              <span aria-hidden>✓</span> MarkScheme creator
            </span>
            <span>Study with</span>
          </div>
          <div className="mt-4 flex items-center gap-4">
            <CreatorAvatar name={creator.displayName} size="lg" />
            <div className="min-w-0">
              <h1 id="creator-name" className="ms-cr-hero__name" style={{ margin: 0 }}>
                {creator.displayName}
              </h1>
              <p className="ms-cr-hero__handle">
                @{creator.handle} · here since {since}
              </p>
            </div>
          </div>
          <p className="ms-cr-hero__tagline">
            {creator.tagline ??
              'Exam tips that get marks — and a way to check they work. Answer a question, get marked against the real mark scheme, see exactly where the marks went.'}
          </p>
          <CreatorLinks links={creator.links} />
        </div>
        <CreatorTicket handle={creator.handle} code={creator.code} giftMarks={creator.giftMarks} />
      </section>

      <CreatorStatTiles
        items={[
          {
            num: stats.marked,
            label: 'Answers marked',
            sub: `with code ${creator.code}`,
            accent: true,
          },
          { num: stats.joined, label: 'Students joined', sub: 'signed up through this space' },
          { num: stats.markedThisMonth, label: 'This month', sub: 'answers marked' },
        ]}
      />

      {gap ? (
        <section className="ms-cr-section" aria-labelledby="creator-gap">
          <div className="ms-cr-section__head">
            <h2 id="creator-gap" className="ms-cr-section__title">
              Where @{creator.handle}&apos;s followers lose marks
            </h2>
            <span className="ms-cr-section__note">
              {report.scripts.toLocaleString('en-GB')} marked answers
            </span>
          </div>
          <div className="ms-cr-gap">
            <p className="ms-cr-gap__headline">
              Most of you drop the <em>{gap.label}</em> marks — only {gap.earnedPct}% earned.
            </p>
            <p className="ms-cr-gap__sub">
              An aggregate over every answer marked with the code. Nobody&apos;s script is shown to
              anyone, including @{creator.handle}.
            </p>
          </div>
        </section>
      ) : null}

      <section className="ms-cr-section" aria-labelledby="creator-how">
        <div className="ms-cr-section__head">
          <h2 id="creator-how" className="ms-cr-section__title">
            How it works
          </h2>
          <span className="ms-cr-section__note">about 90 seconds</span>
        </div>
        <ol className="ms-cr-steps">
          <li className="ms-cr-step">
            <span className="ms-cr-step__num">01</span>
            <p className="ms-cr-step__title">Answer a question</p>
            <p className="ms-cr-step__body">
              Type it or photograph your handwriting. Cambridge, IB, Edexcel — pick a past paper
              or paste your own question.
            </p>
          </li>
          <li className="ms-cr-step">
            <span className="ms-cr-step__num">02</span>
            <p className="ms-cr-step__title">Get marked</p>
            <p className="ms-cr-step__body">
              The real mark scheme, with examiner-style ink on every mark point you earned or
              dropped. No account needed the first time.
            </p>
          </li>
          <li className="ms-cr-step">
            <span className="ms-cr-step__num">03</span>
            <p className="ms-cr-step__title">Keep the code</p>
            <p className="ms-cr-step__body">
              Sign up with code {creator.code}
              {creator.giftMarks > 0 ? ` for +${creator.giftMarks} free marks` : ''}. Every
              answer you get marked counts for @{creator.handle}.
            </p>
          </li>
        </ol>
      </section>

      <section className="ms-cr-section" aria-labelledby="creator-tips">
        <div className="ms-cr-section__head">
          <h2 id="creator-tips" className="ms-cr-section__title">
            Tips from @{creator.handle}
          </h2>
          {posts.length ? (
            <Link href={`/u/${creator.handle}`} className="ec-btn-underline">
              All posts →
            </Link>
          ) : null}
        </div>
        {posts.length ? (
          <div className="ms-cr-tips">
            {posts.map((post) => (
              <Link key={post.id} href={communityPostHref(post)} className="ms-cr-tip">
                <span className="ms-cr-tip__meta">
                  {post.subjectCode}
                  {post.flair ? ` · ${post.flair}` : ''} ·{' '}
                  {new Date(post.createdAt).toLocaleDateString('en-GB', {
                    day: 'numeric',
                    month: 'short',
                  })}
                </span>
                <span className="ms-cr-tip__title" style={{ display: 'block' }}>
                  {post.title}
                </span>
              </Link>
            ))}
          </div>
        ) : (
          <p className="ms-cr-empty">
            @{creator.handle}&apos;s tips land here as they post them in the Exam Room. Until
            then, the code above is the tip.
          </p>
        )}
      </section>

      <section className="ms-cr-section text-center">
        <Link
          href={creatorMarkPath(creator.code)}
          className="ec-btn-primary inline-flex min-h-[52px] items-center gap-2 px-6"
        >
          Get marked with @{creator.handle}
          <span className="font-mono text-[11px] font-bold" aria-hidden>
            -&gt;
          </span>
        </Link>
        <p className="ms-cr-section__note" style={{ marginTop: 14 }}>
          Have an audience of your own?{' '}
          <Link href="/creators" className="ec-btn-underline">
            Get a space like this
          </Link>
        </p>
      </section>
    </div>
  )
}
