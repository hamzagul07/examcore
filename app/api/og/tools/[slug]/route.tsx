import { createOgImage } from '@/lib/seo/og-image'

export const runtime = 'nodejs'

type Props = { params: Promise<{ slug: string }> }

const TOOL_OG: Record<string, { title: string; subtitle: string }> = {
  hub: {
    title: 'Free revision tools',
    subtitle: 'Grade boundaries · command words · countdown · IB points',
  },
  'will-my-grade-hold': {
    title: 'Will my grade hold?',
    subtitle: 'Results Day 2026 · raw mark → grade · gap to next boundary',
  },
  'grade-boundary-calculator': {
    title: 'Grade boundary calculator',
    subtitle: 'Raw marks in · Cambridge A*–E grade out',
  },
  'pum-calculator': {
    title: 'PUM / UMS calculator',
    subtitle: 'Raw mark to Percentage Uniform Mark on the 0–100 scale',
  },
  'ib-points-calculator': {
    title: 'IB points calculator',
    subtitle: 'Six subjects + TOK/EE bonus · out of 45',
  },
  'exam-countdown': {
    title: 'Exam countdown',
    subtitle: 'Days left · revision phase · papers per week',
  },
  'command-words': {
    title: 'Command words',
    subtitle: 'What state, explain, evaluate actually ask for',
  },
}

/** Paper OG for tool shares — file-convention opengraph-image 404s under (marketing) in this Next setup. */
export async function GET(_req: Request, { params }: Props) {
  const { slug } = await params
  const entry = TOOL_OG[slug] ?? TOOL_OG.hub
  return createOgImage(entry)
}
