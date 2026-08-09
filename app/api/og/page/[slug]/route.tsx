import { createOgImage } from '@/lib/seo/og-image'
import { PAGE_OG } from '@/lib/seo/og-catalog'

export const runtime = 'nodejs'

type Props = { params: Promise<{ slug: string }> }

/** Paper OG for marketing pages — (marketing) opengraph-image file routes 404 in this Next setup. */
export async function GET(_req: Request, { params }: Props) {
  const { slug } = await params
  const entry = PAGE_OG[slug] ?? PAGE_OG.home
  return createOgImage(entry)
}
