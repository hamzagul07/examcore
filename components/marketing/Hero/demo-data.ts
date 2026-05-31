export const demoQuestion = {
  subjectCode: 'Physics 9702 · Paper 4 · Q3(a)',
  question:
    'A ball of mass 0.20 kg is dropped from rest from a height of 1.8 m. Calculate the speed of the ball just before it hits the ground. (4 marks)',
  answer: [
    { id: 'line-1', text: 'Using v² = u² + 2as', correct: true },
    { id: 'line-2', text: 'u = 0, a = 9.81, s = 1.8', correct: true },
    { id: 'line-3', text: 'v² = 2 × 9.81 × 1.8 = 35.3', correct: true },
    { id: 'line-4', text: 'v = 5.94 m/s', correct: false },
  ],
  marks: [
    { id: 'm1', delay: 0.6, type: 'tick', anchorLineId: 'line-1' },
    { id: 'm2', delay: 1.1, type: 'underline', anchorLineId: 'line-4' },
    {
      id: 'm3',
      delay: 1.7,
      type: 'annotation',
      anchorLineId: 'line-3',
      label: 'M1, A1 awarded',
    },
    { id: 'm4', delay: 2.4, type: 'score', label: '3 / 4' },
  ],
} as const

export type DemoQuestion = typeof demoQuestion
export type DemoAnswerLine = DemoQuestion['answer'][number]
export type DemoMark = DemoQuestion['marks'][number]
