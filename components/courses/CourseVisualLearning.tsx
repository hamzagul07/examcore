import Image from 'next/image'
import { Eye } from 'lucide-react'
import type { PartitionedVisualBlocks } from '@/lib/courses/lesson-layout'
import type { VisualTemplate } from '@/lib/courses/visual-types'
import { StepStageVisual } from '@/components/courses/visuals/StepStageVisual'
import { VisualStepTimeline } from '@/components/courses/visuals/VisualStepTimeline'
import { VisualStepCarousel } from '@/components/courses/visuals/VisualStepCarousel'
import { VisualSectionFrame } from '@/components/courses/visuals/VisualSectionFrame'

export function CourseVisualLearning({
  partitioned,
  template,
  lessonSlug,
}: {
  partitioned: PartitionedVisualBlocks
  template: VisualTemplate
  lessonSlug: string
}) {
  const { heroVisual, stepCarousel, diagramImage } = partitioned
  const hasStage = heroVisual !== null || stepCarousel !== null

  if (!hasStage && !diagramImage) return null

  return (
    <VisualSectionFrame
      id="visual-learning"
      title="Visual learning"
      hint="Diagram plus a step-by-step walkthrough of the core ideas."
      icon={Eye}
      accent="cool"
      className="course-visual-learning"
      bodyClassName="course-visual-learning-body"
    >
      {hasStage ? (
        <div className="course-visual-learning-grid course-visual-stage">
          {heroVisual ? (
            <div className="course-visual-learning-diagram">
              <StepStageVisual template={template} lessonSlug={lessonSlug} />
            </div>
          ) : null}
          {stepCarousel ? (
            <div className="course-visual-learning-steps min-w-0">
              <div className="course-visual-learning-steps-list">
                <VisualStepTimeline title={stepCarousel.title} steps={stepCarousel.steps} />
                <VisualStepCarousel title={stepCarousel.title} steps={stepCarousel.steps} />
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      {diagramImage ? (
        <figure className="course-lesson-diagram overflow-hidden rounded-2xl border-2 border-[color-mix(in_srgb,var(--ec-brand)_30%,var(--ec-border-subtle))] bg-[var(--ec-surface-muted)] p-2 shadow-lg lg:rounded-3xl">
          <Image
            src={diagramImage.src}
            alt={diagramImage.alt}
            width={1280}
            height={720}
            className="h-auto w-full rounded-xl border border-[var(--ec-border-subtle)]"
            unoptimized
          />
          <figcaption className="px-2 py-2 text-center text-xs text-[var(--ec-text-tertiary)]">
            Syllabus diagram — use labels to link ideas to past papers
          </figcaption>
        </figure>
      ) : null}
    </VisualSectionFrame>
  )
}
