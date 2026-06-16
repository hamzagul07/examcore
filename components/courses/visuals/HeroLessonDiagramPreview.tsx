'use client'

import { StepStageVisual } from '@/components/courses/visuals/StepStageVisual'
import type { VisualTemplate } from '@/lib/courses/visual-types'
import type { LessonDiagramSpec } from '@/lib/courses/diagram-specs'
import { getLessonDiagramSpec, stepStateFor } from '@/lib/courses/diagram-specs'

type Props = {
  lessonSlug: string
  template: VisualTemplate
  diagramSpec?: LessonDiagramSpec | null
}

/** Compact live diagram preview for lesson hero — step 0 of the synced diagram. */
export function HeroLessonDiagramPreview({ lessonSlug, template, diagramSpec }: Props) {
  const spec = diagramSpec?.steps?.length ? diagramSpec : getLessonDiagramSpec(lessonSlug)
  const caption = stepStateFor(spec, 0)?.caption

  return (
    <div className="course-hero-native-diagram">
      <StepStageVisual
        template={template}
        lessonSlug={lessonSlug}
        stepIndex={0}
        stepCaption={caption}
      />
    </div>
  )
}
