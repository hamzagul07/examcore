import Image from 'next/image'
import { Eye } from 'lucide-react'
import type { PartitionedVisualBlocks } from '@/lib/courses/lesson-layout'
import type { VisualTemplate } from '@/lib/courses/visual-types'
import type { LessonDiagramSpec } from '@/lib/courses/diagram-specs'
import type { LessonInteractiveEmbed } from '@/lib/courses/types'
import { VisualStepController } from '@/components/courses/visuals/VisualStepController'
import { VisualSectionFrame } from '@/components/courses/visuals/VisualSectionFrame'
import { hasLessonLiveDiagram } from '@/lib/courses/lesson-diagrams'
import { isDualVisualSlug } from '@/lib/courses/placeholder-embeds'

function visualBadge(
  hasEmbed: boolean,
  liveDiagram: boolean,
  dualVisual: boolean,
  provider?: LessonInteractiveEmbed['provider']
): string | undefined {
  if (dualVisual) return 'PhET + diagram'
  if (hasEmbed && provider === 'phet') return 'PhET simulation'
  if (hasEmbed && provider === 'geogebra') return 'GeoGebra'
  if (hasEmbed) return 'Interactive'
  if (liveDiagram) return 'Live diagram'
  return undefined
}

export function CourseVisualLearning({
  partitioned,
  template,
  lessonSlug,
  diagramSpec,
  interactiveEmbed,
}: {
  partitioned: PartitionedVisualBlocks
  template: VisualTemplate
  lessonSlug: string
  diagramSpec?: LessonDiagramSpec | null
  interactiveEmbed?: LessonInteractiveEmbed | null
}) {
  const { heroVisual, stepCarousel, diagramImages } = partitioned
  const hasEmbed = !!interactiveEmbed
  const liveDiagram = hasLessonLiveDiagram(lessonSlug)
  const dualVisual = isDualVisualSlug(lessonSlug) && hasEmbed
  const hasExploreVisual = hasEmbed || liveDiagram
  const showNativeDiagram = liveDiagram && (!hasEmbed || dualVisual)
  const hasStage = showNativeDiagram || stepCarousel !== null
  const referenceDiagrams = diagramImages.filter(
    (d) => d.src.includes('/alnotes/') || (!liveDiagram && !hasEmbed)
  )
  const showReferenceImages = referenceDiagrams.length > 0

  if (!hasEmbed && !hasStage && !showReferenceImages) return null

  const hint = dualVisual
    ? 'Run the PhET sim, then use the synced diagram and steps below.'
    : hasExploreVisual
      ? hasEmbed
        ? 'Use the live simulation, then follow the synced steps below.'
        : 'Use the live diagram and follow the synced steps below.'
      : 'Diagram plus a step-by-step walkthrough of the core ideas.'

  return (
    <VisualSectionFrame
      id="visual-learning"
      title={hasExploreVisual ? 'Explore the concept' : 'Visual learning'}
      hint={hint}
      badge={visualBadge(hasEmbed, liveDiagram, dualVisual, interactiveEmbed?.provider)}
      icon={Eye}
      accent="cool"
      className="course-visual-learning"
      bodyClassName="course-visual-learning-body"
    >
      <VisualStepController
        partitioned={partitioned}
        template={template}
        lessonSlug={lessonSlug}
        diagramSpec={diagramSpec}
        interactiveEmbed={interactiveEmbed}
      />

      {showReferenceImages ? (
        <div className="course-alnotes-gallery mt-6 space-y-6">
          {referenceDiagrams.map((diagram, i) => (
            <figure
              key={diagram.src}
              className="course-lesson-diagram overflow-hidden rounded-2xl border-2 border-[color-mix(in_srgb,var(--ec-brand)_30%,var(--ec-border-subtle))] bg-white p-2 shadow-lg lg:rounded-3xl"
            >
              <Image
                src={diagram.src}
                alt={diagram.alt}
                width={1280}
                height={720}
                sizes="(max-width: 768px) 100vw, 720px"
                className="h-auto w-full rounded-xl border border-[var(--ec-border-subtle)] object-contain"
                unoptimized
              />
              <figcaption className="px-2 py-2 text-center text-xs text-[var(--ec-text-tertiary)]">
                {diagram.caption ??
                  (referenceDiagrams.length > 1
                    ? `Reference notes — page ${i + 1} of ${referenceDiagrams.length}`
                    : 'Reference diagram from syllabus notes')}
              </figcaption>
            </figure>
          ))}
        </div>
      ) : null}
    </VisualSectionFrame>
  )
}
