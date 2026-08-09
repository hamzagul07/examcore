import { createChallengeOgImage, createOgImage } from '@/lib/seo/og-image'
import { getChallenge } from '@/lib/seo/challenges'

export const runtime = 'nodejs'

type Props = { params: Promise<{ id: string }> }

/** Dynamic challenge OG — file-convention opengraph-image 404'd for long base64 ids. */
export async function GET(_req: Request, { params }: Props) {
  const { id } = await params
  try {
    const challenge = getChallenge(id)
    if (!challenge) {
      return createOgImage({
        title: 'Quiz challenge',
        subtitle: 'Beat a friend on MarkScheme',
      })
    }
    return createChallengeOgImage({
      title: 'Can you beat this score?',
      score: challenge.score,
      total: challenge.total,
      quizTitle: challenge.title,
    })
  } catch {
    return createOgImage({
      title: 'Quiz challenge',
      subtitle: 'Beat a friend on MarkScheme',
    })
  }
}
