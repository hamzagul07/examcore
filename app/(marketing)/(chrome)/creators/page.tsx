import Link from 'next/link'
import { createPageMetadata } from '@/lib/seo/metadata'
import { listCreators } from '@/lib/creators/service'
import { creatorSpacePath } from '@/lib/creators/codes'
import { createClient, createServiceClient } from '@/lib/supabase-server'
import { buildSignInHref } from '@/lib/auth-redirect'
import { getCreatorByUserId } from '@/lib/creators/service'
import { CreatorApplyForm, type ApplyState } from '@/components/creators/CreatorApplyForm'
import { CreatorAvatar } from '@/components/creators/CreatorAvatar'
import { CreatorStatTiles } from '@/components/creators/CreatorStatTiles'
import { CreatorTicket } from '@/components/creators/CreatorTicket'
import { PageJsonLd } from '@/components/seo/PageJsonLd'

export const dynamic = 'force-dynamic'

export const metadata = createPageMetadata({
  title: 'Creators — study with the people who got there first',
  description:
    'Study-tips creators on MarkScheme. Each has a space, a code that gives you free marks, and a live count of the answers their followers got marked against real mark schemes.',
  path: '/creators',
})

export default async function CreatorsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  let applyState: ApplyState = 'none'
  if (user) {
    const seat = await getCreatorByUserId(user.id)
    if (seat) applyState = 'seat'
    else {
      const { data: app } = await createServiceClient()
        .from('creator_applications')
        .select('status')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      const status = (app?.status as string | undefined) ?? null
      applyState = status === 'pending' || status === 'approved' || status === 'declined' ? status : 'none'
    }
  }
  const creators = await listCreators()
  const totalMarked = creators.reduce((sum, c) => sum + c.stats.marked, 0)
  const totalJoined = creators.reduce((sum, c) => sum + c.stats.joined, 0)

  return (
    <div className="ms-cr-page">
      <PageJsonLd
        path="/creators"
        title="Creators on MarkScheme"
        description="Study-tips creators with a space, a code and a live count of the answers their followers got marked."
        breadcrumbs={[
          { name: 'Home', path: '/' },
          { name: 'Creators', path: '/creators' },
        ]}
      />
      <section className="ms-cr-hero" aria-labelledby="creators-title">
        <div className="ms-cr-hero__copy">
          <div className="ms-cr-hero__kicker">
            <span className="ms-cr-badge">Creators</span>
            <span>Study with the people who got there first</span>
          </div>
          <h1 id="creators-title" className="ms-cr-hero__name">
            Their tips. <em>Your marks.</em>
          </h1>
          <p className="ms-cr-hero__tagline">
            The creators whose revision tips you already watch have a space here. Use their code,
            get your answer marked against the real mark scheme, and every mark counts for them —
            and they get to see which marks their followers keep dropping.
          </p>
          <div className="ms-cr-links">
            <Link
              href="#become"
              className="ec-btn-primary inline-flex min-h-[44px] items-center gap-2 px-5"
            >
              Get your own space
            </Link>
            <Link href="/mark" className="ec-btn-ghost inline-flex min-h-[44px] items-center px-5">
              Just get marked
            </Link>
          </div>
        </div>
        <CreatorTicket handle="you" code="YOURCODE" giftMarks={5} example />
      </section>

      {creators.length ? (
        <CreatorStatTiles
          items={[
            { num: creators.length, label: 'Creators', sub: 'with a live space' },
            {
              num: totalMarked,
              label: 'Answers marked',
              sub: 'through creator codes',
              accent: true,
            },
            { num: totalJoined, label: 'Students joined', sub: 'through a creator' },
          ]}
        />
      ) : null}

      <section className="ms-cr-section" aria-labelledby="creators-list">
        <div className="ms-cr-section__head">
          <h2 id="creators-list" className="ms-cr-section__title">
            Creators with a space
          </h2>
          <span className="ms-cr-section__note">most answers marked first</span>
        </div>
        {creators.length ? (
          <div className="ms-cr-grid">
            {creators.map((c) => (
              <Link key={c.userId} href={creatorSpacePath(c.handle)} className="ms-cr-card">
                <div className="ms-cr-card__head">
                  <CreatorAvatar name={c.displayName} />
                  <div className="min-w-0">
                    <p className="ms-cr-card__name">{c.displayName}</p>
                    <p className="ms-cr-card__handle">@{c.handle}</p>
                  </div>
                </div>
                {c.tagline ? <p className="ms-cr-card__tagline">{c.tagline}</p> : null}
                <div className="ms-cr-card__stat">
                  <span className="ms-cr-card__num">
                    {c.stats.marked.toLocaleString('en-GB')}
                  </span>
                  <span className="ms-cr-card__statlabel">answers marked</span>
                </div>
                <span className="ms-cr-card__code">
                  code {c.code}
                  {c.giftMarks > 0 ? ` · +${c.giftMarks} marks` : ''}
                </span>
              </Link>
            ))}
          </div>
        ) : (
          <p className="ms-cr-empty">
            The first creators are being set up now. If you make study content, the space below
            is yours to ask for.
          </p>
        )}
      </section>

      <section className="ms-cr-section" id="become" aria-labelledby="creators-become">
        <div className="ms-cr-section__head">
          <h2 id="creators-become" className="ms-cr-section__title">
            Get a space of your own
          </h2>
          <span className="ms-cr-section__note">for study-tips creators, any size</span>
        </div>
        <ol className="ms-cr-steps">
          <li className="ms-cr-step">
            <span className="ms-cr-step__num">01</span>
            <p className="ms-cr-step__title">A space and a code</p>
            <p className="ms-cr-step__body">
              markscheme.app/with/you, a code you can say out loud, and a live count of every
              answer your followers get marked — guests included.
            </p>
          </li>
          <li className="ms-cr-step">
            <span className="ms-cr-step__num">02</span>
            <p className="ms-cr-step__title">Gifts you hand out</p>
            <p className="ms-cr-step__body">
              Your code gives followers free marks. You are giving your audience something, not
              selling them something. Plus a free creator seat for your own marking.
            </p>
          </li>
          <li className="ms-cr-step">
            <span className="ms-cr-step__num">03</span>
            <p className="ms-cr-step__title">A number nobody else can give you</p>
            <p className="ms-cr-step__body">
              After 50 marked answers you see the one mark most of your followers drop, with the
              examiner&apos;s most common note. That is your next video.
            </p>
          </li>
        </ol>
        <div className="mt-6">
          <CreatorApplyForm
            signedIn={!!user}
            signInHref={buildSignInHref('/creators#become')}
            state={applyState}
          />
        </div>
      </section>

      <section className="ms-cr-section" aria-labelledby="creators-faq">
        <h2 id="creators-faq" className="ms-cr-section__title" style={{ marginBottom: 14 }}>
          Straight answers
        </h2>
        <dl className="ms-tool-faq">
          <div>
            <dt>Do I need a big following?</dt>
            <dd>
              No. The program is built for small study accounts; a creator with 2,000 engaged
              followers who actually mark answers matters more to us than a big one who does not.
            </dd>
          </div>
          <div>
            <dt>Is there money?</dt>
            <dd>
              Product and recognition first: a free seat, gift marks for your followers, a
              certificate at 500 answers, features on our channels. Paid video briefs come later
              and only for creators aged 18 or over.
            </dd>
          </div>
          <div>
            <dt>What do you see about my followers?</dt>
            <dd>
              Only aggregates — how many answers, and which mark types they drop. Never a name,
              never a script. Your followers see the same numbers you do.
            </dd>
          </div>
        </dl>
      </section>
    </div>
  )
}
