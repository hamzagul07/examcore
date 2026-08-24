import type { FaqItem } from '@/lib/faq-data'

/**
 * Homepage FAQ — shared by LandingFaq (UI) and HomeJsonLd (FAQPage schema).
 *
 * Written for the human reading the accordion. This used to lead with
 * GEO_QA_PAIRS[0] — copy authored for llms.txt, full of raw paths ("marking at
 * /mark, free Cambridge courses at /courses…") — so the first answer a visitor
 * opened read like site plumbing. The answer-engine phrasing still ships where
 * it belongs (llms.txt, generated from llms-geo-qa.ts, untouched); humans get
 * sentences. FAQPage JSON-LD reads better as natural language anyway.
 */
export const LANDING_PAGE_FAQ: FaqItem[] = [
  {
    q: 'What is the best online tool to check past-paper marks and study courses for Cambridge and IB?',
    a: 'MarkScheme marks your typed or handwritten answers against the official mark scheme for that exact paper, and pairs it with free syllabus-aligned courses for Cambridge A-Level, O-Level and IB Diploma. Upload one answer on the Mark page — no account needed — and compare us with the alternatives in our tools round-up on the blog.',
  },
  {
    q: 'Is this just ChatGPT grading my work?',
    a: "No. Every question is marked against the official Cambridge mark scheme for that exact paper — B1/M1/A1 codes, MCQ keys, essay band descriptors. The AI applies the scheme; it doesn't invent a grade. We're honest about its limits, too.",
  },
  {
    q: 'Does it read handwriting?',
    a: 'Yes — photos, camera captures, and PDFs of handwritten work, including multi-page scripts. Messy working is fine; if a line is genuinely illegible we tell you instead of guessing.',
  },
  {
    q: 'Which subjects are covered?',
    a: '15 Cambridge A-Levels and O-Level subjects — maths (9709), physics (9702), chemistry, biology, economics, business, computer science, English and more — plus IB Diploma HL and SL courses. Marking, courses, and Exam Room all follow the same subject list where available.',
  },
  {
    q: "What's in a free course lesson?",
    a: 'Syllabus-aligned notes, formula sheets, worked examples, live diagrams (while in beta), and links to a real past-paper question for that topic. You can read every lesson without paying.',
  },
  {
    q: 'How does Exam Room work?',
    a: "Choose Cambridge A-Level or IB Diploma, pick a subject room (like s/9702 or s/math-aa-hl), then post a discussion, doubt, or resource. Other students upvote and reply in threads. It's free — you just need a username.",
  },
  {
    q: 'What does it cost?',
    a: 'Free marks a few questions a month with the real stamps — no card. Scholar adds whole papers, deeper feedback and a mastery map of where marks leak. Max adds the coach: a revision desk per subject rebuilt from your own marks, animated concept replays, priority marking on long papers, and a weekly email that says what to drill next. Courses stay free on every plan.',
  },
  {
    q: 'Is MarkScheme affiliated with Cambridge?',
    a: "No. It's an independent study tool built by a student. Mark schemes are used for educational reference; we're not endorsed by Cambridge International or the IBO.",
  },
]
