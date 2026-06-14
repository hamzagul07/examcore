import assert from 'node:assert/strict'
import type { LessonEvidence } from '@/lib/courses/content-source.schema'
import type { GeneratedLesson } from './lesson-schema'
import { validateGeneratedLesson } from './validate-lesson'

const questionId = '11111111-1111-4111-8111-111111111111'

const evidence: LessonEvidence = {
  subjectCode: '9702',
  paperNumber: '1',
  topicCode: '2.1',
  paper: {
    subjectCode: '9702',
    paperNumber: '1',
    paperKind: 'mcq',
    displayName: 'Paper 1 Multiple Choice',
    typicalComponent: '12',
    level: 'A-Level',
  },
  objectives: [
    {
      id: '22222222-2222-4222-8222-222222222222',
      subject_code: '9702',
      topic_code: '2.1',
      topic_title: 'Equations of motion',
      objective_number: '2.1.1',
      objective_text: 'define and use distance, displacement, speed and velocity',
      command_words: ['define'],
      examined_in_papers: ['1', '2'],
      syllabus_year: 2025,
    },
  ],
  questions: [
    {
      id: questionId,
      subject_code: '9702',
      paper_number: '1',
      variant: '12',
      year: 2024,
      session: 'May/June',
      question_number: '3',
      question_text: 'A ball is dropped from rest.',
      marks: 1,
      is_leaf: true,
      parent_question_id: null,
      source_pdf_path: 'cambridge/9702/s24/qp_12.pdf',
      tags: [],
    },
  ],
  markSchemes: [],
}

function baseLesson(overrides: Partial<GeneratedLesson> = {}): GeneratedLesson {
  return {
    slug: '2-1-equations-of-motion',
    topicCode: '2.1',
    title: 'Equations of motion',
    paper: 'P1',
    paperName: 'Paper 1 Multiple Choice',
    status: 'pilot',
    summary: 'Kinematics for Paper 1 MCQ revision with distance, displacement, speed and velocity.',
    durationMin: 20,
    paperNumber: '1',
    paperType: 'mcq',
    level: 'A-Level',
    syllabusObjectivesCovered: ['2.1.1'],
    simpleExplanation: {
      title: 'Motion in a straight line',
      summary: 'Kinematics links distance, displacement, speed and velocity.',
      analogy: 'Think of displacement as the straight-line shortcut on a map, while distance is the winding path you actually walked.',
      steps: ['Define quantities', 'Pick a sign convention', 'Select an equation', 'Check units'],
    },
    flashcards: [
      { front: 'Define displacement', back: 'Distance in a straight line with direction.' },
      { front: 'Define velocity', back: 'Rate of change of displacement.' },
      { front: 'Define speed', back: 'Rate of change of distance.' },
      { front: 'Define distance', back: 'Total path length travelled.' },
      { front: 'Define acceleration', back: 'Rate of change of velocity.' },
      { front: 'State SI unit of velocity', back: 'Metres per second (m s⁻¹).' },
      { front: 'Scalar vs vector for speed', back: 'Speed is scalar; velocity is vector.' },
      { front: 'Uniform acceleration means', back: 'Velocity changes by equal amounts in equal times.' },
    ],
    sections: [
      { type: 'intro', content: 'Kinematics covers distance, displacement, speed and velocity for Paper 1 MCQ questions.' },
      { type: 'heading', content: 'Distance and displacement' },
      {
        type: 'text',
        content: 'Distance is the total path length travelled along a route. Displacement is the straight-line change in position from start to finish, including direction. Examiners often test whether you treat displacement as a vector quantity.',
      },
      { type: 'heading', content: 'Speed and velocity' },
      {
        type: 'text',
        content: 'Speed is the rate of change of distance with respect to time. Velocity is the rate of change of displacement. A car travelling round a track at steady speed can have zero average velocity if it returns to the start.',
      },
      { type: 'heading', content: 'Choosing equations' },
      {
        type: 'text',
        content: 'Select a suvat equation only after listing known and unknown quantities. Check that acceleration is constant before using the standard kinematic equations in MCQ elimination.',
      },
      {
        type: 'workedExample',
        question: 'A ball is dropped from rest.',
        solution: 'Answer: B',
        sourceQuestionId: questionId,
      },
      {
        type: 'workedExample',
        question: 'A car accelerates uniformly from 5 m s⁻¹ to 15 m s⁻¹ in 4.0 s. Find acceleration.',
        solution: 'a = (v − u) / t = (15 − 5) / 4.0 = 2.5 m s⁻²',
        sourceQuestionId: questionId,
      },
    ],
    ...overrides,
  }
}

async function main() {
  const ok = await validateGeneratedLesson(baseLesson(), evidence, {
    skipAnswerabilityLlm: true,
  })
  assert.equal(ok.ok, true, ok.issues.map((i) => i.message).join('; '))

  const badPaper = await validateGeneratedLesson(
    baseLesson({ paperNumber: '2', paper: 'P2' }),
    evidence,
    { skipAnswerabilityLlm: true }
  )
  assert.equal(badPaper.ok, false)
  assert.ok(badPaper.issues.some((i) => i.code === 'paper_number_mismatch'))

  const missingId = await validateGeneratedLesson(
    baseLesson({
      sections: [
        { type: 'intro', content: 'Intro' },
        { type: 'workedExample', question: 'Q', solution: 'A' },
      ],
    }),
    evidence,
    { skipAnswerabilityLlm: true }
  )
  assert.equal(missingId.ok, false)
  assert.ok(missingId.issues.some((i) => i.code === 'missing_source_question_id'))

  console.log('validate-lesson.test.ts: ok')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
