import type { VisualTemplate } from '@/lib/courses/visual-types'
import { TopicDiagram } from '@/components/courses/visuals/TopicDiagram'
import { CourseRichText } from '@/components/courses/CourseRichText'

const HERO_CAPTIONS: Partial<Record<VisualTemplate, { latex?: string; text: string }>> = {
  forces: {
    latex: '$F_{net} = ma$',
    text: 'Force and acceleration',
  },
  waves: {
    latex: '$v = f\\lambda$',
    text: 'Waves and wavelength',
  },
  energy: {
    text: 'Heating and phase changes',
  },
  thermal: {
    latex: '$K = C + 273.15$',
    text: 'Celsius and Kelvin scales',
  },
}

export function HeroVisualOverview({ template }: { template: VisualTemplate }) {
  const caption = HERO_CAPTIONS[template]

  return (
    <div className="course-hero-visual-overview">
      <p className="course-hero-visual-label">Visual overview</p>
      <div className="course-hero-visual-diagram-wrap">
        <TopicDiagram template={template} className="course-hero-visual-svg" />
      </div>
      {caption ? (
        <div className="course-hero-visual-caption">
          {caption.latex ? (
            <div className="course-hero-visual-formula">
              <CourseRichText content={caption.latex} variant="inline" />
            </div>
          ) : null}
          <p className="course-hero-visual-caption-text">{caption.text}</p>
        </div>
      ) : null}
    </div>
  )
}
