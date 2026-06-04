import Link from 'next/link'
import { countInformationGainSignals } from '@/lib/seo/fan-out'
import { getPostSeoMeta } from '@/lib/seo/post-seo'

type Props = {
  slug: string
  content: string
  informationGain?: string | null
}

const GAIN_LABELS: Record<string, string> = {
  'first-hand': 'First-hand marking workflow',
  synthesis: 'Novel synthesis from mark schemes',
  dataset: 'Original benchmark data',
  editorial: 'Timely editorial angle',
}

/** Signals net-new information vs derivative SEO content. */
export function BlogInformationGain({ slug, content, informationGain }: Props) {
  const signals = countInformationGainSignals(content)
  const seo = getPostSeoMeta(slug)
  const label =
    (informationGain && GAIN_LABELS[informationGain]) ||
    (seo.format === 'comparison' ? 'Structured comparison' : 'Practical revision guide')

  return (
    <p className="mt-4 text-xs text-[var(--ec-text-secondary)]">
      <span className="font-semibold text-[var(--ec-brand)]">Information gain:</span> {label}
      {signals.tables > 0 && ' · Tables'}
      {signals.faqSections > 0 && ' · FAQ'}
      {signals.wordCount > 1200 && ' · Deep coverage'}
      {' · '}
      <Link href="/insights" className="ec-link">
        See marking benchmarks
      </Link>
    </p>
  )
}
