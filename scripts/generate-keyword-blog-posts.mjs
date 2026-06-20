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
import { join } from 'path'

for (const line of readFileSync('.env.local', 'utf8').split('\n')) {
  const t = line.trim(); if (!t || t.startsWith('#')) continue
  const eq = t.indexOf('='); if (eq < 0) continue
  const k = t.slice(0, eq).trim(); let v = t.slice(eq + 1).trim()
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1)
  if (process.env[k] === undefined) process.env[k] = v
}
process.env.USE_VERTEX_AI = 'true'

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
for (const code of ['9708', '9489', '9699', '9609', '9990', '9084', '9700', '9702', '9701', '9618', '9706', '9488']) {
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
    'author: hassan',
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
