import { createCreatorOgImage } from '@/lib/creators/og'
import { getCreatorByHandle, getCreatorStats } from '@/lib/creators/service'
import { createOgImage } from '@/lib/seo/og-image'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type Props = { params: Promise<{ handle: string }> }

/**
 * Share card for a creator's space. An API route rather than the
 * file-convention `opengraph-image`, which 404s for dynamic segments in this
 * app (see app/api/og/challenge). The card carries a live count, so it is
 * never a build-time image.
 */
export async function GET(_req: Request, { params }: Props) {
  const { handle } = await params
  try {
    const creator = await getCreatorByHandle(handle)
    if (!creator) {
      return createOgImage({
        title: 'Study with a creator',
        subtitle: 'MarkScheme · real mark schemes · examiner-style feedback',
      })
    }
    const stats = await getCreatorStats(creator)
    return createCreatorOgImage({
      handle: creator.handle,
      displayName: creator.displayName,
      code: creator.code,
      giftMarks: creator.giftMarks,
      marked: stats.marked,
    })
  } catch {
    return createOgImage({
      title: 'Study with a creator',
      subtitle: 'MarkScheme · real mark schemes · examiner-style feedback',
    })
  }
}
