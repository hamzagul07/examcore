import type { ComponentType } from 'react'
import { LinkedListDiagram } from '@/components/diagrams/LinkedListDiagram'
import { BinaryTreeDiagram } from '@/components/diagrams/BinaryTreeDiagram'
import type { LessonDiagramComponentProps } from '@/components/diagrams/diagram-props'
import { getLessonDiagramSpec, stepStateFor } from '@/lib/courses/diagram-specs'

export const metadata = {
  title: 'Linked list & tree — dev',
  robots: { index: false, follow: false },
}

const ITEMS: { name: string; slug: string; Component: ComponentType<LessonDiagramComponentProps> }[] = [
  { name: 'Singly linked list', slug: '5-2-linked-lists', Component: LinkedListDiagram },
  { name: 'Binary tree', slug: '5-3-trees-and-binary-trees', Component: BinaryTreeDiagram },
]

export default function CsDs2DevPage() {
  return (
    <main style={{ maxWidth: 1160, margin: '0 auto', padding: '32px 20px 80px' }}>
      <p className="ec-label-tech" style={{ marginBottom: 6 }}>
        DEV PREVIEW · CS DATA STRUCTURES
      </p>
      <h1 className="ms-h2" style={{ marginBottom: 20 }}>
        Linked list &amp; binary tree
      </h1>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 26 }}>
        {ITEMS.map(({ name, slug, Component }) => {
          const spec = getLessonDiagramSpec(slug)
          const steps = spec?.steps ?? []
          return (
            <section key={slug}>
              <p className="ec-label-tech" style={{ marginBottom: 8 }}>
                {name} — {steps.length} steps
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: `repeat(${steps.length}, minmax(0, 1fr))`, gap: 16 }}>
                {steps.map((_, i) => (
                  <figure key={i} className="ec-card" style={{ padding: 12, margin: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <span className="ec-label-tech">STEP {i + 1}</span>
                    <div style={{ background: 'var(--ec-surface)', borderRadius: 8, padding: 6 }}>
                      <Component lessonSlug={slug} stepIndex={i} />
                    </div>
                    <figcaption style={{ fontSize: 12, color: 'var(--ec-text-secondary)', lineHeight: 1.35 }}>
                      {stepStateFor(spec, i)?.caption}
                    </figcaption>
                  </figure>
                ))}
              </div>
            </section>
          )
        })}
      </div>
    </main>
  )
}
