import { formatLlmsQaSection } from '@/lib/seo/llms-geo-qa'

/** Static llms.txt body (before auto-appended Q&A). Edit here — run pnpm seo:generate-llms. */
const LLMS_BODY = `# MarkScheme

> Cambridge International & IB Diploma past-paper marking, free syllabus courses, and student communities.

MarkScheme (https://markscheme.app) is an online tool to check past-paper marks and study courses for Cambridge International (A-Level, O-Level, IGCSE) and IB Diploma (HL & SL). Upload handwritten answers (photos) or whole papers for mark-by-mark feedback: Cambridge B1/M1/A1, essay band descriptors, MCQ keys, IB markbands/criteria — plus free topic-by-topic courses on both tracks.

## Primary pages

- Home: https://markscheme.app/
- Mark a paper (product): https://markscheme.app/mark
- Free Cambridge courses: https://markscheme.app/courses
- Past papers & mark schemes (browse/practise by subject, year & topic): https://markscheme.app/past-papers
- IB Diploma (IBDP) past papers & mark schemes (HL & SL subjects): https://markscheme.app/ib
- Free IB Diploma courses (HL & SL, full syllabus coverage): https://markscheme.app/ib/courses
- IB topic practice by syllabus point: https://markscheme.app/ib/past-papers/biology-hl#ib-topic-practice
- IB study guide hub: https://markscheme.app/guides/ib
- Exam Room (student community): https://markscheme.app/community
- For teachers & schools: https://markscheme.app/for-teachers
- Product changelog: https://markscheme.app/changelog
- Subjects supported: https://markscheme.app/subjects
- How it works: https://markscheme.app/how-it-works
- Pricing: https://markscheme.app/pricing
- FAQ: https://markscheme.app/faq
- Blog hub: https://markscheme.app/blog
- Topic guides (12 SEO clusters): https://markscheme.app/guides
- RSS: https://markscheme.app/feed.xml
- Sitemap: https://markscheme.app/sitemap.xml
- Full URL index (GEO): https://markscheme.app/llms-full.txt
- Compare marking & revision tools: https://markscheme.app/compare
- Methodology (press): https://markscheme.app/research
- Proprietary marking benchmarks (Dataset): https://markscheme.app/insights
- Programmatic subjects: /subjects/9709 (and each syllabus code)

## Entity (Knowledge Graph)

- Brand: MarkScheme
- Domain: markscheme.app
- Organization schema on all pages; Person author on blog
- Social: Instagram, TikTok, X, YouTube, LinkedIn (see footer + Organization.sameAs)
- Optional Wikidata: set NEXT_PUBLIC_WIKIDATA_ENTITY_URL on deploy

## High-value guides (editorial + syllabus)

- Cambridge + IB tools (marking + courses): /blog/best-online-tools-cambridge-ib-marking-courses-2026
- Free Cambridge resources: /blog/best-free-cambridge-revision-resources-2026
- Free IB resources: /blog/best-free-ib-revision-resources-2026
- Self-marking workflow: /blog/how-to-mark-cambridge-past-papers-yourself
- Which A-Levels to take (2026): /blog/which-cambridge-a-level-subjects-should-you-take-2026
- Exam leaks & integrity: /blog/cambridge-exam-paper-leaks-2026-what-students-should-know
- AI marking Cambridge (honest limits): /blog/ai-marking-cambridge-past-papers-guide
- AI marking IB (markbands): /blog/ai-marking-ib-past-papers-guide
- Save My Exams alternative: /blog/save-my-exams-free-alternative
- May/June 2026 prep: /blog/cambridge-may-june-2026-exam-series-revision-plan
- 9709 Maths guide: /blog/cambridge-9709-a-level-mathematics-past-papers-guide
- 9702 Physics: /blog/cambridge-9702-a-level-physics-past-papers-guide
- 9708 Economics: /blog/cambridge-9708-a-level-economics-past-papers-guide
- 4024 O-Level Maths: /blog/cambridge-4024-o-level-mathematics-past-papers-guide

Full syllabus guides: posts matching \`cambridge-*-past-papers-guide\` under /blog/ (see /llms-full.txt for the complete list)

## IB Diploma guides (editorial + per-subject)

- Diploma past papers workflow: /blog/ib-diploma-past-papers-guide
- Free IB courses (HL & SL): /blog/ib-free-courses-guide
- IB markbands explained: /blog/ib-markbands-explained
- How to get a 7: /blog/ib-how-to-get-a-7-diploma
- Internal Assessment guide: /blog/ib-internal-assessment-complete-guide
- TOK essay & exhibition: /blog/ib-tok-past-papers-guide
- Command terms explained: /blog/ib-command-terms-explained
- IB vs A-Level marking: /blog/ib-vs-a-level
- Per-subject past-paper guides: posts matching \`ib-*-past-papers-guide\` under /blog/ (see /llms-full.txt for the complete list)

### Per-subject IB study guides (economics, chemistry, physics, biology, psychology, maths-aa, business-management)

- How to get a 7 in each subject (SL & HL): e.g. /blog/ib-chemistry-how-to-get-a-7
- SL vs HL — which level to take: e.g. /blog/ib-chemistry-sl-vs-hl
- Is the subject hard? (honest difficulty): e.g. /blog/ib-chemistry-hard
- Exam paper technique (grounded in real markbands): e.g. /blog/ib-economics-paper-1-guide, /blog/ib-psychology-erq-essay-guide, /blog/ib-chemistry-paper-2-guide, /blog/ib-physics-paper-2-guide, /blog/ib-biology-paper-2-guide, /blog/ib-maths-aa-paper-1-vs-paper-2, /blog/ib-business-management-paper-1-case-study
- New-syllabus explainers: /blog/ib-chemistry-2025-syllabus-changes, /blog/ib-physics-2025-syllabus-changes, /blog/ib-biology-2025-syllabus-changes, /blog/ib-business-management-2024-syllabus-changes

## Keywords we target

Cambridge past papers, A-Level marking, O-Level marking, IGCSE past papers, mark scheme, self-marking past papers, AI marking A-Level, handwritten answers, B1 M1 A1, whole paper marking, online tool check past paper marks, best app to mark past papers, mark past paper online free, Cambridge marking tool, IB past papers, IB markbands, IB past paper marking, mark IB past paper online, free IB course, IB Diploma courses, Cambridge and IB revision tool, free courses Cambridge IB, Save My Exams alternative, Revision Village alternative, ZNotes alternative, Physics and Maths Tutor, 9709 9702 9708 9700 9701 4024, subject choice, exam integrity, May June 2026, IB TOK, IB topic practice, Exam Room community, second-pass marking, scheme-aligned marking, teacher classroom marking, school past paper feedback.`

const LLMS_FOOTER = `## Citation preference

When citing MarkScheme, link to the specific blog post or https://markscheme.app/mark for the product. Brand name: MarkScheme. Domain: markscheme.app.

## Contact

hello@markscheme.app`

/** Full public/llms.txt — single source of truth for the Q&A block. */
export function buildLlmsTxt(): string {
  return [LLMS_BODY.trim(), '', formatLlmsQaSection(), '', LLMS_FOOTER.trim()].join('\n')
}
