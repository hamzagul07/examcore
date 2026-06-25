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
  'grade-boundaries': [
    {
      question: 'Where do I find official grade thresholds?',
      answer:
        'Cambridge publishes per-syllabus, per-session grade threshold tables on results day — your exams officer also receives them in the results pack.',
      href: '/guides/grade-boundaries',
    },
    {
      question: 'How do I turn my raw marks into a grade?',
      answer:
        'Add your component raw marks and compare against the most recent published thresholds — our calculator does this for the major syllabuses.',
      href: '/tools/grade-boundary-calculator',
    },
    {
      question: 'Why do boundaries change every year?',
      answer:
        'Cambridge adjusts thresholds so a grade means the same standard year on year — if a paper is harder, the boundary drops.',
      href: '/guides/grade-boundaries',
    },
  ],
  'command-words': [
    {
      question: 'What does the command word actually change?',
      answer:
        'It sets the depth required: “state” wants a fact, “explain” wants reasoning, “evaluate” wants a judged argument with both sides.',
      href: '/tools/command-words',
    },
    {
      question: 'Why do I lose marks when my content is correct?',
      answer:
        'Examiner reports cite command-word misreading as the top mark loss — describing when asked to explain earns nothing extra.',
      href: '/blog/cambridge-command-words-explained',
    },
    {
      question: 'How do I practise command words?',
      answer:
        'Circle the command word, answer five past-paper questions on the same verb back to back, and mark each against the scheme.',
      href: '/mark',
    },
  ],
  'free-alternatives': [
    {
      question: 'What can I get for free instead of paying?',
      answer:
        'Official Cambridge PDFs, free community notes, and scheme-aligned AI marking cover most needs before any subscription.',
      href: '/guides/free-alternatives',
    },
    {
      question: 'Is free marking actually accurate?',
      answer:
        'When it compares your answer against the real mark scheme rather than guessing a grade, yes — that is the test to apply.',
      href: '/mark',
    },
  ],
  ib: [
    {
      question: 'Where can I find IB past papers?',
      answer:
        'Browse every IB Diploma subject at HL and SL by exam session and paper, with mark-scheme and markband guidance for each.',
      href: '/ib/past-papers',
    },
    {
      question: 'Are there free IB courses on MarkScheme?',
      answer:
        'Yes — free topic-by-topic IB Diploma courses for all HL and SL subjects with lessons, including sciences, maths, humanities, languages, Core, and Group 6 arts — with criterion practice marking on every lesson.',
      href: '/ib/courses',
    },
    {
      question: 'How is IB marking different from A-Level?',
      answer:
        'IB uses markbands and assessment criteria rather than B1/M1/A1 codes — examiners place your answer in a level band against descriptors.',
      href: '/ib',
    },
    {
      question: 'How do I practise one syllabus topic at a time?',
      answer:
        'Open a subject past-papers page and use Practice by topic — each point links to a lesson and criterion marking task.',
      href: '/ib/past-papers/biology-hl',
    },
    {
      question: 'What is the difference between HL and SL?',
      answer:
        'Higher Level covers more content and usually an extra paper with greater depth; Standard Level is a lighter syllabus. Each subject page lists both.',
      href: '/ib/subjects',
    },
  ],
}

export function getFollowUpChain(clusterId: ContentClusterId): FollowUpItem[] {
  return FOLLOW_UP_CHAINS[clusterId] ?? []
}
