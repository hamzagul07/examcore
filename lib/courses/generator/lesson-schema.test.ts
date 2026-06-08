import assert from 'node:assert/strict'
import { GeneratedLessonSchema } from './lesson-schema'

const minimal = {
  slug: '2-1-equations-of-motion',
  topicCode: '2.1',
  title: 'Equations of motion',
  paper: 'P1',
  paperName: 'Paper 1 Multiple Choice',
  status: 'pilot',
  summary: 'Master kinematics equations for Cambridge 9702 Paper 1 multiple-choice questions.',
  durationMin: 20,
  paperNumber: '1',
  paperType: 'mcq',
  level: 'A-Level',
  syllabusObjectivesCovered: ['2.1.1'],
  sections: [
    { type: 'intro', content: 'Kinematics is the study of motion.' },
    { type: 'heading', content: 'SUVAT equations' },
    {
      type: 'workedExample',
      question: 'A car accelerates from rest at $2\\,\\mathrm{m\\,s^{-2}}$.',
      solution: 'Use $v = u + at$.',
      sourceQuestionId: '00000000-0000-4000-8000-000000000001',
    },
  ],
}

const parsed = GeneratedLessonSchema.parse(minimal)
assert.equal(parsed.paperType, 'mcq')
assert.equal(parsed.sections.length, 3)

try {
  GeneratedLessonSchema.parse({ ...minimal, paperType: 'invalid' })
  assert.fail('expected zod error')
} catch {
  // expected
}

console.log('lesson-schema.test.ts: ok')
