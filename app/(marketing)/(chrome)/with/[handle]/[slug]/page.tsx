import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createPageMetadata } from '@/lib/seo/metadata'
import { getCreatorByHandle } from '@/lib/creators/service'
import { getTipTestBySlug } from '@/lib/creators/tips'
import { creatorSpacePath } from '@/lib/creators/codes'
import { CreatorAvatar } from '@/components/creators/CreatorAvatar'
import { CreatorStatTiles } from '@/components/creators/CreatorStatTiles'
import { PageJsonLd } from '@/components/seo/PageJsonLd'

export const dynamic = 'force-dynamic'

type Props = { params: Promise<{ handle: string; slug: string }> }

export async function generateMetadata({ params }: Props) {
  const { handle, slug } = await params
  const creator = await getCreatorByHandle(handle)
  if (!creator) return {}
  const tip = await getTipTestBySlug(creator.userId, slug)
  if (!tip || tip.status !== 'active') return {}
  return createPageMetadata({
    title: `${tip.title} — a tip test by @${creator.handle}`,
    description: `${tip.tip.slice(0, 150)} Try it on a real ${tip.subjectLabel} question and get marked against the mark scheme.`,
    path: `${creatorSpacePath(creator.handle)}/${tip.slug}`,
    ogImagePath: `/api/og/creator/${encodeURIComponent(creator.handle)}`,
  })
}

/**
 * A tip test: the creator's tip, the question to try it on, and how their
 * followers have done so far. The one button prefills the mark page.
 */
export default async function TipTestPage({ params }: Props) {
  const { handle, slug } = await params
  const creator = await getCreatorByHandle(handle)
  if (!creator) notFound()
  const tip = await getTipTestBySlug(creator.userId, slug)
  if (!tip || tip.status !== 'active') notFound()

  const path = `${creatorSpacePath(creator.handle)}/${tip.slug}`
  const markHref = `/mark?code=${encodeURIComponent(creator.code)}&tip=${tip.id}`

  return (
    <div className="ms-cr-page">
      <PageJsonLd
        path={path}
        title={`${tip.title} — a tip test by @${creator.handle}`}
        description={tip.tip}
        breadcrumbs={[
          { name: 'Home', path: '/' },
          { name: 'Creators', path: '/creators' },
          { name: creator.displayName, path: creatorSpacePath(creator.handle) },
          { name: tip.title, path },
        ]}
      />
      <section className="ms-cr-hero" style={{ gridTemplateColumns: '1fr' }} aria-labelledby="tip-title">
        <div className="ms-cr-hero__copy">
          <div className="ms-cr-hero__kicker">
            <span className="ms-cr-badge">Tip test</span>
            <Link href={creatorSpacePath(creator.handle)} className="ec-btn-underline" style={{ textTransform: 'none', letterSpacing: 0 }}>
              Study with @{creator.handle}
            </Link>
          </div>
          <h1 id="tip-title" className="ms-cr-hero__name">
            {tip.title}
          </h1>
          <blockquote className="ms-cr-quote">
            <CreatorAvatar name={creator.displayName} />
            <p>{tip.tip}</p>
          </blockquote>
        </div>
      </section>

      <CreatorStatTiles
        items={[
          { num: tip.stats.attempts, label: 'Tried it', sub: 'answers marked with this tip', accent: true },
          {
            num: tip.stats.avgPct ?? 0,
            label: tip.stats.avgPct === null ? 'Average (none yet)' : 'Average %',
            sub: 'across every attempt',
          },
          { num: tip.stats.fullMarks, label: 'Full marks', sub: `${tip.totalMarks}/${tip.totalMarks}` },
        ]}
      />

      <section className="ms-cr-section" aria-labelledby="tip-question">
        <div className="ms-cr-section__head">
          <h2 id="tip-question" className="ms-cr-section__title">
            The question
          </h2>
          <span className="ms-cr-section__note">
            {tip.subjectLabel} · {tip.totalMarks} marks
          </span>
        </div>
        <div className="ms-cr-question">
          <p className="ms-cr-question__text">{tip.questionText}</p>
        </div>
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <Link href={markHref} className="ec-btn-primary inline-flex min-h-[52px] items-center gap-2 px-6">
            Answer it with the tip
            <span className="font-mono text-[11px] font-bold" aria-hidden>
              -&gt;
            </span>
          </Link>
          <span className="ms-cr-section__note">
            question prefilled · marked in ~90s · no account needed · counts for @{creator.handle}
          </span>
        </div>
      </section>
    </div>
  )
}
