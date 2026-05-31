export type FaqItem = { q: string; a: string }
export type FaqCategory = { id: string; title: string; items: FaqItem[] }

export const FAQ_CATEGORIES: FaqCategory[] = [
  {
    id: 'getting-started',
    title: 'Getting started',
    items: [
      {
        q: 'How do I sign up?',
        a: 'Create an account with your email — magic link or password. No card required on the Free plan. After signup, pick your subjects and upload your first answer.',
      },
      {
        q: 'How do I mark my first question?',
        a: 'Go to Mark, choose your subject and paper (or upload a photo of the question), snap or upload your handwritten working, and submit. Most single questions return feedback in under a minute.',
      },
      {
        q: 'Which subjects are covered?',
        a: 'Fifteen Cambridge A-Levels: Mathematics, Further Mathematics, Physics, Chemistry, Biology, Economics, Business, Accounting, Computer Science, Psychology, Sociology, History, Law, Islamic Studies, and Media Studies.',
      },
      {
        q: 'Do I need a teacher account?',
        a: 'No — Examcore is built for students revising on their own. Teacher features exist for classroom use, but individual students can sign up and mark immediately.',
      },
      {
        q: 'Can I use it on my phone?',
        a: 'Yes. Upload from your camera or photo library. The marking flow works on mobile — a larger screen is nicer for reading detailed feedback, but phone uploads work fine.',
      },
      {
        q: 'Is this allowed for revision?',
        a: 'Marking your own past papers is normal revision. Examcore marks work you have already done — like checking against a mark scheme yourself, but faster and more thorough.',
      },
    ],
  },
  {
    id: 'marking',
    title: 'About the marking',
    items: [
      {
        q: 'Does it really mark like Cambridge?',
        a: 'It uses the official Cambridge mark scheme for each paper. Point-based questions follow B1/M1/A1 exactly. Essays are judged against the real band descriptors.',
      },
      {
        q: 'How does the marking engine work?',
        a: 'We pull the real mark scheme for your paper and question, read your uploaded working (handwriting or typed), and apply the appropriate style — MCQ keys, step marks, or essay bands. The AI is guided by the scheme, not a generic rubric.',
      },
      {
        q: 'What if it gets something wrong?',
        a: "AI marking isn't perfect — examiners aren't either. The feedback is detailed enough that you can disagree and still learn. Treat it as a study partner, not your final grade.",
      },
      {
        q: 'My handwriting is messy — will it work?',
        a: 'It reads handwritten answers from photos. Clearer helps, but messy is usually fine — upload a decent snap and give it a go.',
      },
      {
        q: 'Can it mark essays?',
        a: 'Yes — History, Sociology, Law, Media Studies, and others. The engine detects whether a question is MCQ, point-based, or an essay, and marks it the right way using Cambridge band descriptors.',
      },
      {
        q: 'What is Examiner\'s Ink?',
        a: 'Visual feedback anchored to your actual handwriting — stamps and notes on the lines where marks were earned or lost, not just a paragraph at the bottom. Available on the Free plan.',
      },
      {
        q: 'Can I upload a whole paper?',
        a: 'Whole-paper marking is available on any paid plan. Upload multiple pages, assign them to questions, and get per-question marks plus a projected grade if you only attempted some questions.',
      },
    ],
  },
  {
    id: 'data',
    title: 'About my data',
    items: [
      {
        q: 'Who can see my uploaded work?',
        a: 'Only you (and teachers if you join a classroom). Your scripts are tied to your account and not shared publicly.',
      },
      {
        q: 'Is my data used to train AI models?',
        a: 'We use your uploads to provide marking for you. We do not sell your data. Third-party AI providers process content to deliver marking — see our Privacy Policy for details.',
      },
      {
        q: 'Can I delete my account and data?',
        a: 'Yes. Contact us at hello@examcore.ai or use account settings when deletion is available. We will remove your account and associated uploads on request.',
      },
      {
        q: 'Where is my data stored?',
        a: 'Account data and uploads are stored securely via Supabase (hosted infrastructure). See the Privacy Policy for third-party processors.',
      },
      {
        q: 'Do you share data with Cambridge?',
        a: 'No. Examcore is not affiliated with or endorsed by Cambridge International. We do not send your work to Cambridge.',
      },
    ],
  },
  {
    id: 'pricing',
    title: 'Pricing',
    items: [
      {
        q: 'Is there a free plan?',
        a: 'Yes. Free includes 5 questions and 10 Omni messages per month across all fifteen subjects, plus Examiner\'s Ink on single-question marking. No card required.',
      },
      {
        q: 'I signed up during early access — what happens to my pricing?',
        a: 'You\'re a founding member. You get 50% off any paid plan, locked in forever. That discount applies even as we add features or raise prices for new users — your founding rate is permanent.',
      },
      {
        q: 'What counts as one question?',
        a: 'Whether you submit a single question or a whole paper, it counts as one question against your monthly allowance. Whole papers don\'t cost more even if they contain 15 sub-questions.',
      },
      {
        q: 'What happens when I run out mid-month?',
        a: 'Buy a credit top-up or upgrade to a higher plan. Credits work for questions or Omni messages and never expire.',
      },
      {
        q: 'Do teachers pay separately?',
        a: 'Teacher and classroom features may have different pricing. Student plans apply to individual student accounts.',
      },
    ],
  },
  {
    id: 'technical',
    title: 'Technical',
    items: [
      {
        q: 'What file types can I upload?',
        a: 'Photos (JPEG, PNG, HEIC from most phones), camera capture, and PDFs for multi-page scripts. Images are compressed before upload to keep things fast.',
      },
      {
        q: 'What if I have a long paper?',
        a: 'Use whole-paper mode on a paid plan: upload all pages, reorder if needed, and assign pages to question numbers. Marking runs per question and may take a few minutes for a full script.',
      },
      {
        q: 'Does it work offline?',
        a: 'No — marking requires an internet connection because processing runs on our servers.',
      },
      {
        q: 'Which browsers are supported?',
        a: 'Modern Chrome, Safari, Firefox, and Edge on desktop and mobile. If something breaks, try updating your browser or contact us.',
      },
      {
        q: 'Why is marking slow sometimes?',
        a: 'Whole papers and essay questions take longer than a single maths question. Complex handwriting or large PDFs add processing time. We show progress while marking runs.',
      },
    ],
  },
]

/** Compact FAQ for the landing page section */
export const LANDING_FAQ_ITEMS: FaqItem[] = [
  FAQ_CATEGORIES[0].items[5],
  FAQ_CATEGORIES[1].items[0],
  FAQ_CATEGORIES[1].items[2],
  FAQ_CATEGORIES[0].items[2],
  FAQ_CATEGORIES[1].items[4],
  FAQ_CATEGORIES[3].items[0],
  FAQ_CATEGORIES[1].items[3],
]
