import Link from 'next/link'
import { notFound } from 'next/navigation'
import { MarketingHero, MarketingPageShell, MarketingSection } from '@/components/marketing/MarketingPageShell'
import { createPageMetadata } from '@/lib/seo/metadata'
import { getChallenge } from '@/lib/seo/challenges'

type Props = { params: Promise<{ id: string }> }

export async function generateMetadata({ params }: Props) {
  const { id } = await params
  const challenge = getChallenge(id)
  if (!challenge) return {}
  return createPageMetadata({
    title: `Can you beat ${challenge.score}/${challenge.total}? — ${challenge.title}`,
    description: `Challenge: ${challenge.title}. Score ${challenge.score}/${challenge.total}. Take the same quiz on MarkScheme.`,
    path: `/challenge/${id}`,
    // Ephemeral share cards — never index; they would explode URL space.
    index: false,
  })
}

export default async function ChallengePage({ params }: Props) {
  const { id } = await params
  const challenge = getChallenge(id)
  if (!challenge) notFound()

  return (
    <MarketingPageShell>
      <MarketingHero
        label="Challenge"
        title={`Can you beat ${challenge.score}/${challenge.total}?`}
        lead={`${challenge.title}. Someone scored ${challenge.score} out of ${challenge.total}${challenge.percentile ? ` (top ${challenge.percentile}%)` : ''}.`}
      />
      <MarketingSection className="!pt-0">
        <div className="ec-card p-5">
          <p className="ms-body-2">
            Take the same quick check, then share your score with friends.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link href={challenge.quizHref} className="ec-btn-primary min-h-[48px]">
              Accept challenge
            </Link>
            <Link href="/mark" className="ec-btn-ghost min-h-[48px]">
              Mark a past paper
            </Link>
          </div>
        </div>
      </MarketingSection>
    </MarketingPageShell>
  )
}
