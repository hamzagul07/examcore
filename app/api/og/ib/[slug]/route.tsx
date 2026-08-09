import { createOgImage } from '@/lib/seo/og-image'
import { getIbSubject } from '@/lib/ib/catalog'
import { ibShortName } from '@/lib/seo/ib-seo'

export const runtime = 'nodejs'

type Props = { params: Promise<{ slug: string }> }

/** Per-IB-subject paper OG for /ib/subjects/[slug] and course shares. */
export async function GET(_req: Request, { params }: Props) {
  const { slug } = await params
  const subject = getIbSubject(slug)
  if (!subject) {
    return createOgImage({
      title: 'IB Diploma past papers & mark schemes',
      subtitle: 'Every HL & SL subject · Markband guides · Free on MarkScheme',
    })
  }
  const short = ibShortName(subject)
  return createOgImage({
    title: `Mark IB ${short} (${subject.level})`,
    subtitle: `${subject.name} · markbands · free on MarkScheme`,
  })
}
