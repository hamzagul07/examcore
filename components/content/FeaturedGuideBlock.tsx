import Link from 'next/link'
import {
  ExamSheet,
  ExamSheetLine,
} from '@/components/margin-notes/ExamSheet'
import type { EnrichedBlogMeta } from '@/lib/blog/meta'
import { formatBlogDate } from '@/lib/blog/meta'

type Props = {
  post: EnrichedBlogMeta
}

/** Featured guide row — prose + exam sheet preview (prototype guide-feature). */
export function FeaturedGuideBlock({ post }: Props) {
  return (
    <article className="ms-guide-feature">
      <div>
        <span className="ec-chip-ms ec-chip-ms--ok">featured</span>
        <h2 className="ms-h3" style={{ fontSize: 30, margin: '14px 0 10px' }}>
          <Link href={`/blog/${post.slug}`} className="hover:text-[var(--ec-brand)]">
            {post.title}
          </Link>
        </h2>
        {post.description ? (
          <p className="ms-body-2" style={{ fontSize: 16 }}>
            {post.description}
          </p>
        ) : null}
        <div
          style={{
            display: 'flex',
            gap: 14,
            marginTop: 20,
            alignItems: 'center',
            flexWrap: 'wrap',
          }}
        >
          <Link href={`/blog/${post.slug}`} className="ec-btn-ghost ec-btn-ghost--sm">
            Read the guide →
          </Link>
          <span className="ms-micro">
            {post.readingMinutes} min
            {post.date ? ` · ${formatBlogDate(post.date).toUpperCase()}` : ''}
          </span>
        </div>
      </div>
      <ExamSheet head="from the guide" headRight="SCHEME CITING">
        <ExamSheetLine work="ω = 2π / T — correct relation stated" mark="C1 ✓" ok />
        <ExamSheetLine
          work="v = ω²x₀ — one power of ω too many"
          mark="M0 ✗"
          note="v_max = ωx₀ is the method mark here"
        />
        <ExamSheetLine work="a–x graph: straight line through origin" mark="B1 ✓" ok />
      </ExamSheet>
    </article>
  )
}
