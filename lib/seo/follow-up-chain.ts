import type { ContentClusterId } from '@/lib/seo/clusters'

export type FollowUpItem = {
  question: string
  answer: string
  href?: string
}

/**
 * Conversational follow-up chain — next questions after the entry query.
 * Optimized for AI Mode multi-turn fan-out, not just the head term.
 */
export const FOLLOW_UP_CHAINS: Record<ContentClusterId, FollowUpItem[]> = {
  'past-paper-marking': [
    {
      question: 'How strict should I be when I self-mark?',
      answer:
        'Stricter than feels comfortable: if the mark scheme allows two phrasings, your answer must match one. Log every lost mark before reading the scheme.',
      href: '/blog/common-mistakes-self-marking-past-papers',
    },
    {
      question: 'When should I get a second opinion on my script?',
      answer:
        'After your first honest pass — use a tool or study partner before rewriting, so you fix the right gaps.',
      href: '/mark',
    },
    {
      question: 'How do I mark handwriting without retyping?',
      answer:
        'Photograph each answer in order; keep paper codes visible. MarkScheme reads photos against the real scheme.',
      href: '/blog/photograph-handwritten-past-paper-answers',
    },
  ],
  'mark-schemes': [
    {
      question: 'What is the difference between M1 and A1?',
      answer:
        'M marks reward method; A marks reward accuracy. You can earn M marks even when the final value is wrong if the method is correct.',
      href: '/blog/cambridge-a-level-maths-mark-scheme-b1-m1-a1',
    },
    {
      question: 'How do essay bands work in economics?',
      answer:
        'Examiners use level-of-response bands — you need explicit evidence for the band, not “sounds okay”.',
      href: '/blog/marking-a-level-economics-essays-at-home',
    },
    {
      question: 'Can I use MarkScheme instead of reading the scheme?',
      answer:
        'No — read the official scheme first; use MarkScheme as a second pass on your handwriting.',
      href: '/mark',
    },
  ],
  'revision-strategy': [
    {
      question: 'How many past papers per week is realistic?',
      answer:
        'One full timed paper plus two question-level retries beats four untimed papers with no marking log.',
      href: '/blog/how-many-cambridge-past-papers-before-exams',
    },
    {
      question: 'Mocks vs real past papers — which first?',
      answer:
        'Past papers aligned to your syllabus code; mocks only if they match your component structure.',
      href: '/blog/cambridge-mock-exams-vs-past-papers',
    },
  ],
  'exam-technique': [
    {
      question: 'How do I use examiner reports?',
      answer:
        'After marking: read what examiners penalised that series, then re-attempt one question with that feedback in mind.',
      href: '/blog/cambridge-examiner-report-how-to-use',
    },
  ],
  'subject-guides': [
    {
      question: 'Where do I download official papers for my code?',
      answer:
        'Cambridge International or your school portal — always match paper, mark scheme, and examiner report session.',
      href: '/subjects',
    },
    {
      question: 'How do I mark one question quickly?',
      answer:
        'Upload a single photo to MarkScheme — useful between full papers.',
      href: '/mark',
    },
  ],
  'subject-choice': [
    {
      question: 'What if I picked the wrong combination?',
      answer:
        'Switch early if your school allows; compare university requirements before dropping sciences.',
      href: '/blog/switching-a-level-subjects-mid-course',
    },
  ],
  'exam-integrity': [
    {
      question: 'Should I trust leaked paper rumours?',
      answer:
        'No — focus on official materials; leaks risk disqualification and waste revision time.',
      href: '/blog/cambridge-exam-paper-leaks-2026-what-students-should-know',
    },
    {
      question: 'Is AI allowed for Cambridge revision?',
      answer:
        'Check your school policy; use AI for explanations, not to generate answers you submit.',
      href: '/blog/chatgpt-and-ai-cambridge-exams-2026-rules',
    },
  ],
  'resources-tools': [
    {
      question: 'Free vs paid marking — what is worth paying for?',
      answer:
        'Pay for strict human marking or scheme-aligned tools — not generic essay grades.',
      href: '/compare',
    },
  ],
}

export function getFollowUpChain(clusterId: ContentClusterId): FollowUpItem[] {
  return FOLLOW_UP_CHAINS[clusterId] ?? []
}
