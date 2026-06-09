import type { VisualTemplate } from '@/lib/courses/visual-types'
import { TopicDiagram } from '@/components/courses/visuals/TopicDiagram'
import { LessonDiagram } from '@/components/diagrams/LessonDiagram'
import { getLessonDiagram } from '@/lib/courses/lesson-diagrams'
import { CourseRichText } from '@/components/courses/CourseRichText'

const CAPTIONS: Partial<Record<VisualTemplate, { latex?: string; text: string }>> = {
  forces: {
    latex: '$F_{net} = ma$',
    text: 'The net force on a mass causes acceleration.',
  },
  waves: {
    latex: '$v = f\\lambda$',
    text: 'Wave speed links frequency and wavelength.',
  },
  energy: {
    text: 'Heating changes temperature or phase — track Q with $Q = mc\\Delta T$ and $Q = mL$.',
  },
  thermal: {
    latex: '$K = C + 273.15$',
    text: 'Kelvin is absolute; Celsius is relative — same size steps (ΔK = Δ°C).',
  },
}

export function StepStageVisual({
  template,
  lessonSlug,
}: {
  template: VisualTemplate
  lessonSlug?: string
}) {
  const custom = lessonSlug ? getLessonDiagram(lessonSlug) : null
  const caption = CAPTIONS[template] ?? { text: 'Visual summary of the key ideas in this topic.' }

  return (
    <div className="course-step-stage-visual">
      <p className="course-step-stage-label">{custom ? 'Live diagram' : 'Topic diagram'}</p>
      <div className="course-step-stage-diagram">
        {custom ? (
          <LessonDiagram
            Component={custom.Component}
            meta={custom.meta}
            className="course-step-stage-custom-diagram"
          />
        ) : (
          <TopicDiagram template={template} className="course-step-stage-svg" />
        )}
      </div>
      {!custom ? (
        <div className="course-step-stage-caption">
          {caption.latex ? (
            <div className="course-step-stage-formula">
              <CourseRichText content={caption.latex} variant="inline" />
            </div>
          ) : null}
          <p className="course-step-stage-caption-text">
            {caption.text.includes('$') ? (
              <CourseRichText content={caption.text} variant="inline" />
            ) : (
              caption.text
            )}
          </p>
        </div>
      ) : null}
    </div>
  )
}
