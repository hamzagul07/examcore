import Link from 'next/link'
import { GradeBoundaryCalculator } from '@/components/tools/GradeBoundaryCalculator'
import { SITE_URL } from '@/lib/site-config'
import { createPageMetadata } from '@/lib/seo/metadata'

export const metadata = createPageMetadata({
  title: 'Grade boundary calculator embed — MarkScheme',
  description: 'Embeddable Cambridge grade boundary calculator.',
  path: '/embed/grade-boundary',
  canonicalPath: '/tools/grade-boundary-calculator',
  index: false,
})

export default function EmbedGradeBoundaryPage() {
  return (
    <div>
      <p className="ms-overline mb-3">MarkScheme · Grade calculator</p>
      <GradeBoundaryCalculator defaultLevel="A-Level" />
      <p className="mt-4 text-center text-xs text-[var(--ec-text-faint)]">
        <Link
          href={`${SITE_URL}/tools/grade-boundary-calculator?utm_source=embed&utm_medium=iframe&utm_campaign=grade-boundary`}
          target="_blank"
          rel="noopener noreferrer"
          className="underline"
        >
          Powered by MarkScheme
        </Link>
      </p>
    </div>
  )
}
