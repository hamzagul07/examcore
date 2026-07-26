'use client'

import { QuickCheck } from '@/components/courses/margin-notes/lesson-blocks'

/**
 * Dev preview for the produce-then-compare quick check.
 *
 * The real block is paywalled (`L.quiz?.length && !locked` in CourseLessonPage),
 * so it cannot be exercised in a signed-out browser. This renders it directly
 * with fixture data so the interaction stays reviewable and regression-checkable.
 */
const ITEMS = [
  {
    q: 'Why is water a polar molecule?',
    a: 'Oxygen is more electronegative than hydrogen, so the shared electrons sit closer to the oxygen. That gives oxygen a partial negative charge and each hydrogen a partial positive charge, and because the molecule is bent those charges do not cancel.',
  },
  {
    q: 'Explain why ice floats on liquid water.',
    a: 'In ice each water molecule forms four hydrogen bonds in a fixed lattice, holding the molecules further apart than in the liquid. The lattice is therefore less dense, so ice floats.',
  },
  {
    q: 'State one consequence of water&rsquo;s high specific heat capacity for living organisms.',
    a: 'It resists rapid temperature change, so aquatic habitats stay thermally stable and organisms can hold a near-constant internal temperature.',
  },
]

export default function QuickCheckDevPage() {
  return (
    <main style={{ maxWidth: 760, margin: '0 auto', padding: '32px 20px 80px' }}>
      <p className="ec-label-tech" style={{ marginBottom: 6 }}>
        DEV PREVIEW · QUICK CHECK
      </p>
      <h1 className="ms-h2" style={{ marginBottom: 8 }}>
        Produce, then compare
      </h1>
      <p
        className="body-2"
        style={{ marginBottom: 24, color: 'var(--ec-text-secondary)' }}
      >
        Write an answer, then reveal — your attempt stays on screen beside the model
        answer so the gap is visible. Drafts persist per lesson in localStorage.
      </p>
      <QuickCheck items={ITEMS} storageKey="dev-preview" />
    </main>
  )
}
