/**
 * Keyword-targeted blog generator — Gemini Pro on Vertex (funded), brief-driven.
 *
 * Frontmatter is assembled DETERMINISTICALLY from each brief (zero format risk);
 * only the markdown BODY is AI-generated, grounded in brief.facts[] and constrained
 * by brief.mustNotClaim[]. Slugs are named so lib/seo/post-seo.ts infers the right
 * schema (how-to- => HowTo, best-/which- => ItemList) and lib/seo/clusters.ts routes
 * them to the right hub.
 *
 * Usage:
 *   node scripts/generate-keyword-blog-posts.mjs            # dry -> tmp/keyword-drafts/
 *   node scripts/generate-keyword-blog-posts.mjs --only 9709 --only command
 *   node scripts/generate-keyword-blog-posts.mjs --write    # promote -> content/blog/
 *   node scripts/generate-keyword-blog-posts.mjs --force    # overwrite existing
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs'
import { join, delimiter } from 'path'

for (const line of readFileSync('.env.local', 'utf8').split('\n')) {
  const t = line.trim(); if (!t || t.startsWith('#')) continue
  const eq = t.indexOf('='); if (eq < 0) continue
  const k = t.slice(0, eq).trim(); let v = t.slice(eq + 1).trim()
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1)
  if (process.env[k] === undefined) process.env[k] = v
}
process.env.USE_VERTEX_AI = 'true'

// Resolve the Next-only `server-only` import (pulled in transitively by lib/seo
// modules) to a local no-op shim. pnpm does not hoist `server-only`, and the real
// package throws outside React Server Components — so bare `node`/`tsx` would fail.
// NODE_PATH only affects this process, never the Next build. Run via: npm run content:generate
process.env.NODE_PATH = [process.env.NODE_PATH, join(process.cwd(), 'scripts', 'shims')]
  .filter(Boolean)
  .join(delimiter)
const { Module } = await import('node:module')
Module._initPaths()

const { generateGeminiText } = await import('../lib/ai/gemini-text.ts')
const { jsonrepair } = await import('jsonrepair')
const { getClusterForSlug } = await import('../lib/seo/clusters.ts')
const { getPostSeoMeta } = await import('../lib/seo/post-seo.ts')

const args = process.argv.slice(2)
const WRITE = args.includes('--write')
const FORCE = args.includes('--force')
const ONLY = args.filter((_, i) => args[i - 1] === '--only')
const DATE = '2026-06-19'
const OUT_DIR = WRITE ? join('content', 'blog') : join('tmp', 'keyword-drafts')
mkdirSync(OUT_DIR, { recursive: true })

// ---------- subject data ----------
const SUBJECTS = {
  '9709': { name: 'Mathematics', level: 'A-Level', label: 'mathematics',
    papers: 'Pure Mathematics (P1/P3), Mechanics (M1), and Probability & Statistics (S1/S2) components, written as 9709/XX',
    marking: 'point marks — B1 (independent), M1 (method), A1 (accuracy)' },
  '9702': { name: 'Physics', level: 'A-Level', label: 'physics',
    papers: 'multiple choice (Paper 1), AS structured (Paper 2), A2 structured (Paper 4), and practical skills (Papers 3/5)',
    marking: 'point marks for formula, substitution, answer with unit and sensible significant figures' },
  '9701': { name: 'Chemistry', level: 'A-Level', label: 'chemistry',
    papers: 'multiple choice (Paper 1), AS structured (Paper 2), A2 structured (Paper 4), and practical (Papers 3/5)',
    marking: 'point marks; equations, state symbols, units and curly-arrow mechanisms must be precise' },
  '9700': { name: 'Biology', level: 'A-Level', label: 'biology',
    papers: 'multiple choice (Paper 1), AS structured (Paper 2), A2 structured (Paper 4), and practical (Papers 3/5)',
    marking: 'keyword point marks with acceptable/allow/reject lists — exact terminology matters' },
  '9708': { name: 'Economics', level: 'A-Level', label: 'economics',
    papers: 'multiple choice, data response and essay components across AS and A2',
    marking: 'level-of-response bands (knowledge, application, analysis, evaluation) for essays; point marks for data response' },
  '9609': { name: 'Business', level: 'A-Level', label: 'business',
    papers: 'case-study papers and essay papers',
    marking: 'level-of-response — application to the case, analysis, and evaluation with a justified judgement' },
  '9990': { name: 'Psychology', level: 'A-Level', label: 'psychology',
    papers: 'core studies, approaches and applied options with short-tariff and essay responses',
    marking: 'marks for named studies, application to scenarios, and evaluation of methodology and ethics' },
  '9489': { name: 'History', level: 'A-Level', label: 'history',
    papers: 'document-based and essay papers depending on your chosen topics',
    marking: 'level-of-response bands rewarding argument, specific evidence and historiography' },
  '9706': { name: 'Accounting', level: 'A-Level', label: 'accounting',
    papers: 'structured papers covering financial statements, ratios and decision-making',
    marking: 'point marks for correct figures, labels and treatments, with working required for calculation marks' },
  '4024': { name: 'Mathematics', level: 'O-Level', label: 'mathematics',
    papers: 'a non-calculator paper and a calculator paper',
    marking: 'point marks rewarding clear method and accuracy — working must be shown' },
  '9699': { name: 'Sociology', level: 'A-Level', label: 'sociology',
    papers: 'essay and shorter theory questions across family, education, crime and theory',
    marking: 'level-of-response bands rewarding concepts, application and evaluation with named theorists' },
  '9084': { name: 'Law', level: 'A-Level', label: 'law',
    papers: 'scenario problem questions and essay papers',
    marking: 'level-of-response — issue, rule, application, conclusion for problems; authority and balance for essays' },
  '9231': { name: 'Further Mathematics', level: 'A-Level', label: 'further-mathematics',
    papers: 'Further Pure, Further Mechanics and Further Probability & Statistics components, building on 9709',
    marking: 'point marks — B1/M1/A1 with long chained method marks and rigorous proof' },
  '4037': { name: 'Additional Mathematics', level: 'O-Level', label: 'additional-mathematics',
    papers: 'a single syllabus bridging O-Level Maths and A-Level — algebra, functions, coordinate geometry and introductory calculus',
    marking: 'point marks rewarding method and accuracy, with chains of reasoning for calculus' },
  '5090': { name: 'Biology', level: 'O-Level', label: 'biology',
    papers: 'theory papers plus a practical assessment across cells, physiology, ecology and genetics',
    marking: 'keyword point marks — syllabus terminology required' },
  '5070': { name: 'Chemistry', level: 'O-Level', label: 'chemistry',
    papers: 'theory and practical components with strong emphasis on equations, bonding and qualitative analysis',
    marking: 'point marks — precise chemical language and balanced equations required' },
  '5054': { name: 'Physics', level: 'O-Level', label: 'physics',
    papers: 'theory papers covering mechanics, waves, electricity, thermal and atomic physics',
    marking: 'point marks — show working for calculations and state laws precisely' },
  '2281': { name: 'Economics', level: 'O-Level', label: 'economics',
    papers: 'structured theory and data-response questions at O-Level depth',
    marking: 'mixed — definitions, explained diagrams and applied examples score' },
  '7115': { name: 'Business Studies', level: 'O-Level', label: 'business-studies',
    papers: 'case-based and structured questions on enterprise, marketing, finance and operations',
    marking: 'mixed — applied answers referencing the business in the stimulus' },
  '7707': { name: 'Accounting', level: 'O-Level', label: 'accounting',
    papers: 'bookkeeping, final accounts and basic interpretation with clear layouts expected',
    marking: 'point marks — format marks for ledgers and statements; figures must balance' },
  '9488': { name: 'Islamic Studies', level: 'A-Level', label: 'islamic-studies',
    papers: 'textual knowledge, themes and evaluative essays across the syllabus topics',
    marking: 'level-of-response — accurate source reference, explanation and balanced evaluation' },
  '9618': { name: 'Computer Science', level: 'A-Level', label: 'computer-science',
    papers: 'theory (Paper 1), problem-solving & programming (Paper 2) and advanced theory (Paper 3)',
    marking: 'point marks — correct algorithms, trace tables, logic and precise technical vocabulary' },
  '2210': { name: 'Computer Science', level: 'O-Level', label: 'computer-science',
    papers: 'theory and problem-solving papers with algorithms, databases and hardware topics',
    marking: 'point marks — precise technical terms and complete pseudocode/flowchart logic' },
  '9607': { name: 'Media Studies', level: 'A-Level', label: 'media-studies',
    papers: 'analysis of media forms, industries and representations plus coursework where applicable',
    marking: 'level-of-response — terminology, named examples and analysis of how meaning is constructed' },
}

// ---------- command word definitions (Cambridge official glossary) ----------
const COMMAND_WORDS = {
  evaluate: 'judge or weigh up the quality, importance or success of something, using evidence on both sides, and reach a supported conclusion',
  explain: 'set out the reasons or causes (the "why" and "how"), making relationships between things clear — not just describing them',
  discuss: 'write about an issue from more than one point of view, considering arguments for and against before reaching a view',
  analyse: 'examine something in detail, breaking it into parts to show meaning, causes or relationships',
  assess: 'make an informed judgement about the importance or value of something, supported by evidence',
  describe: 'state the main features or characteristics of something, in an ordered way, without giving reasons',
  justify: 'support a case, decision or conclusion with evidence and reasoned argument, addressing the alternative',
  compare: 'identify the similarities and differences between two or more things, point by point rather than separately',
  'to-what-extent': 'judge how far a statement or claim is true, weighing supporting and opposing evidence, and state the degree of agreement',
}

// ---------- briefs ----------
const briefs = []

// 1. Grade-boundaries pillar (how-to => HowTo schema)
briefs.push({
  slug: 'how-to-read-cambridge-grade-boundaries',
  cluster: 'grade-boundaries', format: 'howto', category: 'mark-schemes',
  title: 'How to read Cambridge grade boundaries (with examples)',
  description: 'Understand Cambridge grade thresholds: where to find them, how raw marks convert to an A*–E grade, and why boundaries move every session.',
  keywords: 'Cambridge grade boundaries, how to read grade boundaries, grade thresholds Cambridge, raw marks to grade, A Level grade boundaries',
  facts: [
    'Cambridge International A Level grades run A* to E; AS Level grades run a to e.',
    'Cambridge publishes a "grade threshold" table for each syllabus, for each exam session, on results day.',
    'Thresholds are raw marks (a number of marks), set after all scripts are marked, so that a grade represents the same standard year on year.',
    'If a paper is harder than usual, the boundary is set lower; if easier, higher — so you cannot rely on a fixed percentage like "80% is always an A".',
    'The full A Level grade is awarded on your overall aggregate across AS and A2 components, not on a single paper; A* requires strong A2 performance.',
    'June 2026 results are released on 13 August 2026; the threshold tables are published that morning.',
    'You find thresholds on the Cambridge International website (Grade threshold tables) or from your school exams officer.',
  ],
  mustNotClaim: [
    'Do NOT state any specific 2026 grade boundary numbers — they are not published until results day.',
    'Do NOT claim a fixed percentage always equals a given grade.',
  ],
  links: [['/tools/grade-boundary-calculator', 'grade boundary calculator'], ['/mark', 'mark a past paper']],
})

// 2. Per-subject grade boundaries — every marking subject
for (const code of Object.keys(SUBJECTS)) {
  const s = SUBJECTS[code]
  briefs.push({
    slug: `cambridge-${code}-${s.label}-grade-boundaries-2026`,
    cluster: 'grade-boundaries', format: 'guide', category: 'mark-schemes',
    title: `Cambridge ${code} ${s.name} grade boundaries 2026 explained`,
    description: `How ${code} ${s.name} (${s.level}) grade boundaries work, where to find the official thresholds, and how to estimate your grade from recent sessions.`,
    keywords: `${code} grade boundaries, ${code} grade boundaries 2026, Cambridge ${s.name} grade boundaries, ${code} ${s.label} thresholds, ${code} raw marks to grade`,
    facts: [
      `${code} is Cambridge ${s.level} ${s.name}.`,
      `Its papers: ${s.papers}.`,
      `Marking: ${s.marking}.`,
      'Grade thresholds are published per component and as an overall aggregate, for each session, on results day (13 August 2026 for June 2026).',
      'Boundaries are raw marks set after marking so standards stay consistent — they move between sessions.',
      'To estimate before official release, compare your raw marks against the most recent two or three published sessions for the same components.',
    ],
    mustNotClaim: [
      'Do NOT invent or state specific grade boundary numbers for any session — never give a number like "you need 62/75 for an A".',
      'Do NOT promise the 2026 boundaries; they are unpublished.',
    ],
    links: [['/tools/grade-boundary-calculator', `${code} grade calculator`], [`/subjects/${code}`, `${code} on MarkScheme`], ['/mark', 'mark a paper']],
  })
}

// 3. Command words pillar
briefs.push({
  slug: 'cambridge-command-words-explained',
  cluster: 'command-words', format: 'guide', category: 'exam-technique',
  title: 'Cambridge command words explained (full list + meaning)',
  description: 'What every Cambridge command word means — State, Describe, Explain, Analyse, Discuss, Evaluate, Assess, Justify — and exactly what examiners reward for each.',
  keywords: 'Cambridge command words, command words meaning, command words A Level, explain vs describe, evaluate command word, Cambridge exam command words',
  facts: [
    'Command words are the instructing verbs at the start of a question; they set the depth of answer, not just the topic.',
    'State / Give / Name: recall a fact or short answer, no explanation needed.',
    'Define: give the precise meaning of a term.',
    'Describe: state the main features or points, without giving reasons.',
    'Explain: set out reasons or causes (the why/how) and make relationships clear.',
    'Analyse: break something into parts to show meaning, causes or relationships.',
    'Compare: identify similarities and differences.',
    'Discuss: write about an issue from more than one point of view.',
    'Evaluate / Assess: weigh evidence and make a supported judgement with a conclusion.',
    'Justify: support a case or decision with evidence and argument.',
    'Calculate: work out a numerical answer, showing working.',
    'Suggest: apply knowledge to a new context or propose a reasoned idea.',
    'Examiner reports repeatedly cite misreading the command word as a top reason students lose marks.',
  ],
  mustNotClaim: [
    'Do NOT invent fixed mark allocations for command words — tariffs vary by question and subject.',
  ],
  links: [['/tools/command-words', 'command word explainer tool'], ['/mark', 'mark your answer against the scheme']],
})

// 4. How-to-answer {verb} (how-to => HowTo schema)
const JUDGEMENT_VERBS = new Set(['evaluate', 'assess', 'discuss', 'justify', 'to-what-extent'])
for (const [verb, meaning] of Object.entries(COMMAND_WORDS)) {
  const display = verb.replace(/-/g, ' ')
  briefs.push({
    slug: `how-to-answer-${verb}-questions-cambridge`,
    cluster: 'command-words', format: 'howto', category: 'exam-technique',
    title: `How to answer "${display}" questions in Cambridge exams`,
    description: `What the Cambridge command word "${display}" requires, a repeatable structure for answering it, and a worked example of what earns the marks.`,
    keywords: `how to answer ${display} questions, ${display} command word, ${display} Cambridge, ${display} exam technique, answering ${display} questions A Level`,
    facts: [
      `The Cambridge command word "${display}" means to ${meaning}.`,
      'Examiner reports say students lose marks by answering with the wrong depth — e.g. describing when asked to explain or evaluate.',
      'A strong answer first responds directly to the verb, then develops the reasoning the verb demands.',
      JUDGEMENT_VERBS.has(verb)
        ? `For "${display}", you must reach a justified judgement or conclusion — points without a conclusion stay mid-band.`
        : 'Match the number of developed points to the mark tariff shown on the question.',
    ],
    mustNotClaim: ['Do NOT invent subject-specific mark scheme wording or fixed tariffs.'],
    links: [['/blog/cambridge-command-words-explained', 'all Cambridge command words'], ['/mark', 'mark your answer']],
  })
}

// 5. Per-subject command-words guides
// (last 6 — 2281, 4037, 5070, 7115, 7707, 9607 — complete the matrix: these
//  codes already have a subject guide + grade-boundaries post but no command-words post.)
for (const code of ['9708', '9489', '9699', '9609', '9990', '9084', '9700', '9702', '9701', '9618', '9706', '9488', '2281', '4037', '5070', '7115', '7707', '9607']) {
  const s = SUBJECTS[code]
  briefs.push({
    slug: `cambridge-${code}-${s.label}-command-words-guide`,
    cluster: 'command-words', format: 'guide', category: 'exam-technique',
    title: `Cambridge ${code} ${s.name} command words guide`,
    description: `The command words that matter most in ${code} ${s.name}, how the mark scheme rewards each, and how to turn them into band-topping answers.`,
    keywords: `${code} command words, Cambridge ${s.name} command words, ${code} ${s.label} exam technique, ${s.name} essay command words, ${code} mark scheme`,
    facts: [
      `${code} is Cambridge ${s.level} ${s.name}; marking uses ${s.marking}.`,
      `Papers: ${s.papers}.`,
      'High-tariff questions typically use Explain, Analyse, Discuss, Evaluate, Assess or Justify.',
      'Evaluate/Discuss/Assess questions need both sides and a supported judgement to reach the top band.',
      'Lower-tariff questions (Define, State, Describe, Calculate) reward precise, concise recall without padding.',
    ],
    mustNotClaim: ['Do NOT invent specific band mark numbers or quote mark-scheme text you are unsure of.'],
    links: [['/blog/cambridge-command-words-explained', 'command words explained'], [`/subjects/${code}`, `${code} marking`], ['/mark', 'mark a paper']],
  })
}

// 6. Mark-scheme abbreviations
const ABBREV = {
  '9709': 'M1 (method), A1 (accuracy), B1 (independent mark), DM1/dep (dependent on a previous mark), FT/ECF (follow through / error carried forward), AG (answer given — show the result), oe (or equivalent), cao (correct answer only), soi (seen or implied), isw (ignore subsequent working), art (anything rounding to), nfww (not from wrong working)',
  '9702': 'M (method, e.g. correct substitution), A (accuracy of the final value), B (independent mark, e.g. a definition), ECF (error carried forward), oe (or equivalent), and the requirement for units and significant figures',
  '9701': 'M (method), A (accuracy), B (independent mark), ECF (error carried forward), oe (or equivalent), and conventions for equations, state symbols and curly arrows',
  '9708': 'level-of-response bands for essays (Knowledge, Application, Analysis, Evaluation), point marks for data response, plus oe (or equivalent) and the need to explain diagrams in words',
  '9700': 'point marks with A (accept), R (reject), I (ignore), AW (alternative wording), ora (or reverse argument), ecf (error carried forward), ";" separating distinct marking points and "/" for acceptable alternatives — exact biological terminology is required',
  '4024': 'M (method), A (accuracy), B (independent mark), ft (follow through), cao (correct answer only), oe (or equivalent), soi (seen or implied) and www (without wrong working)',
  '9706': 'point marks for correct figures and labels, with "OF" (own figure — follow-through from a candidate\'s own earlier figure), ecf (error carried forward) and the need to show workings for method marks',
}
for (const code of ['9709', '9702', '9701', '9708', '9700', '4024', '9706']) {
  const s = SUBJECTS[code]
  briefs.push({
    slug: `cambridge-${code}-mark-scheme-abbreviations`,
    cluster: 'mark-schemes', format: 'guide', category: 'mark-schemes',
    title: `Cambridge ${code} mark scheme abbreviations decoded`,
    description: `What the ${code} ${s.name} mark scheme abbreviations mean — and how to use them to mark your own past papers like an examiner.`,
    keywords: `${code} mark scheme abbreviations, Cambridge ${s.name} mark scheme, ${code} mark scheme symbols, B1 M1 A1 meaning, ${code} marking`,
    facts: [
      `${code} is Cambridge ${s.level} ${s.name}.`,
      `Common ${code} mark scheme notation: ${ABBREV[code]}.`,
      'These codes tell you exactly where each mark is earned, so you can award partial credit when self-marking.',
      'ECF / follow-through means a later mark can still be earned from a wrong earlier value, if the method stays correct.',
    ],
    mustNotClaim: ['Do NOT invent abbreviations that are not in the list provided.'],
    links: [['/blog/how-to-read-a-cambridge-mark-scheme', 'how to read a mark scheme'], ['/mark', 'mark your paper']],
  })
}

// 7. Free-alternatives pillar (best- => comparison/ItemList; needs a table)
briefs.push({
  slug: 'best-free-cambridge-revision-resources-2026',
  cluster: 'free-alternatives', format: 'comparison', category: 'study-skills',
  title: 'Best free Cambridge revision resources in 2026',
  description: 'The best genuinely free Cambridge revision resources in 2026 — official PDFs, notes, past papers, mark schemes and free AI marking — and what each is best for.',
  keywords: 'free Cambridge revision resources, free A Level revision, free past papers, free revision notes, free Cambridge resources 2026',
  facts: [
    'Cambridge International publishes past papers, mark schemes and examiner reports for free on its website and via school portals.',
    'Physics & Maths Tutor (PMT) offers free past papers, notes, mind maps and worked solutions, strongest for STEM.',
    'ZNotes offers free community-written revision notes aligned to Cambridge syllabuses.',
    'MarkScheme offers a free tier that marks your handwritten answers against the real mark scheme, plus free topic-by-topic courses.',
    'Save My Exams has some free material but locks most notes and questions behind a paid subscription.',
    'The honest order: start with official Cambridge PDFs, add free notes, then use free marking to check your work.',
  ],
  mustNotClaim: ['Be fair and accurate about other sites; do NOT claim a paid site is "a scam" or invent features.'],
  needsTable: true,
  links: [['/courses', 'free MarkScheme courses'], ['/mark', 'free past-paper marking']],
})

// 8. Competitor alternatives
const COMPETITORS = [
  { slug: 'save-my-exams-free-alternative', name: 'Save My Exams',
    facts: [
      'Save My Exams is a paid revision platform with board-specific notes, topic questions and an AI short-answer marker (Smart Mark); most content needs a subscription.',
      'Free alternatives that cover the same needs: official Cambridge PDFs (papers + mark schemes), PMT and ZNotes for notes, and MarkScheme for free marking against the real scheme.',
    ] },
  { slug: 'znotes-free-alternative', name: 'ZNotes',
    facts: [
      'ZNotes provides free, concise community-written revision notes for Cambridge IGCSE, O Level and A Level.',
      'If you want more than notes — actual feedback on your answers — MarkScheme marks your handwritten work against the official mark scheme for free, and pairs notes with topic courses.',
    ] },
  { slug: 'pmt-free-alternative', name: 'Physics & Maths Tutor',
    facts: [
      'Physics & Maths Tutor (PMT) is a free site, strongest for STEM past papers, notes, mind maps and worked solutions.',
      'PMT gives you papers and solutions; MarkScheme adds the missing step — marking YOUR handwriting against the real scheme, mark by mark — and covers humanities too.',
    ] },
]
for (const c of COMPETITORS) {
  briefs.push({
    slug: c.slug,
    cluster: 'free-alternatives', format: 'guide', category: 'study-skills',
    title: `${c.name} free alternative for Cambridge revision`,
    description: `Looking for a free alternative to ${c.name}? Here are the best free Cambridge resources for notes, past papers and marking — and how to combine them.`,
    keywords: `${c.name} free alternative, ${c.name} alternative, free ${c.name}, ${c.name} vs free, Cambridge revision free`,
    facts: [
      ...c.facts,
      'Always start with official Cambridge past papers, mark schemes and examiner reports — they are free and authoritative.',
    ],
    mustNotClaim: [`Be fair and factual about ${c.name}; do NOT invent prices, features or criticisms.`],
    needsTable: true,
    links: [['/blog/best-free-cambridge-revision-resources-2026', 'best free resources'], ['/mark', 'free marking'], ['/courses', 'free courses']],
  })
}

// 8b. Best-free per-subject comparisons (best- => comparison/ItemList)
const BEST_FREE = [
  { slug: 'best-free-a-level-maths-resources-2026', topic: 'A-Level Maths (9709)', subjectFacts: 'PMT is the strongest free resource for 9709 (notes, worked solutions, topic questions); official Cambridge past papers and mark schemes are essential; MarkScheme marks your working against the B1/M1/A1 scheme for free.' },
  { slug: 'best-free-a-level-physics-resources-2026', topic: 'A-Level Physics (9702)', subjectFacts: 'PMT leads for free 9702 notes and worked solutions; official Cambridge papers/mark schemes are the core; MarkScheme gives free mark-by-mark feedback on definitions, calculations and units.' },
  { slug: 'best-free-a-level-biology-resources-2026', topic: 'A-Level Biology (9700)', subjectFacts: 'Free 9700 notes from PMT and ZNotes; official Cambridge papers/mark schemes with their allow/reject keyword lists; MarkScheme checks your wording against those lists for free.' },
  { slug: 'best-free-igcse-resources-2026', topic: 'Cambridge IGCSE & O-Level', subjectFacts: 'ZNotes is strongest for free IGCSE/O-Level notes; PMT for STEM; official Cambridge past papers and mark schemes are free; MarkScheme offers free marking and topic courses.' },
]
for (const b of BEST_FREE) {
  briefs.push({
    slug: b.slug,
    cluster: 'free-alternatives', format: 'comparison', category: 'study-skills',
    title: `Best free ${b.topic} revision resources 2026`,
    description: `The best genuinely free ${b.topic} revision resources in 2026 — past papers, notes, mark schemes and free marking — and what each is best for.`,
    keywords: `free ${b.topic} resources, best free ${b.topic} revision, free ${b.topic} notes, free ${b.topic} past papers, ${b.topic} revision free`,
    facts: [
      `For ${b.topic}: ${b.subjectFacts}`,
      'Always start with official Cambridge past papers, mark schemes and examiner reports — they are free and authoritative.',
      'The most effective free workflow: revise from notes, attempt past papers under timed conditions, then mark against the real scheme.',
    ],
    mustNotClaim: ['Be fair and accurate about other sites; do NOT invent prices, features or criticisms.'],
    needsTable: true,
    links: [['/blog/best-free-cambridge-revision-resources-2026', 'best free resources overall'], ['/mark', 'free marking'], ['/courses', 'free courses']],
  })
}

// 9. Exam dates + predicted papers
briefs.push({
  slug: 'cambridge-exam-dates-2026',
  cluster: 'exam-integrity', format: 'guide', category: 'revision',
  title: 'Cambridge exam dates 2026: series and results days',
  description: 'When the 2026 Cambridge International exams run — June and Oct/Nov series, the Feb/March series, and when results are released — plus where to get your exact timetable.',
  keywords: 'Cambridge exam dates 2026, Cambridge 2026 timetable, June 2026 exams, Cambridge results day 2026, A Level exam dates 2026',
  facts: [
    'Cambridge International runs three exam series: February/March (offered in some administrative zones, e.g. India), May/June, and October/November.',
    'The May/June 2026 series runs across roughly late April to June, with exact dates varying by administrative zone.',
    'June 2026 results are released on 13 August 2026.',
    'October/November results are typically released in January of the following year; Feb/March results in May.',
    'Your exact paper dates and times come from the official Cambridge timetable for your zone, or your school exams officer — they are not the same worldwide.',
  ],
  mustNotClaim: ['Do NOT list specific per-paper dates — they vary by zone; point readers to the official timetable instead.'],
  links: [['/blog/cambridge-may-june-2026-exam-preparation', 'May/June 2026 prep'], ['/mark', 'start marking past papers']],
})
briefs.push({
  slug: 'cambridge-predicted-papers-2026-what-to-know',
  cluster: 'exam-integrity', format: 'guide', category: 'revision',
  title: 'Cambridge predicted papers 2026: what students should know',
  description: 'What "predicted papers" for Cambridge 2026 really are, why they are unofficial and risky, and a safer, higher-scoring way to use real past papers instead.',
  keywords: 'Cambridge predicted papers 2026, predicted papers, are predicted papers real, Cambridge 2026 leaked papers, past papers vs predicted papers',
  facts: [
    'Predicted papers are unofficial question sets made by third parties guessing what might appear — they are not from Cambridge.',
    'Cambridge does not release future exam questions; any "leaked" paper is either fake or a malpractice risk that can lead to disqualification.',
    'Real past papers, mark schemes and examiner reports are a more reliable guide to question style and standards.',
    'The best preparation is timed practice on genuine past papers, marked honestly against the official scheme.',
  ],
  mustNotClaim: ['Do NOT endorse buying predicted/leaked papers or imply any are genuinely from Cambridge.'],
  links: [['/blog/cambridge-exam-paper-leaks-2026-what-students-should-know', 'exam leaks explained'], ['/mark', 'mark real past papers']],
})

// 10. Examiner reports (match exam-technique /^cambridge-examiner-report/)
for (const code of ['9709', '9702', '9708']) {
  const s = SUBJECTS[code]
  briefs.push({
    slug: `cambridge-examiner-report-${code}-${s.label}`,
    cluster: 'exam-technique', format: 'guide', category: 'exam-technique',
    title: `How to use the ${code} ${s.name} examiner report`,
    description: `Examiner reports reveal exactly where ${code} ${s.name} students lose marks. Here is how to read them and turn the feedback into a higher grade.`,
    keywords: `${code} examiner report, Cambridge ${s.name} examiner report, ${code} common mistakes, ${code} examiner feedback, ${s.name} exam mistakes`,
    facts: [
      `${code} is Cambridge ${s.level} ${s.name}; marking uses ${s.marking}.`,
      'Cambridge publishes an examiner report (a "Principal Examiner Report for Teachers") for each session, alongside the paper and mark scheme.',
      'The report explains which questions were done well, which were done poorly, and the specific errors that cost marks.',
      'Use it after marking a past paper: read what examiners penalised, then re-attempt one weak question with that feedback in mind.',
    ],
    mustNotClaim: ['Do NOT quote specific statistics or examiner sentences you cannot verify.'],
    links: [['/blog/how-to-read-a-cambridge-mark-scheme', 'reading the mark scheme'], [`/subjects/${code}`, `${code} marking`], ['/mark', 'mark a paper']],
  })
}

// 11. "How to get an A*" — high-volume aspirational, every subject (howto schema)
const COURSE_CODES = new Set(['9709','9702','9701','9700','9708','9609','9990','9489','9706','9699','9084','9231','9488','9618','9607'])
for (const code of Object.keys(SUBJECTS)) {
  const s = SUBJECTS[code]
  const topGrade = s.level === 'O-Level' ? 'A*' : 'A*'
  const links = [
    [`/past-papers/${code}`, `${code} past papers`],
    [`/subjects/${code}`, `${code} marking`],
    ['/mark', 'mark a paper'],
  ]
  if (COURSE_CODES.has(code)) links.splice(1, 0, [`/courses/${code}`, `free ${code} course`])
  briefs.push({
    slug: `how-to-get-an-a-star-in-cambridge-${code}-${s.label}`,
    cluster: 'revision-strategy', format: 'howto', category: 'revision',
    title: `How to get an ${topGrade} in Cambridge ${code} ${s.name}`,
    description: `A step-by-step plan to reach an ${topGrade} in Cambridge ${s.level} ${s.name} (${code}): master every topic, drill past papers, and mark to the real scheme.`,
    keywords: `how to get an A* in ${s.level} ${s.name}, ${code} A* tips, how to get an A in ${code} ${s.label}, ${code} ${s.label} revision, top grade ${code} ${s.name}`,
    facts: [
      `${code} is Cambridge ${s.level} ${s.name}; marking uses ${s.marking}.`,
      `Papers: ${s.papers}.`,
      `A top grade comes from consistent full-mark technique on questions you can already do — not just from knowing more content.`,
      `At the top, the avoidable losses dominate: misreading the command word, dropped units or working, arithmetic slips, and not finishing the paper.`,
      `Cover every syllabus point — strong candidates rarely have a weak topic to hide, because examiners can sample anywhere.`,
      `Timed past papers, marked strictly against the official scheme, are the fastest way to find and close the gap to the top grade.`,
    ],
    mustNotClaim: [
      'Do NOT state specific grade boundary numbers or claim a fixed percentage guarantees an A* — boundaries move every session.',
      'Do NOT promise any grade; describe the method, not a guarantee.',
    ],
    links,
  })
}

// 12. Hub-boosting past-paper revision posts
briefs.push({
  slug: 'how-to-revise-with-cambridge-past-papers',
  cluster: 'revision-strategy', format: 'howto', category: 'revision',
  title: 'How to revise with Cambridge past papers (the right way)',
  description: 'A step-by-step method for revising with Cambridge past papers: when to start, how to work them under timed conditions, and how to mark them like an examiner.',
  keywords: 'how to revise with past papers, Cambridge past paper revision, how to use past papers, past paper technique, revise with mark schemes',
  facts: [
    'Reading past papers is not revising — you only improve when you attempt them under realistic conditions and then mark honestly.',
    'Cambridge publishes past papers, mark schemes and examiner reports for free; work the paper before you ever open the scheme.',
    'A strong loop: attempt a paper timed, self-mark strictly against the scheme, list every mark you dropped, then re-drill those exact skills.',
    'Marking your own handwriting against the real scheme — point by point — is where most of the learning happens.',
    'Spread papers across the syllabus so no topic stays untested before the exam.',
  ],
  mustNotClaim: ['Do NOT invent specific grade boundaries or guarantee a grade.'],
  links: [['/past-papers', 'browse past papers by subject'], ['/mark', 'mark a past paper'], ['/courses', 'free topic courses']],
})
briefs.push({
  slug: 'should-you-do-cambridge-past-papers-by-topic-or-full-paper',
  cluster: 'revision-strategy', format: 'guide', category: 'revision',
  title: 'Past papers by topic or full papers? A Cambridge revision guide',
  description: 'Should you do Cambridge past papers topic by topic or as whole timed papers? When each approach works best, and how to combine them as the exam nears.',
  keywords: 'past papers by topic, topic questions vs past papers, Cambridge past paper strategy, full past papers, how to structure past paper revision',
  facts: [
    'Topic-by-topic practice is best early: it isolates a weak skill so you can fix it without a whole paper getting in the way.',
    'Full timed papers are essential later: they build exam stamina, time management and the ability to switch between topics.',
    'A common mistake is doing only full papers from the start, which hides which specific topics are costing marks.',
    'Mark every attempt against the official scheme so you know exactly where the marks went — by topic or by paper.',
    'As the exam nears, shift the balance from topic drills towards complete, timed past papers under exam conditions.',
  ],
  mustNotClaim: ['Do NOT invent grade boundaries or promise a grade.'],
  links: [['/past-papers', 'past papers by subject'], ['/mark', 'mark your answers'], ['/courses', 'topic-by-topic courses']],
})

// 13. IB Diploma (IBDP) cluster — new board, traffic jackpot
const IB_MUST_NOT = [
  'Do NOT invent specific IB grade boundaries or mark thresholds — they vary by session and are set after marking.',
  'Do NOT claim MarkScheme currently marks against the official IB mark scheme; describe markbands generally — official IB-scheme marking is still rolling out.',
]
// 13a. Pillar
briefs.push({
  slug: 'ib-diploma-past-papers-guide',
  cluster: 'ib', format: 'guide', category: 'revision',
  title: 'IB Diploma past papers: the complete guide',
  description: 'How to find and use IB Diploma past papers — HL vs SL, Papers 1–3, markbands, and a revision workflow that actually moves your grade.',
  keywords: 'IB past papers, IB Diploma past papers, IBDP past papers, IB mark scheme, how to use IB past papers, IB HL SL papers',
  facts: [
    'The IB Diploma Programme (IBDP) assesses most subjects at Higher Level (HL) and Standard Level (SL), with HL covering more content and usually an extra paper.',
    'Exams run in two sessions a year: May (most schools) and November (Southern hemisphere), with time-zone variants.',
    'Most subjects use Paper 1, Paper 2 and (often at HL) Paper 3, plus an internal assessment (IA).',
    'IB marks with markbands and assessment criteria — examiners place a response in a level band against descriptors — not Cambridge B1/M1/A1 codes.',
    'Each subject is graded 1–7; the diploma is out of 45 with up to 3 bonus points from Theory of Knowledge and the Extended Essay; 24 points is the minimum to pass.',
    'The most effective workflow: work a paper timed, mark yourself against the band descriptors, then drill the skills that kept you out of the top band.',
  ],
  mustNotClaim: IB_MUST_NOT,
  links: [['/ib/past-papers', 'IB past papers by subject'], ['/ib', 'IB Diploma hub'], ['/mark', 'get feedback on your answer']],
})
// 13b. Per-subject HL guides (high-volume)
const IB_GUIDE_SUBJECTS = [
  { slug: 'biology-hl', name: 'Biology', short: 'Biology', papers: 'Paper 1 (multiple choice), Paper 2 (data and extended response) and Paper 3 (option/short answers)' },
  { slug: 'chemistry-hl', name: 'Chemistry', short: 'Chemistry', papers: 'Paper 1 (multiple choice), Paper 2 (structured) and Paper 3 (data and option)' },
  { slug: 'physics-hl', name: 'Physics', short: 'Physics', papers: 'Paper 1 (multiple choice), Paper 2 (structured) and Paper 3 (data and option)' },
  { slug: 'maths-aa-hl', name: 'Mathematics: Analysis and Approaches', short: 'Maths AA', papers: 'Paper 1 (no calculator), Paper 2 (calculator) and Paper 3 (extended problem solving)' },
  { slug: 'economics-hl', name: 'Economics', short: 'Economics', papers: 'Paper 1 (extended response), Paper 2 (data response) and Paper 3 (HL quantitative/policy)' },
  { slug: 'business-management-hl', name: 'Business Management', short: 'Business Management', papers: 'Paper 1 (pre-released case study) and Paper 2 (structured and extended response)' },
  { slug: 'psychology-hl', name: 'Psychology', short: 'Psychology', papers: 'Paper 1 (the approaches), Paper 2 (options) and Paper 3 (HL qualitative research)' },
  { slug: 'history-hl', name: 'History', short: 'History', papers: 'Paper 1 (source analysis), Paper 2 (thematic essays) and Paper 3 (HL regional depth study)' },
  { slug: 'english-a-lang-lit-hl', name: 'English A: Language and Literature', short: 'English Lang & Lit', papers: 'Paper 1 (guided textual analysis) and Paper 2 (comparative essay)' },
  { slug: 'computer-science-hl', name: 'Computer Science', short: 'Computer Science', papers: 'Paper 1 (core theory), Paper 2 (the case study) and Paper 3 (HL chosen option)' },
]
for (const s of IB_GUIDE_SUBJECTS) {
  briefs.push({
    slug: `ib-${s.slug}-past-papers-guide`,
    cluster: 'ib', format: 'guide', category: 'revision',
    title: `IB ${s.short} HL past papers & revision guide`,
    description: `How to revise IB ${s.name} HL with past papers: the papers, the markbands examiners reward, and a workflow to push from a 5 to a 7.`,
    keywords: `IB ${s.name} HL, IB ${s.short} past papers, IB ${s.name} mark scheme, IB ${s.short} HL revision, IB ${s.name} markbands`,
    facts: [
      `IB ${s.name} at Higher Level is assessed by ${s.papers}, plus an internal assessment.`,
      'IB marks with markbands and assessment criteria (level descriptors), not Cambridge B1/M1/A1 codes — knowing the band wording is how you reach a 7.',
      'Exams run in the May and November sessions; the subject is graded 1–7.',
      'Best practice: work a full paper timed, mark against the band descriptors, then drill the weak skill before the next session.',
    ],
    mustNotClaim: IB_MUST_NOT,
    links: [[`/ib/past-papers/${s.slug}`, `IB ${s.short} past papers`], [`/ib/subjects/${s.slug}`, `IB ${s.name} HL`], ['/mark', 'get feedback on your answer']],
  })
}
// 13c. Standalone IB explainers
briefs.push({
  slug: 'ib-markbands-explained',
  cluster: 'ib', format: 'guide', category: 'exam-technique',
  title: 'IB markbands explained: how examiners award marks',
  description: 'What IB markbands and assessment criteria are, how examiners place your answer in a level band, and how to write to the top descriptor.',
  keywords: 'IB markbands, IB assessment criteria, how IB marking works, IB level descriptors, IB mark scheme explained',
  facts: [
    'IB uses markbands (level descriptors) and assessment criteria rather than itemised B1/M1/A1 codes; examiners judge the response as a whole against band wording.',
    'Each band describes the quality of knowledge, application, analysis and evaluation expected — you are placed in the band your answer best fits.',
    'Many papers list assessment criteria (e.g. A, B, C, D) each with their own band descriptors that are added together.',
    'To climb a band you must hit the descriptor language — e.g. "sustained and convincing analysis" beats "some analysis".',
  ],
  mustNotClaim: IB_MUST_NOT,
  links: [['/ib', 'IB Diploma hub'], ['/ib/past-papers', 'IB past papers'], ['/mark', 'check your answer']],
})
briefs.push({
  slug: 'ib-grade-boundaries-explained',
  cluster: 'ib', format: 'guide', category: 'revision',
  title: 'IB grade boundaries explained (1–7 and the /45)',
  description: 'How IB grade boundaries work: subject grades 1–7, the 45-point diploma, bonus points, and why boundaries move each session.',
  keywords: 'IB grade boundaries, IB grading explained, IB 7 points, IB 45 points, IB passing score, how IB grades work',
  facts: [
    'Each IB subject is graded 1–7, set by markbands and boundaries that are fixed after marking each session.',
    'The full diploma is scored out of 45: six subjects (max 42) plus up to 3 bonus points from Theory of Knowledge and the Extended Essay.',
    'You need 24 points to pass, subject to conditions (no grade 1, limited 2s/3s, and passing TOK/EE).',
    'Boundaries move between sessions so a grade represents the same standard year on year — you cannot rely on a fixed percentage.',
  ],
  mustNotClaim: IB_MUST_NOT,
  links: [['/ib', 'IB Diploma hub'], ['/ib/past-papers', 'IB past papers'], ['/mark', 'get feedback']],
})
briefs.push({
  slug: 'ib-vs-a-level',
  cluster: 'ib', format: 'comparison', category: 'revision',
  title: 'IB vs A-Level: which is harder and how marking differs',
  description: 'IB Diploma vs A-Levels — breadth vs depth, the 45-point system vs A*–E, and how IB markbands differ from Cambridge mark schemes.',
  keywords: 'IB vs A-Level, IB or A-Levels, is IB harder than A-Levels, IB vs A-Level grading, IB Diploma vs A-Level',
  facts: [
    'The IB Diploma is broad: six subjects across groups plus Theory of Knowledge, the Extended Essay and CAS — versus typically three or four A-Levels chosen for depth.',
    'IB grades each subject 1–7 (diploma out of 45); A-Levels grade A*–E per subject.',
    'IB marks with markbands and assessment criteria; Cambridge A-Levels use itemised point marks (B1/M1/A1) and level-of-response bands for essays.',
    'Neither is universally "harder" — IB rewards consistency across many subjects and skills; A-Levels reward depth in a few.',
  ],
  mustNotClaim: [...IB_MUST_NOT, 'Be fair to both qualifications; do NOT declare one objectively easier.'],
  needsTable: true,
  links: [['/ib', 'IB Diploma hub'], ['/subjects', 'Cambridge A-Level subjects'], ['/mark', 'mark your answers']],
})
briefs.push({
  slug: 'ib-exam-revision-strategy',
  cluster: 'ib', format: 'howto', category: 'revision',
  title: 'How to revise for IB exams (a paper-by-paper plan)',
  description: 'A step-by-step IB revision plan built around past papers and markbands — how to turn practice into a higher grade across HL and SL.',
  keywords: 'how to revise for IB, IB revision strategy, IB exam preparation, IB past paper revision, IB study plan',
  facts: [
    'IB exams reward exam technique against markbands as much as content — practising papers and self-marking is the highest-leverage revision.',
    'Start topic by topic to fix weak areas, then move to full timed papers as the session approaches.',
    'Mark every attempt against the band descriptors so you know exactly which skill kept you out of the next band.',
    'Balance revision across all six subjects plus TOK/EE so no component drags your /45 total.',
  ],
  mustNotClaim: IB_MUST_NOT,
  links: [['/ib/past-papers', 'IB past papers'], ['/ib', 'IB Diploma hub'], ['/mark', 'get feedback on your answer']],
})

// 14. IGCSE per-subject past-paper guides (largest missing high-volume cluster).
//     Slug cambridge-<4digit>-igcse-<label>-past-papers-guide routes to subject-guides.
// `tiered` = subject is split into Core/Extended entry tiers. Untiered subjects
// (English, Economics, Business, CS) put ALL candidates on the same papers —
// never claim Core/Extended for them.
const IGCSE_SUBJECTS = {
  '0580': { name: 'Mathematics', label: 'mathematics', tiered: true,
    papers: 'a Core tier (Papers 1 and 3) or an Extended tier (Papers 2 and 4); most students sit Extended for access to the top grades. Calculators are allowed throughout',
    marking: 'point marks — method (M) marks for a correct approach and accuracy (A) marks for the result; show working to earn method marks even if the final answer is wrong' },
  '0610': { name: 'Biology', label: 'biology', tiered: true,
    papers: 'Core or Extended theory papers (multiple choice and structured) plus a practical assessment — either Paper 5 (practical test) or Paper 6 (alternative to practical)',
    marking: 'keyword point marks with accept/reject lists — precise biological terminology is required' },
  '0620': { name: 'Chemistry', label: 'chemistry', tiered: true,
    papers: 'Core or Extended theory papers plus a practical assessment (Paper 5 practical or Paper 6 alternative to practical)',
    marking: 'point marks — balanced equations, state symbols and precise chemical language must be exact' },
  '0625': { name: 'Physics', label: 'physics', tiered: true,
    papers: 'Core or Extended theory papers plus a practical assessment (Paper 5 practical or Paper 6 alternative to practical)',
    marking: 'point marks for the formula, the substitution, and the final answer with a correct unit and sensible significant figures' },
  '0500': { name: 'First Language English', label: 'first-language-english', tiered: false,
    papers: 'Paper 1 (Reading) and Paper 2 (Directed Writing and Composition), with a coursework route available in some centres — there are no Core/Extended tiers',
    marking: 'reading marks for understanding, analysis and summary skills; writing assessed on content and structure plus accuracy, against level bands' },
  '0455': { name: 'Economics', label: 'economics', tiered: false,
    papers: 'Paper 1 (multiple choice) and Paper 2 (structured data-response and an extended essay section) — all candidates sit the same papers, with no tiers',
    marking: 'point marks for definitions and diagrams, with short level-of-response bands for analysis and evaluation' },
  '0450': { name: 'Business Studies', label: 'business-studies', tiered: false,
    papers: 'Paper 1 (short-answer and data response) and Paper 2 (case study) — a single untiered qualification with no Core/Extended split',
    marking: 'applied marks that must reference the business in the stimulus, with analysis and a justified judgement for higher-tariff questions' },
  '0478': { name: 'Computer Science', label: 'computer-science', tiered: false,
    papers: 'Paper 1 (computer systems theory) and Paper 2 (algorithms, programming and logic) — every candidate sits the same two papers, with no Core/Extended tiers',
    marking: 'point marks — correct pseudocode or flowchart logic, accurate trace tables, and precise technical vocabulary' },
}
for (const code of Object.keys(IGCSE_SUBJECTS)) {
  const s = IGCSE_SUBJECTS[code]
  const gradeFact = s.tiered
    ? 'IGCSE grades run A*–G (with a 9–1 scale on some regional variants); your tier of entry (Core or Extended) caps the grades available to you.'
    : `IGCSE grades run A*–G (with a 9–1 scale on some regional variants); ${code} is a single untiered qualification, so every candidate sits the same papers — there is no Core or Extended tier.`
  briefs.push({
    slug: `cambridge-${code}-igcse-${s.label}-past-papers-guide`,
    cluster: 'subject-guides', format: 'guide', category: 'subject-guide',
    title: `Cambridge IGCSE ${s.name} (${code}) — past papers, mark schemes & how to revise`,
    description: `Revise Cambridge IGCSE ${s.name} (${code}) with past papers — paper structure, how the mark scheme works, common mistakes, and a revision plan.`,
    keywords: `${code} past papers, IGCSE ${s.name} past papers, ${code} ${s.label} mark scheme, Cambridge IGCSE ${s.name}, ${code} revision`,
    facts: [
      `${code} is Cambridge IGCSE ${s.name}.`,
      `Its papers: ${s.papers}.`,
      `Marking: ${s.marking}.`,
      'Cambridge publishes IGCSE past papers, mark schemes and examiner reports for free; attempt each paper under timed conditions before opening the mark scheme.',
      gradeFact,
      'The most effective revision loop: attempt a past paper timed, mark it strictly against the official scheme, list every mark you dropped, then re-drill those exact skills.',
    ],
    mustNotClaim: [
      'Do NOT state specific grade boundary numbers — they are set after marking and move every session.',
      s.tiered
        ? 'Do NOT misstate the Core/Extended tier structure or invent paper numbers beyond those listed.'
        : `Do NOT claim ${code} has Core/Extended tiers — it is untiered; all candidates sit the same papers. Do NOT invent paper numbers beyond those listed.`,
    ],
    links: [['/past-papers', 'browse Cambridge past papers'], ['/blog/cambridge-igcse-past-papers-guide', 'IGCSE past papers overview'], ['/mark', 'mark a past paper']],
  })
}

// 15. Cambridge English + Geography/ICT subject guides (codes absent from the
//     corpus). Mixed levels; the IGCSE entries are untiered (no Core/Extended).
const MB4_SUBJECTS = [
  { code: '9093', name: 'English Language', label: 'english-language', level: 'A-Level', levelSlug: 'a-level', tier: 'a-level',
    papers: 'Reading, Writing, Text Analysis and Language Topics (such as child language acquisition and English in the world) across the AS and A Level components',
    marking: 'level-of-response bands rewarding analysis of language features, accurate linguistic terminology, and controlled, purposeful writing' },
  { code: '9695', name: 'Literature in English', label: 'english-literature', level: 'A-Level', levelSlug: 'a-level', tier: 'a-level',
    papers: 'Drama, Prose, Poetry and Shakespeare/unseen components, assessed by passage-based and essay questions across AS and A Level',
    marking: 'level-of-response bands rewarding informed personal response, close textual analysis, and understanding of form, structure and context' },
  { code: '1123', name: 'English Language', label: 'english', level: 'O-Level', levelSlug: 'o-level', tier: 'o-level',
    papers: 'Paper 1 (Writing — directed writing and a composition) and Paper 2 (Reading — comprehension and a summary task)',
    marking: 'content and language marks for writing; comprehension and summary marks for reading, rewarding accuracy and concise expression' },
  { code: '9696', name: 'Geography', label: 'geography', level: 'A-Level', levelSlug: 'a-level', tier: 'a-level',
    papers: 'core physical and human geography papers plus advanced options (e.g. tropical or hazardous environments and global interdependence) across AS and A Level',
    marking: 'point marks for knowledge and geographical skills, with level-of-response bands for extended evaluation; map, graph and data skills are tested' },
  { code: '9626', name: 'Information Technology', label: 'information-technology', level: 'A-Level', levelSlug: 'a-level', tier: 'a-level',
    papers: 'a written theory paper and practical papers covering spreadsheets, databases, website authoring and project work',
    marking: 'theory point marks plus practical assessment of accuracy, efficiency and how well the response meets the task brief' },
  { code: '0460', name: 'Geography', label: 'geography', level: 'IGCSE', levelSlug: 'igcse', tier: 'igcse-untiered',
    papers: 'Paper 1 (Geographical Themes), Paper 2 (Geographical Skills), and either Paper 3 (Coursework) or Paper 4 (Alternative to Coursework) — there are no Core/Extended tiers',
    marking: 'point marks for knowledge and skills, with short level-of-response bands for extended answers; map, graph and fieldwork data skills are tested' },
  { code: '0417', name: 'ICT', fullName: 'Information and Communication Technology', label: 'ict', level: 'IGCSE', levelSlug: 'igcse', tier: 'igcse-untiered',
    papers: 'Paper 1 (written theory) and two practical papers — Document Production, Databases and Presentations, and Data Analysis and Website Authoring — with no Core/Extended tiers',
    marking: 'theory point marks plus practical marks for accuracy, correct techniques and meeting the task requirements exactly' },
]
const MB4_GRADE_FACT = {
  'a-level': 'Cambridge A Level grades run A*–E (AS grades a–e); thresholds are raw marks set after marking each session, so a fixed percentage never guarantees a grade.',
  'o-level': 'Cambridge O Level grades run A*–E; thresholds are raw marks set after marking each session and move between sittings.',
}
for (const s of MB4_SUBJECTS) {
  const untiered = s.tier === 'igcse-untiered'
  const gradeFact = untiered
    ? `IGCSE grades run A*–G; ${s.code} is a single untiered qualification, so every candidate sits the same papers — there is no Core or Extended tier.`
    : MB4_GRADE_FACT[s.tier]
  const displayLevel = s.level === 'IGCSE' ? 'IGCSE' : s.level
  briefs.push({
    slug: `cambridge-${s.code}-${s.levelSlug}-${s.label}-past-papers-guide`,
    cluster: 'subject-guides', format: 'guide', category: 'subject-guide',
    title: `Cambridge ${displayLevel} ${s.name} (${s.code}) — past papers, mark schemes & how to revise`,
    description: `Revise Cambridge ${displayLevel} ${s.name} (${s.code}) with past papers — paper structure, how the mark scheme works, common mistakes, and a revision plan.`,
    keywords: `${s.code} past papers, ${displayLevel} ${s.name} past papers, ${s.code} ${s.label} mark scheme, Cambridge ${s.name} ${s.code}, ${s.code} revision`,
    facts: [
      s.fullName
        ? `${s.code} is Cambridge ${displayLevel} ${s.fullName} (${s.name}).`
        : `${s.code} is Cambridge ${displayLevel} ${s.name}.`,
      `Its papers: ${s.papers}.`,
      `Marking: ${s.marking}.`,
      'Cambridge publishes past papers, mark schemes and examiner reports for free; attempt each paper under timed conditions before opening the mark scheme.',
      gradeFact,
      'The most effective revision loop: attempt a past paper timed, mark it strictly against the official scheme, list every mark you dropped, then re-drill those exact skills.',
    ],
    mustNotClaim: [
      'Do NOT state specific grade boundary numbers — they are set after marking and move every session.',
      untiered
        ? `Do NOT claim ${s.code} has Core/Extended tiers — it is untiered; all candidates sit the same papers. Do NOT invent paper numbers beyond those listed.`
        : 'Do NOT invent paper numbers, components or mark-scheme wording beyond what is listed.',
    ],
    links: [['/past-papers', 'browse Cambridge past papers'], ['/guides/subject-guides', 'all subject guides'], ['/mark', 'mark a past paper']],
  })
}

// ---------- prompt + generation ----------
function buildPrompt(b) {
  const isHowto = b.format === 'howto'
  const isComparison = b.format === 'comparison' || b.needsTable
  const linkList = b.links.map(([href, label]) => `- ${label}: ${href}`).join('\n')
  const structure = []
  structure.push('- Open with a 2–3 sentence lead paragraph that directly answers the title (no heading).')
  if (isHowto) {
    structure.push('- Then 4–6 step sections as "## " headings. Each heading must be an ACTION (e.g. "## Read the command word first"), NOT starting with Why/What/Who/Frequently/Bottom/References. Each step: 2–4 sentences.')
  } else {
    structure.push('- Then 4–6 "## " section headings with substantial 2–4 sentence paragraphs each.')
  }
  if (isComparison) {
    structure.push('- Include ONE markdown table comparing the options/resources. First column = the resource or option NAME (this becomes a structured list), other columns = "Best for" and "Cost".')
  }
  structure.push('- Then "## Frequently asked questions" with at least 3 "### Question?" sub-headings, each answered in 40–60 words.')
  structure.push('- End with "## Bottom line" — a 2–3 sentence takeaway.')
  structure.push(`- Naturally link to these internal pages using markdown links at least once: \n${linkList}`)
  return `You are an expert Cambridge International exam tutor writing for MarkScheme (markscheme.app). British English. Exam-accurate, syllabus-aware, concrete and genuinely useful — never generic AI filler.

Write the MARKDOWN BODY ONLY (no YAML frontmatter, no H1 title) for an article titled: "${b.title}".

GROUND TRUTH — you must build the article on these facts and must not contradict them:
${b.facts.map((f) => `- ${f}`).join('\n')}

HARD CONSTRAINTS:
${b.mustNotClaim.map((m) => `- ${m}`).join('\n')}

STRUCTURE (follow exactly):
${structure.join('\n')}

Length 700–1100 words. Confident, plain, helpful tone. Use **bold** sparingly for key terms.

Return ONLY JSON: {"markdown":"<the full markdown body as a single string>"}`
}

function frontmatter(b) {
  return [
    '---',
    `title: ${b.title}`,
    `description: ${b.description}`,
    `date: ${DATE}`,
    `keywords: ${b.keywords}`,
    `category: ${b.category}`,
    'author: hamza-gul',
    `updated: ${DATE}`,
    'informationGain: synthesis',
    '---',
  ].join('\n')
}

function countFaq(body) {
  const lines = body.split('\n')
  let inFaq = false, n = 0
  for (const l of lines) {
    if (/^##\s+frequently asked/i.test(l)) { inFaq = true; continue }
    if (inFaq && /^##\s+/.test(l) && !/^###/.test(l)) break
    if (inFaq && /^###\s+/.test(l)) n++
  }
  return n
}
function countSteps(body) {
  const SKIP = /^(frequently asked|bottom line|what to read|who this|what you need|why |table of contents|references|sources)/i
  return body.split('\n').filter((l) => /^##\s+/.test(l) && !/^###/.test(l) && !SKIP.test(l.replace(/^##\s+/, ''))).length
}
function validate(b, body) {
  const errs = []
  const words = body.split(/\s+/).filter(Boolean).length
  if (words < 450) errs.push(`too short (${words}w)`)
  if (countFaq(body) < 2) errs.push('FAQ < 2')
  if (!body.includes('/mark')) errs.push('no /mark link')
  if (b.format === 'howto' && countSteps(body) < 3) errs.push(`howto steps ${countSteps(body)} < 3`)
  if ((b.format === 'comparison' || b.needsTable) && !/^\|/m.test(body)) errs.push('no table')
  return errs
}

async function genBody(b) {
  const prompt = buildPrompt(b)
  for (let attempt = 1; attempt <= 2; attempt++) {
    const text = await generateGeminiText(prompt, { task: 'content-generation', maxOutputTokens: 8000, temperature: 0.45 })
    const raw = (text || '').slice((text || '').indexOf('{'), (text || '').lastIndexOf('}') + 1)
    if (!raw) { if (attempt === 2) return null; continue }
    let parsed
    try { parsed = JSON.parse(raw) } catch { try { parsed = JSON.parse(jsonrepair(raw)) } catch { parsed = null } }
    const body = parsed?.markdown?.trim()
    if (body && body.length > 200) return body
  }
  return null
}

// ---- Seasonal / trending (post-exam -> results day 13 Aug 2026) ----
briefs.push({
  slug: 'how-to-predict-your-cambridge-grade-before-results-day',
  cluster: 'revision-strategy', format: 'howto', category: 'mark-schemes',
  title: 'How to predict your Cambridge grade before results day',
  description: 'Estimate your Cambridge grade before 13 August 2026: total your raw marks, compare them with recent published thresholds, and use a grade boundary calculator.',
  keywords: 'predict Cambridge grade, estimate exam grade, grade before results day, raw marks to grade, Cambridge results 2026',
  facts: [
    'June 2026 Cambridge International results are released on 13 August 2026; the official grade threshold tables appear that morning.',
    'You can only estimate beforehand — the 2026 boundaries are not published until results day.',
    'Add up your raw marks for each component using a copy of the question paper and the official mark scheme.',
    'Compare your total against the official grade thresholds from the most recent two or three sessions of the SAME components — the closest sessions are the best guide.',
    'Boundaries move each session (lower if the paper was hard, higher if easy), so treat any estimate as a range, not a fixed grade.',
    'The full A Level grade is an aggregate across components; an A* needs strong A2 performance, not just one good paper.',
    'A grade boundary calculator lets you enter your raw mark, the paper total and the thresholds you have to read off the grade.',
  ],
  mustNotClaim: [
    'Do NOT state any specific 2026 grade boundary numbers — they are unpublished until results day.',
    'Do NOT claim a fixed percentage always equals a given grade.',
  ],
  links: [['/tools/grade-boundary-calculator', 'grade boundary calculator'], ['/mark', 'mark a past paper'], ['/blog/cambridge-results-day-august-2026-guide', 'results day guide']],
})

briefs.push({
  slug: 'what-to-do-while-waiting-for-cambridge-results',
  cluster: 'revision-strategy', format: 'guide', category: 'revision',
  title: 'What to do while waiting for Cambridge results',
  description: 'The wait between Cambridge exams and 13 August 2026 results is long. Here is how to stay calm, stay productive, and prepare for every grade outcome.',
  keywords: 'waiting for Cambridge results, after Cambridge exams, results day August 2026, exam results wait, what to do after exams',
  facts: [
    'June 2026 Cambridge International results are released on 13 August 2026.',
    'Once your scripts are submitted the outcome is out of your hands — the wait is normal and worrying does not change marks.',
    'Low-pressure, useful things to do: rest properly, get ahead on next year’s first topics, build a skill (a language, driving, work experience), and research your options for each outcome.',
    'It helps to plan for three scenarios — above expectation, on target, and below — including enquiries about results (remarks) and the November resit series.',
    'Comparing your raw marks against recent published thresholds gives a rough early estimate, but boundaries are not confirmed until results day.',
  ],
  mustNotClaim: [
    'Do NOT give specific 2026 grade boundary numbers.',
    'Do NOT give clinical mental-health advice; keep wellbeing tips general and signpost trusted support.',
  ],
  links: [['/tools/grade-boundary-calculator', 'estimate your grade'], ['/mark', 'mark a past paper'], ['/blog/cambridge-results-day-august-2026-guide', 'results day guide']],
})

briefs.push({
  slug: 'how-to-cope-after-a-bad-exam',
  cluster: 'revision-strategy', format: 'howto', category: 'study-skills',
  title: 'How to cope after a bad exam (and refocus)',
  description: 'Walked out of a Cambridge paper feeling awful? Here is how to put one bad exam in perspective, protect your next paper, and plan your options calmly.',
  keywords: 'bad exam, coping after a bad exam, exam went badly, refocus after exam, Cambridge exam stress, one bad paper',
  facts: [
    'Feeling a paper went badly is extremely common and is often a poor predictor of the real grade — boundaries are set after marking and can be lower than expected.',
    'One weak component rarely decides the whole grade: A Level grades are aggregated across components.',
    'Practical steps: avoid exam post-mortems with classmates (they raise anxiety), protect your sleep and your next paper, and do not rip up a working plan over one feeling.',
    'If a result later confirms a problem, options exist: an enquiry about results (remark) and the November resit series.',
    'Talking early to a teacher, exams officer or trusted adult helps you plan calmly rather than spiral.',
  ],
  mustNotClaim: [
    'Do NOT give clinical mental-health or crisis advice; keep it general and encourage speaking to a trusted adult or school support.',
    'Do NOT promise a specific grade outcome.',
  ],
  links: [['/mark', 'mark a past paper to see what actually scored'], ['/blog/cambridge-enquiry-about-results-ear-guide-2026', 'enquiries about results'], ['/blog/cambridge-retakes-and-resits-2026-strategy', 'resit strategy']],
})

briefs.push({
  slug: 'what-your-cambridge-grades-mean-for-university',
  cluster: 'revision-strategy', format: 'guide', category: 'revision',
  title: 'What your Cambridge grades mean for university',
  description: 'How Cambridge International A Level grades feed into university offers worldwide, what conditional offers expect, and your options if you miss a grade.',
  keywords: 'Cambridge grades for university, A Level grades university offers, conditional offer, Cambridge International university, missed offer grade',
  facts: [
    'Cambridge International A Level grades (A*–E) are recognised by universities worldwide; many make conditional offers requiring specific grades.',
    'Requirements vary by country and university (UCAS tariff in the UK, GPA-style or direct grade requirements elsewhere) — always check each university’s own published requirements.',
    'Meet your offer and you are usually confirmed; narrowly miss and options include contacting the university, an enquiry about results (remark), Clearing or adjustment in the UK, or a November resit.',
    'June 2026 results are released on 13 August 2026; act quickly on any remark or appeal because university places can be time-sensitive.',
    'AS grades alone are not the final A Level; the full grade comes from the A2 aggregate.',
  ],
  mustNotClaim: [
    'Do NOT state specific entry requirements for any named university or country — they vary; tell readers to check official sources.',
    'Do NOT give immigration or visa advice.',
  ],
  links: [['/blog/cambridge-results-day-august-2026-guide', 'results day guide'], ['/mark', 'mark a past paper'], ['/tools/grade-boundary-calculator', 'estimate your grade']],
})

briefs.push({
  slug: 'how-to-talk-to-parents-about-cambridge-results',
  cluster: 'revision-strategy', format: 'howto', category: 'study-skills',
  title: 'How to talk to parents about Cambridge results',
  description: 'Dreading the results conversation? Here is how to prepare your parents before 13 August 2026, frame the outcome honestly, and agree a plan together.',
  keywords: 'talk to parents about results, exam results parents, results day parents, telling parents grades, Cambridge results conversation',
  facts: [
    'June 2026 Cambridge results are released on 13 August 2026.',
    'Setting expectations before results day — how exams felt, and that boundaries are unknown until the day — reduces shock.',
    'A calm conversation works best when you bring a plan for each outcome, not just the result: next steps for a strong result, on-target, or below.',
    'If grades are lower than hoped, raise the real options: an enquiry about results (remark), the November resit series, and speaking to universities.',
    'Parents usually want to help; sharing your plan and the support you need turns the conversation into problem-solving.',
  ],
  mustNotClaim: [
    'Do NOT give family counselling or clinical advice; keep guidance practical and general.',
    'Do NOT promise specific outcomes.',
  ],
  links: [['/blog/cambridge-results-day-august-2026-guide', 'results day guide'], ['/blog/cambridge-retakes-and-resits-2026-strategy', 'resit options'], ['/mark', 'mark a past paper']],
})

briefs.push({
  slug: 'how-to-plan-your-next-year-after-cambridge-as-results',
  cluster: 'revision-strategy', format: 'howto', category: 'revision',
  title: 'How to plan your next year after Cambridge AS results',
  description: 'AS results shape your A2 year. Here is how to read your Cambridge AS grades, decide whether to carry, drop or resit, and set up a strong A2.',
  keywords: 'after AS results, AS to A2, Cambridge AS results, carry forward AS, A2 planning, AS resit',
  facts: [
    'Cambridge AS Level grades (a–e) can be carried forward and combined with A2 to give the full A Level (A*–E), depending on how your school enters you.',
    'AS results help you decide which subjects to continue to A2, whether to resit an AS component, or whether to carry the AS mark forward.',
    'The full A Level grade is an aggregate of AS and A2 components, so a weaker AS can often be balanced by a strong A2 — and an A* needs strong A2.',
    'Carry-forward rules and entry options vary by school; confirm with your exams officer before deciding.',
    'Use the summer to get ahead on the first A2 topics and to fix the weak areas your AS papers exposed.',
  ],
  mustNotClaim: [
    'Do NOT state definitive carry-forward rules for an individual — they depend on the school’s entry; tell readers to confirm with their exams officer.',
    'Do NOT invent grade boundary numbers.',
  ],
  links: [['/courses', 'free A Level courses'], ['/mark', 'mark a past paper'], ['/tools/grade-boundary-calculator', 'grade calculator']],
})

// ---- Evergreen study-skill gaps (high-traffic, not yet covered) ----
briefs.push({
  slug: 'how-to-use-active-recall-for-exam-revision',
  cluster: 'revision-strategy', format: 'howto', category: 'study-skills',
  title: 'How to use active recall for exam revision',
  description: 'Active recall is the most evidence-backed way to revise. Here is how to use retrieval practice with past papers and mark schemes to remember more, faster.',
  keywords: 'active recall, retrieval practice, how to revise effectively, testing yourself revision, active recall technique',
  facts: [
    'Active recall (retrieval practice) means testing yourself from memory rather than re-reading notes — research consistently shows it beats passive review.',
    'The core move: close the book and write or say everything you can remember, then check against your notes or the mark scheme and fill the gaps.',
    'Past-paper questions are ideal active recall: attempt from memory, then mark against the official scheme to see exactly what was missing.',
    'Techniques include blank-page "brain dumps", flashcards (question one side, answer the other), and answering past-paper questions closed-book.',
    'It feels harder than re-reading, and that difficulty (desirable difficulty) is what makes it work — do not mistake fluency from re-reading for real learning.',
    'Pair active recall with spacing (revisiting topics over days/weeks) for the strongest effect.',
  ],
  mustNotClaim: [
    'Do NOT promise specific grades or guaranteed results from any technique.',
  ],
  links: [['/mark', 'mark your past-paper attempts'], ['/courses', 'free Cambridge courses'], ['/tools/command-words', 'command words']],
})

briefs.push({
  slug: 'how-to-use-spaced-repetition-for-exam-revision',
  cluster: 'revision-strategy', format: 'howto', category: 'study-skills',
  title: 'How to use spaced repetition for exam revision',
  description: 'Spaced repetition beats cramming by reviewing topics at growing intervals. Here is how to build a simple spaced revision schedule that locks knowledge in.',
  keywords: 'spaced repetition, spacing effect, revision intervals, revision schedule, how to stop cramming',
  facts: [
    'Spaced repetition means reviewing material at increasing intervals (for example after 1 day, 3 days, a week, then two weeks) rather than in one long session.',
    'It works because each well-timed review just before you would forget strengthens long-term memory — the spacing effect.',
    'It is the opposite of cramming, which produces fast forgetting; spacing trades a little short-term comfort for much better retention.',
    'A simple system: keep a list of topics with the date you last revised each, and bring forward any topic you are starting to forget.',
    'Combine it with active recall — each spaced review should be a test from memory (past-paper question or flashcard), not a re-read.',
    'Digital tools and a plain paper tracker both work; consistency matters more than the tool.',
  ],
  mustNotClaim: [
    'Do NOT promise specific grades or exact retention percentages.',
  ],
  links: [['/mark', 'mark a past paper'], ['/courses', 'free Cambridge courses'], ['/tools/grade-boundary-calculator', 'grade calculator']],
})

briefs.push({
  slug: 'how-to-manage-exam-anxiety-and-nerves',
  cluster: 'revision-strategy', format: 'howto', category: 'study-skills',
  title: 'How to manage exam anxiety and nerves',
  description: 'Exam nerves are normal — but they are manageable. Practical, calm strategies to steady yourself before and during a Cambridge or IB exam.',
  keywords: 'exam anxiety, exam nerves, how to calm down before exam, exam stress, manage exam nerves',
  facts: [
    'Some nerves are normal and even helpful — the goal is to manage anxiety so it does not block recall, not to remove it entirely.',
    'Preparation is the biggest anxiety reducer: doing past papers under timed conditions makes the real exam feel familiar.',
    'Before the exam: protect your sleep the night before (better than late cramming), eat, arrive early, and avoid last-minute panic-comparing with classmates.',
    'In the exam: read the whole paper first, start with a question you can do to build momentum, and use slow breathing if your mind races.',
    'If you blank, move on and come back — leaving a question and returning often unlocks it.',
    'If anxiety is persistent or overwhelming, talk to a teacher, school counsellor or a trusted adult — you do not have to manage it alone.',
  ],
  mustNotClaim: [
    'Do NOT give clinical, medical or crisis mental-health advice; keep tips general and signpost trusted support.',
    'Do NOT promise specific outcomes.',
  ],
  links: [['/mark', 'practise with marked past papers'], ['/courses', 'free Cambridge courses'], ['/tools/exam-countdown', 'exam countdown']],
})

briefs.push({
  slug: 'how-to-manage-your-time-during-an-exam',
  cluster: 'revision-strategy', format: 'howto', category: 'exam-technique',
  title: 'How to manage your time during an exam',
  description: 'Running out of time loses easy marks. Here is how to split exam time by marks, pace each question, and leave time to check — for any Cambridge or IB paper.',
  keywords: 'exam time management, running out of time in exams, how to pace an exam, time per mark, exam timing strategy',
  facts: [
    'Work out a rough minutes-per-mark budget at the start: divide the total time (minus a few minutes to check) by the total marks.',
    'Read the whole paper first so you can plan and spot the questions you answer best.',
    'Do not overrun a hard question — if you are stuck past its time budget, flag it, move on, and come back with spare time.',
    'Spend time in proportion to marks: a 2-mark question should not get the time of an 8-mark one.',
    'Leave a few minutes at the end to check units, significant figures, and that every question is attempted — blank answers score zero.',
    'Practise this under timed conditions with past papers so pacing becomes automatic on the day.',
  ],
  mustNotClaim: [
    'Do NOT give a single fixed minutes-per-mark figure as universal — it depends on each paper’s total marks and duration.',
  ],
  links: [['/mark', 'mark a timed past paper'], ['/courses', 'free Cambridge courses'], ['/tools/command-words', 'command words']],
})

briefs.push({
  slug: 'how-to-make-revision-flashcards-that-work',
  cluster: 'revision-strategy', format: 'howto', category: 'study-skills',
  title: 'How to make revision flashcards that work',
  description: 'Most flashcards fail because they just copy notes. Here is how to build flashcards around active recall so they actually move your grade.',
  keywords: 'revision flashcards, how to make flashcards, flashcards for exams, study cards, effective flashcards',
  facts: [
    'Good flashcards test recall: a clear question or prompt on one side, a concise answer on the other — not a paragraph copied from notes.',
    'Keep one idea per card; cards crammed with information cannot be tested cleanly.',
    'Write cards in your own words and turn facts into questions ("What does Evaluate require?") so each card forces retrieval.',
    'Review them with spacing — sort into "know it" and "review soon" piles instead of flipping through all of them once.',
    'For some subjects, test both directions (term to definition and definition to term) and include worked-step prompts for methods.',
    'Digital and paper both work; the discipline of self-testing matters more than the format.',
  ],
  mustNotClaim: [
    'Do NOT promise specific grades from using flashcards.',
  ],
  links: [['/mark', 'mark a past paper'], ['/courses', 'free Cambridge courses'], ['/tools/command-words', 'command words']],
})

briefs.push({
  slug: 'calculator-vs-non-calculator-exam-strategy',
  cluster: 'revision-strategy', format: 'guide', category: 'exam-technique',
  title: 'Calculator vs non-calculator exam strategy',
  description: 'Calculator and non-calculator papers reward different skills. Here is how to check which is which and prepare the right way for each Cambridge or IB paper.',
  keywords: 'calculator exam strategy, non-calculator paper, calculators allowed exam, calculator paper tips, exam calculator skills',
  facts: [
    'Whether a calculator is allowed varies by subject and by paper — always check the instructions on the front of the question paper and past papers.',
    'For calculator papers, practise fast, accurate calculator use (memory, brackets, the right mode) so you do not lose time or make slips.',
    'For non-calculator papers, drill mental and written methods, estimation, and showing clear working — method marks reward the steps.',
    'A calculator does not replace understanding: many marks come from setting up the method correctly, which the calculator cannot do.',
    'Use the official mark scheme when you practise so you see exactly where method and accuracy marks are awarded.',
    'Bring an allowed, working calculator and know its functions before the exam — exam day is not the time to learn it.',
  ],
  mustNotClaim: [
    'Do NOT state which specific papers allow calculators for any subject — this varies; tell readers to check the paper instructions.',
  ],
  links: [['/mark', 'mark a past paper'], ['/courses', 'free Cambridge courses'], ['/tools/grade-boundary-calculator', 'grade calculator']],
})

const selected = briefs.filter((b) => ONLY.length === 0 || ONLY.some((o) => b.slug.includes(o)))
console.log(`Generating ${selected.length} posts -> ${OUT_DIR}${WRITE ? ' (WRITE)' : ' (dry)'}\n`)
let ok = 0, skip = 0, fail = 0
const report = []
for (const b of selected) {
  // integrity: slug must route to its declared cluster + format
  const cl = getClusterForSlug(b.slug).id
  const fmt = getPostSeoMeta(b.slug).format
  if (cl !== b.cluster) { console.log(`XX ${b.slug}\n   cluster ${cl} != ${b.cluster}`); fail++; continue }
  const file = join(OUT_DIR, `${b.slug}.md`)
  if (existsSync(file) && !FORCE) { console.log(`-- skip exists: ${b.slug}`); skip++; continue }
  try {
    const body = await genBody(b)
    if (!body) { console.log(`XX ${b.slug} — empty response`); fail++; continue }
    const errs = validate(b, body)
    if (errs.length) { console.log(`XX ${b.slug} — ${errs.join(', ')}`); fail++; writeFileSync(join(OUT_DIR, `_REJECTED_${b.slug}.md`), `${frontmatter(b)}\n\n${body}`); continue }
    writeFileSync(file, `${frontmatter(b)}\n\n${body}\n`)
    ok++; report.push({ slug: b.slug, cluster: cl, format: fmt, words: body.split(/\s+/).length, faqs: countFaq(body) })
    console.log(`OK ${b.slug} (${cl}/${fmt}, ${body.split(/\s+/).length}w, ${countFaq(body)} faqs)`)
  } catch (e) { console.log(`XX ${b.slug} — ${String(e).slice(0, 80)}`); fail++ }
}
writeFileSync(join(OUT_DIR, '_report.json'), JSON.stringify(report, null, 2))
console.log(`\n=== DONE: ${ok} written, ${skip} skipped, ${fail} failed ===`)
