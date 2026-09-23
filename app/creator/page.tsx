import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import { SITE_URL } from '@/lib/site-config'
import {
  getAudienceGapReport,
  getCreatorByUserId,
  getCreatorStats,
  listCreatorDailyMarked,
  listRecentCreatorRuns,
} from '@/lib/creators/service'
import {
  buildShareKit,
  CREATOR_MILESTONES,
  creatorMarkPath,
  creatorSpacePath,
  nextMilestone,
} from '@/lib/creators/codes'
import { countCreatorConversions } from '@/lib/creators/conversions'
import { createServiceClient } from '@/lib/supabase-server'
import { CreatorAvatar } from '@/components/creators/CreatorAvatar'
import { CreatorGapReport } from '@/components/creators/CreatorGapReport'
import { CreatorShareKit } from '@/components/creators/CreatorShareKit'
import { CreatorSparkline } from '@/components/creators/CreatorSparkline'
import { CreatorStatTiles } from '@/components/creators/CreatorStatTiles'
import { CreatorTicket } from '@/components/creators/CreatorTicket'

export const dynamic = 'force-dynamic'

function NotACreator() {
  return (
    <main className="app-shell ms-cr-page">
      <div className="ms-cr-hero" style={{ gridTemplateColumns: '1fr' }}>
        <div className="ms-cr-hero__copy">
          <div className="ms-cr-hero__kicker">
            <span className="ms-cr-badge ms-cr-badge--paused">Creator studio</span>
          </div>
          <h1 className="ms-cr-hero__name">
            No creator seat <em>yet</em>
          </h1>
          <p className="ms-cr-hero__tagline">
            Creator spaces are set up by hand for people who make study content. If that is you,
            ask for one and it appears here with your code, your share kit and your numbers.
          </p>
          <div className="ms-cr-links">
            <Link
              href="/creators#become"
              className="ec-btn-primary inline-flex min-h-[44px] items-center px-5"
            >
              Ask for a space
            </Link>
            <Link href="/dashboard" className="ec-btn-ghost inline-flex min-h-[44px] items-center px-5">
              Back to your desk
            </Link>
          </div>
        </div>
      </div>
    </main>
  )
}

export default async function CreatorStudioPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/auth/signin?next=%2Fcreator')

  const creator = await getCreatorByUserId(user.id)
  if (!creator) return <NotACreator />

  const [stats, report, runs, daily, paid] = await Promise.all([
    getCreatorStats(creator),
    getAudienceGapReport(creator.code),
    listRecentCreatorRuns(creator.code, 12),
    listCreatorDailyMarked(creator.code, 30),
    countCreatorConversions(createServiceClient(), creator.userId),
  ])
  const ogPath = `/api/og/creator/${encodeURIComponent(creator.handle)}`
  const kit = buildShareKit({
    handle: creator.handle,
    code: creator.code,
    giftMarks: creator.giftMarks,
    siteUrl: SITE_URL,
  })
  const next = nextMilestone(stats.marked)
  const giftLeft = Math.max(0, stats.giftPoolMonthly - stats.giftClaimedThisMonth)

  return (
    <main className="app-shell ms-cr-page">
      <section className="ms-cr-hero" aria-labelledby="studio-title">
        <div className="ms-cr-hero__copy">
          <div className="ms-cr-hero__kicker">
            <span
              className={`ms-cr-badge${creator.status === 'paused' ? ' ms-cr-badge--paused' : ''}`}
            >
              {creator.status === 'paused' ? 'Seat paused' : 'Creator studio'}
            </span>
            <span>Study with @{creator.handle}</span>
          </div>
          <div className="mt-4 flex items-center gap-4">
            <CreatorAvatar name={creator.displayName} size="lg" />
            <div className="min-w-0">
              <h1 id="studio-title" className="ms-cr-hero__name" style={{ margin: 0 }}>
                {creator.displayName}
              </h1>
              <p className="ms-cr-hero__handle">{kit.link.replace(/^https?:\/\//, '')}</p>
            </div>
          </div>
          <p className="ms-cr-hero__tagline">
            {next
              ? `${next.remaining.toLocaleString('en-GB')} more marked answers to “${next.label}”.`
              : 'Every milestone reached. Your followers are marking.'}
          </p>
          <div className="ms-cr-links">
            <Link
              href={creatorSpacePath(creator.handle)}
              className="ec-btn-primary inline-flex min-h-[44px] items-center px-5"
            >
              View your space
            </Link>
            <Link
              href={creatorMarkPath(creator.code)}
              className="ec-btn-ghost inline-flex min-h-[44px] items-center px-5"
            >
              Mark something yourself
            </Link>
          </div>
        </div>
        <CreatorTicket handle={creator.handle} code={creator.code} giftMarks={creator.giftMarks} />
      </section>

      <CreatorStatTiles
        five
        items={[
          {
            num: stats.marked,
            label: 'Answers marked',
            sub: `${stats.markedThisMonth.toLocaleString('en-GB')} this month`,
            accent: true,
          },
          { num: stats.guestAnswers, label: 'As guests', sub: 'no account, still counted' },
          { num: stats.students, label: 'Students', sub: 'signed in and marking' },
          {
            num: stats.joined,
            label: 'Joined',
            sub: paid > 0 ? `${paid} went paid` : 'signed up through you',
          },
          {
            num: giftLeft,
            label: 'Gifts left',
            sub: `of ${stats.giftPoolMonthly} marks this month`,
          },
        ]}
      />

      <section className="ms-cr-section" aria-labelledby="studio-daily">
        <div className="ms-cr-section__head">
          <h2 id="studio-daily" className="ms-cr-section__title">
            Last 30 days
          </h2>
          <span className="ms-cr-section__note">answers marked with {creator.code}, per day</span>
        </div>
        <CreatorSparkline data={daily} handle={creator.handle} />
      </section>

      <section className="ms-cr-section" aria-labelledby="studio-milestones">
        <div className="ms-cr-section__head">
          <h2 id="studio-milestones" className="ms-cr-section__title">
            Milestones
          </h2>
          <span className="ms-cr-section__note">product and recognition, never cash</span>
        </div>
        <div className="ms-cr-milestones">
          {CREATOR_MILESTONES.map((m) => (
            <div
              key={m.at}
              className={`ms-cr-milestone${stats.marked >= m.at ? ' ms-cr-milestone--done' : ''}`}
            >
              <p className="ms-cr-milestone__at">
                {stats.marked >= m.at ? '✓ ' : ''}
                {m.at.toLocaleString('en-GB')} marked
              </p>
              <p className="ms-cr-milestone__label">{m.label}</p>
              <p className="ms-cr-milestone__detail">{m.detail}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="ms-cr-section" aria-labelledby="studio-gap">
        <div className="ms-cr-section__head">
          <h2 id="studio-gap" className="ms-cr-section__title">
            Where your followers lose marks
          </h2>
          <span className="ms-cr-section__note">aggregate only · updates as they mark</span>
        </div>
        <CreatorGapReport report={report} handle={creator.handle} />
      </section>

      <section className="ms-cr-section" aria-labelledby="studio-kit">
        <div className="ms-cr-section__head">
          <h2 id="studio-kit" className="ms-cr-section__title">
            Share kit
          </h2>
          <span className="ms-cr-section__note">paste as-is · the #ad stays in</span>
        </div>
        <CreatorShareKit kit={kit} />
        <div className="ms-cr-sharecard">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            className="ms-cr-sharecard__img"
            src={ogPath}
            width={1200}
            height={630}
            alt={`Share card: study with @${creator.handle}, code ${creator.code}`}
          />
          <div className="ms-cr-sharecard__meta">
            <span className="ms-cr-section__note">
              Share card · 1200 × 630 · post it as an image, or it shows when you paste the link
            </span>
            <a className="ms-cr-copy" href={ogPath} download={`markscheme-${creator.handle}.png`}>
              Download
            </a>
          </div>
        </div>
      </section>

      <section className="ms-cr-section" aria-labelledby="studio-recent">
        <div className="ms-cr-section__head">
          <h2 id="studio-recent" className="ms-cr-section__title">
            Recent answers
          </h2>
          <span className="ms-cr-section__note">no names, no scripts</span>
        </div>
        {runs.length ? (
          <div className="overflow-x-auto">
            <table className="ms-cr-runs">
              <thead>
                <tr>
                  <th>When</th>
                  <th>Subject</th>
                  <th>Who</th>
                  <th>Result</th>
                  <th className="is-num">Score</th>
                </tr>
              </thead>
              <tbody>
                {runs.map((r) => (
                  <tr key={r.id}>
                    <td>
                      {new Date(r.startedAt).toLocaleDateString('en-GB', {
                        day: 'numeric',
                        month: 'short',
                      })}
                    </td>
                    <td>{r.subjectCode ?? '—'}</td>
                    <td>{r.guest ? 'Guest' : 'Student'}</td>
                    <td>
                      <span
                        className={`ms-cr-runs__pill${r.status === 'success' ? ' ms-cr-runs__pill--ok' : ''}`}
                      >
                        {r.status === 'success' ? 'marked' : r.status}
                      </span>
                    </td>
                    <td className="is-num">
                      {r.marksEarned != null && r.totalMarks != null
                        ? `${r.marksEarned}/${r.totalMarks}`
                        : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="ms-cr-empty">
            Nothing marked with {creator.code} yet. Put the bio line up and send one video to the
            link — the first answers usually land the same day.
          </p>
        )}
      </section>

      <p className="ms-cr-section__note" style={{ marginTop: 32, lineHeight: 1.7 }}>
        House rules: you only ever see aggregates. Gifts are capped monthly. Any post that
        mentions MarkScheme carries #ad — you hold a free seat, and that makes it an ad under
        UK and Indian advertising rules.
      </p>
    </main>
  )
}
