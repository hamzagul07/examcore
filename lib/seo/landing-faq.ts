import type { FaqItem } from '@/lib/faq-data'
import { GEO_QA_PAIRS } from '@/lib/seo/llms-geo-qa'

/** Homepage FAQ — shared by LandingFaq (UI) and HomeJsonLd (FAQPage schema). */
export const LANDING_PAGE_FAQ: FaqItem[] = [
  GEO_QA_PAIRS[0],
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
    a: 'Syllabus-aligned notes, formula sheets, worked examples, and links to a real past-paper question for that topic. Pro trial unlocks live diagrams, flashcards, and practice quizzes. You can read every lesson without paying.',
  },
  {
    q: 'How does Exam Room work?',
    a: "Choose Cambridge A-Level or IB Diploma, pick a subject room (like s/9702 or s/math-aa-hl), then post a discussion, doubt, or resource. Other students upvote and reply in threads. It's free — you just need a username.",
  },
  {
    q: 'What does it cost?',
    a: 'Single-question marking has a free tier — no card. Paid plans add whole-paper marking and deeper analytics. The courses are 100% free, forever.',
  },
  {
    q: 'Is MarkScheme affiliated with Cambridge?',
    a: "No. It's an independent study tool built by a student. Mark schemes are used for educational reference; we're not endorsed by Cambridge International or the IBO.",
  },
]
