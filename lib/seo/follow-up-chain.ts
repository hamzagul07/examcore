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
    {
      question: 'Which topics repeat most on science papers?',
      answer:
        'Cells, enzymes, stoichiometry, and mechanics dominate marks — rank your practice by frequency, not guesswork.',
      href: '/blog/most-repeated-cambridge-science-past-paper-topics-2026',
    },
    {
      question: 'Which calculation-heavy topics repeat on accounting papers?',
      answer:
        'Financial statements, adjustments, ratios and costing variances dominate 9706 — mark every label and working against the scheme.',
      href: '/blog/most-repeated-cambridge-accounting-past-paper-topics-2026',
    },
    {
      question: 'Which humanities topics repeat most?',
      answer:
        'Family/education debates in sociology, case-study depth in geography, source/essay structures in history, and set-text + thematic evaluation in Islamic Studies — rank practice by skill pattern, not random chapters.',
      href: '/blog/most-repeated-cambridge-sociology-past-paper-topics-2026',
    },
    {
      question: 'Which Islamic Studies essay themes repeat on 9488?',
      answer:
        'Set-text explanation, schools-of-thought comparison, and modern-world evaluation dominate — mark every citation against band descriptors.',
      href: '/blog/most-repeated-cambridge-islamic-studies-past-paper-topics-2026',
    },
    {
      question: 'What should I do after exams before results day?',
      answer:
        'Build an evidence file: marked mocks, component codes, and honest grade estimates — not leak rumours.',
      href: '/blog/cambridge-post-exam-results-prep-2026',
    },
    {
      question: 'What should IB students do while waiting for July results?',
      answer:
        'Save marked scripts and IA feedback, estimate bands honestly, and plan EUR criteria before results land — not social media thresholds.',
      href: '/blog/ib-post-exam-results-prep-2026',
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
      question: 'What are Cambridge assessed marks?',
      answer:
        'Calculated component marks when a paper is voided — based on your performance on other syllabus papers.',
      href: '/blog/cambridge-assessed-marks-2026-explained',
    },
    {
      question: 'When is the 9709 maths resit in June 2026?',
      answer:
        'Replacement sittings were scheduled for 8–9 June 2026 in affected zones — confirm with your exams officer.',
      href: '/blog/cambridge-9709-maths-resit-june-2026',
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
    {
      question: 'What should I do in the weeks before results?',
      answer:
        'Save marked scripts, list your component codes, and estimate grades from evidence — not social media thresholds.',
      href: '/blog/cambridge-post-exam-results-prep-2026',
    },
    {
      question: 'What is a component marks report?',
      answer:
        'A per-paper breakdown on your results statement — use it to decide remarks and resits with your exams officer.',
      href: '/blog/cambridge-component-marks-report-explained-2026',
    },
    {
      question: 'Where are 9231 Further Maths grade boundaries for 2026?',
      answer:
        'Same August window as 9709 — grades 11 August, threshold PDFs ~13 August. Mark B/M/A separately on long proofs.',
      href: '/blog/cambridge-9231-further-mathematics-grade-boundaries-2026',
    },
    {
      question: 'When are O-Level and IGCSE June 2026 results?',
      answer:
        'IGCSE and O Level grades release 18 August 2026 (06:00 GMT) — component threshold PDFs still publish around 13 August.',
      href: '/blog/cambridge-4024-mathematics-grade-boundaries-2026',
    },
    {
      question: 'Where are 0580 IGCSE Maths grade boundaries for 2026?',
      answer:
        'IGCSE grades release 18 August; threshold PDFs ~13 August — Extended route uses Papers 2+4; mark with M marks shown.',
      href: '/blog/cambridge-0580-mathematics-grade-boundaries-2026',
    },
    {
      question: 'Where are 0610 IGCSE Biology grade boundaries for 2026?',
      answer:
        'IGCSE grades release 18 August; threshold PDFs ~13 August — mark MCQ and structured answers to scheme wording, then use the calculator.',
      href: '/blog/cambridge-0610-biology-grade-boundaries-2026',
    },
    {
      question: 'Where are 0620/0625 IGCSE science grade boundaries for 2026?',
      answer:
        'Same August window as 0610 — grades 18 August, component thresholds ~13 August. Mark moles and working strictly before estimating.',
      href: '/blog/cambridge-0620-chemistry-grade-boundaries-2026',
    },
    {
      question: 'Where are 9709 maths grade boundaries for 2026?',
      answer:
        'Grades release 11 August; threshold tables ~13 August — use the calculator with recent sessions until the official PDF loads.',
      href: '/blog/cambridge-9709-mathematics-grade-boundaries-2026',
    },
    {
      question: 'How do I estimate Biology or Physics boundaries?',
      answer:
        'Mark a recent past paper to raw marks, then compare to the last two sessions in the subject calculator — not social media predictions.',
      href: '/blog/cambridge-9700-biology-grade-boundaries-2026',
    },
    {
      question: 'Where are O-Level science grade boundaries for 2026?',
      answer:
        '5090/5070/5054 grades release 18 August; threshold PDFs ~13 August — mark MCQ and theory to scheme wording, then use the subject calculator.',
      href: '/blog/cambridge-5090-biology-grade-boundaries-2026',
    },
    {
      question: 'Where are 9699 Sociology grade boundaries for 2026?',
      answer:
        'Grades release 11 August; threshold tables ~13 August — use the calculator with recent sessions until the official PDF loads.',
      href: '/blog/cambridge-9699-sociology-grade-boundaries-2026',
    },
    {
      question: 'Where are 9695 Literature grade boundaries for 2026?',
      answer:
        'A-Level grades release 11 August; threshold PDFs ~13 August — mark essays to band descriptors, then use the 9695 calculator with recent sessions.',
      href: '/blog/cambridge-9695-literature-in-english-grade-boundaries-2026',
    },
    {
      question: 'Where are 0990 IGCSE English grade boundaries for 2026?',
      answer:
        'IGCSE grades release 18 August; 0990 uses 9–1 grading — compare marked reading and writing papers to recent component thresholds, not social media.',
      href: '/blog/cambridge-0990-first-language-english-grade-boundaries-2026',
    },
    {
      question: 'Where are 9696 Geography grade boundaries for 2026?',
      answer:
        'Grades release 11 August; threshold PDFs ~13 August — mark case-study essays to band descriptors, then use the calculator with recent sessions.',
      href: '/blog/cambridge-9696-geography-grade-boundaries-2026',
    },
    {
      question: 'When will June 2026 threshold tables be published?',
      answer:
        'Grades land 11 August; component threshold PDFs typically publish around 13 August — see our May/June 2026 expectations guide.',
      href: '/blog/cambridge-may-june-2026-grade-thresholds-what-to-expect',
    },
    {
      question: 'What should I do on Cambridge A-Level results day?',
      answer:
        'Save your PDF statement, compare to your evidence file, and speak to your exams officer within 48 hours if a grade surprises you — not social media.',
      href: '/blog/cambridge-results-day-august-2026-guide',
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
        'IB uses markbands and assessment criteria rather than point-based A-Level marking — examiners place your answer in a level band against descriptors.',
      href: '/ib',
    },
    {
      question: 'How do I practise one syllabus topic at a time?',
      answer:
        'Open a subject past-papers page and use Practice by topic — each point links to a lesson and criterion marking task.',
      href: '/ib/past-papers/biology-hl',
    },
    {
      question: 'Where is the full list of free IB courses?',
      answer:
        'The free courses guide maps every HL and SL subject — sciences, humanities, languages, maths, Core, and Group 6 arts — with links to lessons and topic practice.',
      href: '/blog/ib-free-courses-guide',
    },
    {
      question: 'What is the difference between HL and SL?',
      answer:
        'Higher Level covers more content and usually an extra paper with greater depth; Standard Level is a lighter syllabus. Each subject page lists both.',
      href: '/ib/subjects',
    },
    {
      question: 'How do I write the TOK exhibition commentary?',
      answer:
        'Pick three specific objects, one official prompt, and analyse knowledge links — not description. Stay within 950 words total.',
      href: '/blog/ib-tok-exhibition-guide-2026',
    },
    {
      question: 'Are IB exams going digital in 2026?',
      answer:
        'Selected schools pilot digital IBDP exams from May 2026; most students still sit paper. Grade boundaries equate both modes.',
      href: '/blog/ib-digital-exams-2026-student-guide',
    },
    {
      question: 'When do IB May 2026 results come out?',
      answer:
        'Early July 2026 — log in at candidates.ibo.org with your coordinator PIN. Read pass rules before you post grades online.',
      href: '/blog/ib-results-day-2026-what-to-expect',
    },
    {
      question: 'What should I do after IB exams before results?',
      answer:
        'Build an evidence file from marked mocks and IA feedback — decide EUR criteria now so results day is a decision, not a panic.',
      href: '/blog/ib-post-exam-results-prep-2026',
    },
    {
      question: 'Where are IB grade boundaries for 2026?',
      answer:
        'Published with results in July — your coordinator has the official tables. Use them to decide on EUR, not social media guesses.',
      href: '/blog/ib-grade-boundaries-explained',
    },
  ],
}

export function getFollowUpChain(clusterId: ContentClusterId): FollowUpItem[] {
  return FOLLOW_UP_CHAINS[clusterId] ?? []
}

const SLUG_FOLLOW_UPS: Record<string, FollowUpItem[]> = {
  'cambridge-2281-o-level-economics-past-papers-guide': [
    {
      question: 'Is there a free 2281 Economics course?',
      answer:
        'Yes — topic-by-topic O-Level lessons with diagrams on demand, elasticity, and macro policy, plus past-paper marking on every syllabus point.',
      href: '/courses/2281',
    },
    {
      question: 'Where are 2281 grade boundaries for 2026?',
      answer:
        'Threshold tables publish around 13 August after the June series — use the calculator with recent sessions until then.',
      href: '/blog/cambridge-2281-economics-grade-boundaries-2026',
    },
  ],
  'cambridge-7115-o-level-business-studies-past-papers-guide': [
    {
      question: 'Is there a free 7115 Business course?',
      answer:
        'Yes — case-style topics including marketing mix, break-even, and accounts, each with a real past-paper practice link.',
      href: '/courses/7115',
    },
    {
      question: 'How do I improve application marks on Paper 2?',
      answer:
        'Name the business in the case, quote stimulus data, and balance advantages against disadvantages — practise on marketing mix and finance lessons first.',
      href: '/courses/7115/3-3-marketing-mix',
    },
  ],
}

/** Cluster chain plus slug-specific follow-ups (O-Level traffic guides, etc.). */
export function getFollowUpChainForSlug(
  slug: string,
  clusterId: ContentClusterId
): FollowUpItem[] {
  const extra = SLUG_FOLLOW_UPS[slug] ?? []
  const base = getFollowUpChain(clusterId)
  return extra.length ? [...extra, ...base] : base
}
