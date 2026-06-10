import { z } from 'zod'
import type { CourseLesson } from '@/lib/courses/types'

const LessonSectionSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('intro'), content: z.string().min(1) }),
  z.object({ type: z.literal('heading'), content: z.string().min(1) }),
  z.object({ type: z.literal('text'), content: z.string().min(1) }),
  z.object({ type: z.literal('formula'), content: z.string().min(1) }),
  z.object({ type: z.literal('keyPoints'), items: z.array(z.string().min(1)).min(1) }),
  z.object({ type: z.literal('examTip'), content: z.string().min(1) }),
  z.object({
    type: z.literal('workedExample'),
    question: z.string().min(1),
    solution: z.string().min(1),
    sourceQuestionId: z.string().uuid().optional(),
    diagrams: z
      .array(
        z.object({
          id: z.string(),
          src: z.string().min(1),
          alt: z.string(),
          order: z.number(),
        })
      )
      .optional(),
  }),
  z.object({
    type: z.literal('pastPaperPractice'),
    questions: z.array(
      z.object({
        questionId: z.string().uuid(),
        year: z.number(),
        session: z.string(),
        paperVariant: z.string(),
        questionNumber: z.string(),
        marks: z.number(),
        questionTextPreview: z.string(),
        markPoints: z.array(z.object({ text: z.string(), marks: z.number() })),
        markHref: z.string(),
      })
    ),
  }),
  z.object({
    type: z.literal('practice'),
    label: z.string().min(1),
    href: z.string().min(1),
  }),
  z.object({
    type: z.literal('resources'),
    items: z.array(z.object({ label: z.string(), href: z.string() })),
  }),
  z.object({
    type: z.literal('interactive'),
    embed: z.object({
      provider: z.enum(['phet', 'geogebra', 'custom']),
      title: z.string().min(1),
      embedUrl: z.string().url(),
      hint: z.string().optional(),
      launchUrl: z.string().url().optional(),
      aspectRatio: z.string().optional(),
      attribution: z.object({
        source: z.string().min(1),
        license: z.string().min(1),
        sourceUrl: z.string().url().optional(),
      }),
    }),
  }),
])

const SimpleExplanationSchema = z.object({
  title: z.string().min(1),
  summary: z.string().min(1),
  analogy: z.string().optional(),
  steps: z.array(z.string().min(1)).min(1),
})

const FlashcardSchema = z.object({
  front: z.string().min(1),
  back: z.string().min(1),
  pillLabel: z.string().optional(),
})

const PastPaperRefSchema = z.object({
  paperCode: z.string().min(1),
  paperSession: z.string().min(1),
  sessionLabel: z.string().min(1),
  questionNumber: z.string().min(1),
  questionText: z.string().min(1),
  totalMarks: z.number().nonnegative(),
  markHref: z.string(),
})

const QuickCheckSchema = z.object({
  prompt: z.string().min(1),
  answer: z.string().min(1),
  options: z.array(z.string().min(1)).min(2).max(5).optional(),
})

const DiagramStepStateSchema = z.object({
  focus: z.array(z.string().min(1)).min(1),
  caption: z.string().optional(),
  embedHint: z.string().optional(),
})

const DiagramParamSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  min: z.number(),
  max: z.number(),
  step: z.number().positive(),
  default: z.number(),
  unit: z.string().optional(),
})

const DiagramSpecSchema = z.object({
  params: z.array(DiagramParamSchema).optional(),
  steps: z.array(DiagramStepStateSchema).min(1),
})

export const GeneratedLessonSchema = z.object({
  slug: z.string().min(1),
  topicCode: z.string().min(1),
  title: z.string().min(1),
  paper: z.string().min(1),
  paperName: z.string().min(1),
  status: z.enum(['published', 'outline', 'premium', 'pilot']).default('pilot'),
  summary: z.string().min(20),
  durationMin: z.number().int().positive(),
  sections: z.array(LessonSectionSchema).min(1),
  learningObjectives: z.array(z.string().min(1)).min(1).optional(),
  simpleExplanation: SimpleExplanationSchema.optional(),
  faq: z
    .array(z.object({ q: z.string().min(1), a: z.string().min(1) }))
    .optional(),
  flashcards: z.array(FlashcardSchema).optional(),
  paperNumber: z.coerce.string().min(1),
  paperType: z.enum(['mcq', 'practical', 'structured']),
  level: z.string().min(1),
  syllabusObjectivesCovered: z.array(z.string().min(1)).min(1),
  pastPaperReferences: z.array(PastPaperRefSchema).optional(),
  generatedAt: z.string().datetime().optional(),
  generatorVersion: z.string().optional(),
  quickCheck: z.array(QuickCheckSchema).optional(),
  interactiveEmbed: z
    .object({
      provider: z.enum(['phet', 'geogebra', 'custom']),
      title: z.string().min(1),
      embedUrl: z.string().url(),
      hint: z.string().optional(),
      launchUrl: z.string().url().optional(),
      aspectRatio: z.string().optional(),
      attribution: z.object({
        source: z.string().min(1),
        license: z.string().min(1),
        sourceUrl: z.string().url().optional(),
      }),
    })
    .optional(),
  diagramSpec: DiagramSpecSchema.optional(),
})

export type GeneratedLesson = z.infer<typeof GeneratedLessonSchema>

export function parseGeneratedLesson(raw: unknown): GeneratedLesson {
  return GeneratedLessonSchema.parse(raw)
}

export function toCourseLesson(generated: GeneratedLesson): CourseLesson {
  return generated as CourseLesson
}
