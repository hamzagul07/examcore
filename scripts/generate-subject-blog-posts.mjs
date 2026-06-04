/**
 * One-off generator for per-subject Cambridge past-paper SEO guides.
 * Run: node scripts/generate-subject-blog-posts.mjs
 */
import fs from 'fs'
import path from 'path'

const BLOG_DIR = path.join(process.cwd(), 'content', 'blog')

/** @type {Array<{slug:string,code:string,name:string,level:string,marking:string,papers:string,scheme:string,mistakes:string[],revise:string[],keywords:string[]}>} */
const SUBJECTS = [
  {
    slug: 'cambridge-9709-a-level-mathematics-past-papers-guide',
    code: '9709',
    name: 'Mathematics',
    level: 'A-Level',
    marking: 'point-based (B1, M1, A1)',
    papers:
      'Pure Mathematics (P1–P3), Mechanics (M1/M2), and Probability & Statistics (S1/S2) depending on your route. Papers are numbered by component (e.g. 9709/12, 9709/62).',
    scheme:
      'Examiners award **method marks (M1)** for correct approach, **accuracy marks (A1)** for correct results, and **B1** for independent facts. **ECF** (error carried forward) can rescue later marks if your method stays consistent.',
    mistakes: [
      'Skipping working and only writing a final answer',
      'Losing M marks for correct idea with wrong algebra shown',
      'Not stating domains/restrictions on graphs and functions',
    ],
    revise: [
      'Drill one pure topic per week (integration, vectors, complex numbers)',
      'Alternate mechanics and statistics papers if you take both',
      'Mark one long question per session with the official scheme open',
    ],
    keywords: [
      '9709 past papers',
      'A-Level maths marking',
      'Cambridge mathematics mark scheme',
      'B1 M1 A1',
      'past paper self assessment',
    ],
  },
  {
    slug: 'cambridge-9231-further-mathematics-past-papers-guide',
    code: '9231',
    name: 'Further Mathematics',
    level: 'A-Level',
    marking: 'point-based (B1, M1, A1)',
    papers:
      'Further Pure, Further Mechanics, and Further Probability & Statistics components. Content builds on 9709 with deeper proof and harder applications.',
    scheme:
      'Same Cambridge mark conventions as 9709, often with more **M** marks chained in a single question. Proof questions need logical steps — a correct conclusion with no reasoning earns little.',
    mistakes: [
      'Treating Further Maths like harder 9709 without learning new definitions',
      'Weak proof structure (asserting results without justification)',
      'Time management on long multi-part questions',
    ],
    revise: [
      'Keep 9709 skills warm — Further papers assume fluency',
      'Practice one full component paper per fortnight',
      'Use examiner reports for proof wording patterns',
    ],
    keywords: [
      '9231 past papers',
      'Further Mathematics Cambridge',
      'A-Level further maths marking',
      'Cambridge past papers',
    ],
  },
  {
    slug: 'cambridge-4024-o-level-mathematics-past-papers-guide',
    code: '4024',
    name: 'Mathematics',
    level: 'O-Level',
    marking: 'point-based',
    papers:
      'Two papers: non-calculator and calculator. Syllabus emphasises number, algebra, graphs, mensuration, and trigonometry.',
    scheme:
      'Marks reward clear method and accuracy. Show working for multi-step problems — examiners cannot award method marks for answers alone.',
    mistakes: [
      'Calculator paper reliance without showing key steps',
      'Sign errors in algebra and inequalities',
      'Poor diagram labelling on geometry questions',
    ],
    revise: [
      'Master non-calculator fluency early in the year',
      'Use past papers from the last five sessions',
      'Mark one paper per week in the final term',
    ],
    keywords: [
      '4024 past papers',
      'O-Level maths Cambridge',
      'O-Level mathematics marking',
      'Cambridge O-Level past papers',
    ],
  },
  {
    slug: 'cambridge-4037-additional-mathematics-past-papers-guide',
    code: '4037',
    name: 'Additional Mathematics',
    level: 'O-Level',
    marking: 'point-based',
    papers:
      'Single syllabus bridging O-Level Maths and A-Level. Strong algebra, functions, coordinate geometry, and introductory calculus.',
    scheme:
      'Method and accuracy marks similar to A-Level style. Chains of reasoning matter for calculus and coordinate geometry.',
    mistakes: [
      'Memorising procedures without understanding restrictions',
      'Algebraic slips losing multiple follow-through marks',
      'Rushing proofs and show-that questions',
    ],
    revise: [
      'Secure 4024 skills first',
      'Practice calculus from first principles questions',
      'Mark show-that questions line by line',
    ],
    keywords: [
      '4037 past papers',
      'Additional Mathematics O-Level',
      'Cambridge additional maths',
      'O-Level past papers',
    ],
  },
  {
    slug: 'cambridge-9700-a-level-biology-past-papers-guide',
    code: '9700',
    name: 'Biology',
    level: 'A-Level',
    marking: 'point-based (keywords and phrases)',
    papers:
      'Multiple choice (Paper 1), AS structured (Paper 2), A2 structured (Paper 4), and practical skills (Paper 3/5).',
    scheme:
      'Mark schemes use **acceptable answers**, **allow lists**, and **reject lists**. Precision matters: wrong terminology often scores zero even if the idea is right.',
    mistakes: [
      'Vague answers where the scheme demands a named process',
      'Confusing similar terms (e.g. transcription vs translation)',
      'Not linking data in graph questions to biological mechanism',
    ],
    revise: [
      'Learn definitions as mark-scheme phrases, not paraphrases',
      'Practice data-analysis questions with past Paper 4',
      'Pair content revision with MCQ timed sets',
    ],
    keywords: [
      '9700 past papers',
      'A-Level biology marking',
      'Cambridge biology mark scheme',
      'past paper practice',
    ],
  },
  {
    slug: 'cambridge-5090-o-level-biology-past-papers-guide',
    code: '5090',
    name: 'Biology',
    level: 'O-Level',
    marking: 'point-based',
    papers:
      'Theory papers plus practical assessment. Content spans cells, human physiology, ecology, and genetics at O-Level depth.',
    scheme:
      'Keyword marking dominates. Use syllabus terminology. Extended answers need clear logical steps.',
    mistakes: [
      'Describing instead of explaining "why"',
      'Missing units or labels on graphs',
      'Imprecise experimental method vocabulary',
    ],
    revise: [
      'Build a glossary from mark schemes',
      'Practice structured questions by topic',
      'Review practical skills criteria alongside theory',
    ],
    keywords: [
      '5090 past papers',
      'O-Level biology Cambridge',
      'biology past paper marking',
      'Cambridge revision',
    ],
  },
  {
    slug: 'cambridge-9701-a-level-chemistry-past-papers-guide',
    code: '9701',
    name: 'Chemistry',
    level: 'A-Level',
    marking: 'point-based',
    papers:
      'MCQ (Paper 1), AS structured (Paper 2), A2 structured (Paper 4), and practical (Paper 3/5). Organic, inorganic, and physical chemistry integrated.',
    scheme:
      'Equations, state symbols, units, and significant figures are often required for full marks. Organic mechanisms need correct curly arrows and intermediates where specified.',
    mistakes: [
      'Unbalanced equations or missing state symbols',
      'Vague mechanism steps',
      'Calculation errors without working shown for M marks',
    ],
    revise: [
      'Drill mole calculations weekly',
      'Practice mechanism templates from past papers',
      'Mark calculations with unit checks',
    ],
    keywords: [
      '9701 past papers',
      'A-Level chemistry marking',
      'Cambridge chemistry mark scheme',
      '9701 revision',
    ],
  },
  {
    slug: 'cambridge-5070-o-level-chemistry-past-papers-guide',
    code: '5070',
    name: 'Chemistry',
    level: 'O-Level',
    marking: 'point-based',
    papers:
      'Theory and practical components. Strong emphasis on equations, bonding explanations, and qualitative analysis vocabulary.',
    scheme:
      'Precise chemical language required. Show working in calculations. Diagrams must be labelled correctly.',
    mistakes: [
      'Incorrect formulae in equations',
      'Explaining bonding without reference to particles',
      'Rounding errors in quantitative questions',
    ],
    revise: [
      'Memorise common ion tests and gas tests with exact wording',
      'Alternate topic tests with full papers',
      'Use mark schemes to learn acceptable phrasing',
    ],
    keywords: [
      '5070 past papers',
      'O-Level chemistry Cambridge',
      'chemistry past papers',
      'Cambridge O-Level',
    ],
  },
  {
    slug: 'cambridge-9702-a-level-physics-past-papers-guide',
    code: '9702',
    name: 'Physics',
    level: 'A-Level',
    marking: 'point-based',
    papers:
      'MCQ, structured AS, structured A2, and practical skills papers. Heavy on calculations, definitions, and graph interpretation.',
    scheme:
      'Marks for formula, substitution, answer with unit, and sensible significant figures. Definitions must match syllabus wording.',
    mistakes: [
      'Missing units or power-of-ten errors',
      'Using wrong equation for the scenario',
      'Weak explanations linking maths to physical meaning',
    ],
    revise: [
      'Maintain a formula sheet tied to past paper tags',
      'Practice Paper 4 multi-topic questions',
      'Mark definitions against the scheme verbatim',
    ],
    keywords: [
      '9702 past papers',
      'A-Level physics marking',
      'Cambridge physics mark scheme',
      'physics past paper practice',
    ],
  },
  {
    slug: 'cambridge-5054-o-level-physics-past-papers-guide',
    code: '5054',
    name: 'Physics',
    level: 'O-Level',
    marking: 'point-based',
    papers:
      'Theory papers covering mechanics, waves, electricity, thermal physics, and atomic physics at O-Level standard.',
    scheme:
      'Show working for calculations. State laws precisely. Diagrams need labels and direction arrows where relevant.',
    mistakes: [
      'No working shown on calculation questions',
      'Confusing speed and velocity graphs',
      'Imprecise experimental method descriptions',
    ],
    revise: [
      'Practice past papers with strict timing',
      'Review practical alternative-to-practical vocabulary',
      'Mark one calculation question per day',
    ],
    keywords: [
      '5054 past papers',
      'O-Level physics Cambridge',
      'physics marking',
      'Cambridge past papers',
    ],
  },
  {
    slug: 'cambridge-9708-a-level-economics-past-papers-guide',
    code: '9708',
    name: 'Economics',
    level: 'A-Level',
    marking: 'mixed (MCQ, data response, essay bands)',
    papers:
      'AS and A2 papers with MCQ, data response, and essay components. Micro and macro topics across papers.',
    scheme:
      'Essays use **level-of-response bands** (KAA + evaluation). Data response marks specific points. Diagrams must be explained in text.',
    mistakes: [
      'List-style answers without chains of reasoning',
      'Diagrams with no written link to the question',
      'Evaluation that is one vague sentence',
    ],
    revise: [
      'Practice 20-mark essays with band descriptors open',
      'Build evaluation phrases from examiner reports',
      'Mark MCQ then review explanation for wrong items',
    ],
    keywords: [
      '9708 past papers',
      'A-Level economics essay marking',
      'economics band descriptors',
      'Cambridge economics',
    ],
  },
  {
    slug: 'cambridge-2281-o-level-economics-past-papers-guide',
    code: '2281',
    name: 'Economics',
    level: 'O-Level',
    marking: 'mixed',
    papers:
      'Structured theory and data questions at O-Level depth. Smaller mark tariffs than A-Level but same skills: definitions, diagrams, application.',
    scheme:
      'Clear definitions, explained diagrams, and applied examples score. Vague general knowledge scores little.',
    mistakes: [
      'Not using the data in extract questions',
      'Definitions without examples',
      'Ignoring command words (explain, discuss, calculate)',
    ],
    revise: [
      'Learn command words from past papers',
      'Draw and explain one diagram per topic weekly',
      'Mark with scheme after every timed question',
    ],
    keywords: [
      '2281 past papers',
      'O-Level economics Cambridge',
      'economics past papers',
      'Cambridge O-Level',
    ],
  },
  {
    slug: 'cambridge-9609-a-level-business-past-papers-guide',
    code: '9609',
    name: 'Business',
    level: 'A-Level',
    marking: 'mixed (case study + essays)',
    papers:
      'Case study papers and essay papers. Application to business context is essential — generic theory alone scores poorly.',
    scheme:
      'Marks for **application** to the scenario, **analysis** (because/therefore), and **evaluation** (judgement with justification).',
    mistakes: [
      'Theory dumps without naming the case business',
      'No stakeholder or time-horizon evaluation',
      'Ignoring data in the case appendices',
    ],
    revise: [
      'Practice case papers with annotated appendices',
      'Time essay plans before writing',
      'Mark one paragraph at a time against bands',
    ],
    keywords: [
      '9609 past papers',
      'A-Level business marking',
      'Cambridge business studies',
      'case study past papers',
    ],
  },
  {
    slug: 'cambridge-7115-o-level-business-studies-past-papers-guide',
    code: '7115',
    name: 'Business Studies',
    level: 'O-Level',
    marking: 'mixed',
    papers:
      'Case-based and structured questions on enterprise, marketing, finance, and operations at O-Level.',
    scheme:
      'Reward applied answers referencing the business in the stimulus. Clear advantages/disadvantages with context.',
    mistakes: [
      'Generic advantages of franchising with no case link',
      'No conclusion on recommend questions',
      'Misreading tables in case data',
    ],
    revise: [
      'Summarise case facts before answering',
      'Practice short application paragraphs',
      'Use past papers from your exam series',
    ],
    keywords: [
      '7115 past papers',
      'O-Level business studies',
      'Cambridge business past papers',
      '7115 revision',
    ],
  },
  {
    slug: 'cambridge-9706-a-level-accounting-past-papers-guide',
    code: '9706',
    name: 'Accounting',
    level: 'A-Level',
    marking: 'point-based',
    papers:
      'Structured papers with financial statements, ratios, and decision-making topics. Accuracy and format matter.',
    scheme:
      'Marks for correct figures, labels, and treatments (e.g. accruals, depreciation). Working often required for calculation marks.',
    mistakes: [
      'Wrong account titles in ledger questions',
      'Arithmetic slips without clear workings',
      'Confusing cash flow vs profit impacts',
    ],
    revise: [
      'Practice full financial statement questions timed',
      'Drill ratio interpretation with past data',
      'Mark line-by-line against the scheme',
    ],
    keywords: [
      '9706 past papers',
      'A-Level accounting marking',
      'Cambridge accounting',
      'financial statements past papers',
    ],
  },
  {
    slug: 'cambridge-7707-o-level-accounting-past-papers-guide',
    code: '7707',
    name: 'Accounting',
    level: 'O-Level',
    marking: 'point-based',
    papers:
      'Bookkeeping, final accounts, and basic interpretation at O-Level. Clear layouts expected.',
    scheme:
      'Format marks for ledgers and statements. Figures must balance. Narrative parts need precise accounting terms.',
    mistakes: [
      'Unbalanced trial balances carried forward',
      'Mixing debit/credit rules',
      'Vague control account explanations',
    ],
    revise: [
      'Daily practice of journal → ledger → trial balance',
      'One full past paper per week in exam term',
      'Check arithmetic with calculator twice',
    ],
    keywords: [
      '7707 past papers',
      'O-Level accounting Cambridge',
      'accounting past papers',
      'Cambridge O-Level',
    ],
  },
  {
    slug: 'cambridge-9489-a-level-history-past-papers-guide',
    code: '9489',
    name: 'History',
    level: 'A-Level',
    marking: 'level-of-response (essay bands)',
    papers:
      'Document-based and essay papers depending on your topics. Argument, evidence, and historiography at A-Level depth.',
    scheme:
      'Essays marked in **bands** for content, structure, and support. Specific evidence names dates and consequence — vague narrative scores mid-band.',
    mistakes: [
      'Narrative timelines without answering the question',
      'No clear thesis in introductions',
      'Sources quoted without analysis',
    ],
    revise: [
      'Plan essays in five minutes with explicit thesis',
      'Build topic evidence banks from mark schemes',
      'Practice document analysis with past Paper 1 style',
    ],
    keywords: [
      '9489 past papers',
      'A-Level history marking',
      'history essay bands Cambridge',
      'Cambridge history',
    ],
  },
  {
    slug: 'cambridge-9699-a-level-sociology-past-papers-guide',
    code: '9699',
    name: 'Sociology',
    level: 'A-Level',
    marking: 'level-of-response',
    papers:
      'Essay and shorter theory questions across core topics (family, education, crime, theory, etc.).',
    scheme:
      'Bands reward **conceptual knowledge**, **application**, and **evaluation**. Name theorists correctly and use their arguments precisely.',
    mistakes: [
      'Common-sense answers without sociological concepts',
      'Single theorist paragraphs with no evaluation',
      'Ignoring the specific angle of the question',
    ],
    revise: [
      'Flashcard theorists with one criticism each',
      'Practice 10-mark and 20-mark tariffs separately',
      'Mark essays one band lower on first pass',
    ],
    keywords: [
      '9699 past papers',
      'A-Level sociology marking',
      'sociology essay bands',
      'Cambridge sociology',
    ],
  },
  {
    slug: 'cambridge-9990-a-level-psychology-past-papers-guide',
    code: '9990',
    name: 'Psychology',
    level: 'A-Level',
    marking: 'mixed (studies, application, essays)',
    papers:
      'Core studies, approaches, and applied options. Mix of short tariff and essay responses.',
    scheme:
      'Marks for **named studies** (method, finding, conclusion), **application** to scenarios, and **evaluation** of methodology/ethics.',
    mistakes: [
      'Vague study descriptions without named researchers',
      'No evaluation after description',
      'Confusing correlation with causation in application',
    ],
    revise: [
      'Summarise each core study on one revision card',
      'Practice application stems from past papers',
      'Mark with scheme keyword lists highlighted',
    ],
    keywords: [
      '9990 past papers',
      'A-Level psychology marking',
      'Cambridge psychology',
      'psychology past papers',
    ],
  },
  {
    slug: 'cambridge-9084-a-level-law-past-papers-guide',
    code: '9084',
    name: 'Law',
    level: 'A-Level',
    marking: 'level-of-response',
    papers:
      'Scenario problem questions and essay papers. Application of legal rules to facts is central.',
    scheme:
      'Issue → rule → application → conclusion (IRAC-style) for problems. Essays need authority (cases/statutes) and balanced argument.',
    mistakes: [
      'Stating law without applying to facts',
      'Missing opposite party arguments',
      'No conclusion on problem questions',
    ],
    revise: [
      'Drill case names and ratios weekly',
      'Practice problem questions with timed plans',
      'Mark application paragraphs separately from rule statements',
    ],
    keywords: [
      '9084 past papers',
      'A-Level law marking',
      'Cambridge law past papers',
      'law problem questions',
    ],
  },
  {
    slug: 'cambridge-9488-a-level-islamic-studies-past-papers-guide',
    code: '9488',
    name: 'Islamic Studies',
    level: 'A-Level',
    marking: 'level-of-response',
    papers:
      'Textual knowledge, themes, and evaluative essays across syllabus topics.',
    scheme:
      'Bands reward accurate reference to sources, explanation, and balanced evaluation. Generic statements without textual support score low.',
    mistakes: [
      'General knowledge without syllabus-specific reference',
      'One-sided essays with no evaluation',
      'Misquoting or vague attribution',
    ],
    revise: [
      'Organise notes by syllabus theme',
      'Practice essays with explicit evaluative conclusions',
      'Compare your paragraphs to band descriptors',
    ],
    keywords: [
      '9488 past papers',
      'Islamic Studies A-Level Cambridge',
      'Cambridge past papers',
      'essay marking',
    ],
  },
  {
    slug: 'cambridge-9618-a-level-computer-science-past-papers-guide',
    code: '9618',
    name: 'Computer Science',
    level: 'A-Level',
    marking: 'point-based',
    papers:
      'Theory (Paper 1), problem-solving & programming (Paper 2), and advanced theory (Paper 3). Pseudocode and logic feature heavily.',
    scheme:
      'Marks for correct algorithms, trace tables, logic expressions, and precise technical vocabulary. Syntax in pseudocode must match syllabus conventions.',
    mistakes: [
      'Vague algorithm descriptions without steps',
      'Off-by-one errors in loop traces',
      'Confusing stack/queue operations',
    ],
    revise: [
      'Practice trace tables daily near exams',
      'Code solutions then compare to mark scheme logic',
      'Review binary/hex conversions under time pressure',
    ],
    keywords: [
      '9618 past papers',
      'A-Level computer science Cambridge',
      'computing past papers',
      '9618 marking',
    ],
  },
  {
    slug: 'cambridge-2210-o-level-computer-science-past-papers-guide',
    code: '2210',
    name: 'Computer Science',
    level: 'O-Level',
    marking: 'point-based',
    papers:
      'Theory and problem-solving papers with algorithms, databases, and hardware topics at O-Level.',
    scheme:
      'Precise technical terms required. Pseudocode and flowchart questions need complete logical coverage.',
    mistakes: [
      'Incomplete pseudocode (missing edge cases)',
      'Confusing RAM/ROM roles',
      'Weak database terminology',
    ],
    revise: [
      'Practice past Paper 2 questions weekly',
      'Build vocabulary lists from mark schemes',
      'Mark trace questions step by step',
    ],
    keywords: [
      '2210 past papers',
      'O-Level computer science',
      'Cambridge computing O-Level',
      '2210 revision',
    ],
  },
  {
    slug: 'cambridge-9607-a-level-media-studies-past-papers-guide',
    code: '9607',
    name: 'Media Studies',
    level: 'A-Level',
    marking: 'level-of-response',
    papers:
      'Analysis of media forms, industries, and representations plus coursework components (where applicable).',
    scheme:
      'Bands reward **terminology**, **examples**, and **analysis/evaluation** of how meaning is constructed. Named texts and contexts strengthen answers.',
    mistakes: [
      'Describing plot instead of analysing construction',
      'No media terminology',
      'Generic essays without case examples',
    ],
    revise: [
      'Case-study one set text per fortnight',
      'Practice analysis under timed conditions',
      'Highlight terminology in mark schemes',
    ],
    keywords: [
      '9607 past papers',
      'A-Level media studies Cambridge',
      'media analysis marking',
      'Cambridge past papers',
    ],
  },
]

function buildPost(s) {
  const levelSlug = s.level.replace(/\s+/g, ' ')
  const date = '2026-06-01'
  const title = `Cambridge ${levelSlug} ${s.name} (${s.code}) — past papers, mark schemes & how to mark`
  const description = `Complete guide to ${s.code} ${s.name} ${levelSlug}: paper structure, how Cambridge mark schemes work, common mistakes, revision plan, and marking your answers with MarkScheme.`
  const mistakeBlocks = s.mistakes
    .map((m, i) => `### ${i + 1}. Watch for this\n\n${m}`)
    .join('\n\n')
  const reviseList = s.revise.map((r) => `- ${r}`).join('\n')
  const kw = s.keywords.join(', ')

  return `---
title: ${title}
description: ${description}
date: ${date}
keywords: ${kw}
---

You did not choose ${s.name} (${s.code}) because you enjoy reading mark schemes for fun. You chose it because the grade matters — and past papers are where ${levelSlug} marks are actually won or lost.

Most students **finish** papers. Fewer students **mark** them properly. This guide is for the second group: you want Cambridge ${s.code} past papers, real mark scheme language, and a revision loop that moves your grade — not just your page count.

## Who this guide is for

- ${levelSlug} students sitting **${s.code}** this series (or planning ahead)
- Anyone self-marking who keeps thinking *“that’s basically right”* and still drops marks
- Students using [MarkScheme](/mark) who want **Past paper** mode matched to the official scheme

## What you will learn here

- How **${s.code}/XX** papers are labelled and which components you should practise
- What **${s.marking}** looks like in real examiner language
- Five repeatable mistakes — and what to do after each one
- A **weekly past-paper rhythm** you can run until exams
- How to mark homework that is *not* from a past paper

---

## ${s.code} at a glance

| | |
|---|---|
| **Subject** | ${s.name} |
| **Level** | ${levelSlug} |
| **Syllabus code** | ${s.code} |
| **Typical marking** | ${s.marking} |

Past papers are published as **${s.code}/XX** — **XX** is the component number for that session (e.g. Paper 1 vs Paper 4). Download the paper **and** the mark scheme for the **same session** from Cambridge International or your school portal. Mixing sessions is how students practise the right topic with the wrong marking rules.

---

## How Cambridge examines ${s.name}

### Paper structure

${s.papers}

### Before you sit the next paper

1. Check which **components** you are entered for (your route matters).
2. Read the **command words** on the front — they tell you depth, not just topic.
3. Note the **mark tariff** per question so you know when to stop and move on.

---

## How mark schemes work for ${s.name}

${s.scheme}

### Self-marking rule (non-negotiable)

Open the **official mark scheme first**, cover your answer, and award marks as if you were an examiner. Only then uncover your work. If you read the scheme *after* you have already convinced yourself the answer “counts”, you are training false confidence.

---

## Five mistakes that cost marks on ${s.code}

${mistakeBlocks}

**If the same issue appears twice in one week of marking, it is your number-one revision target** — not “bad luck” on the day.

---

## A revision plan that uses past papers properly

${reviseList}

### The rule of three (use every session)

1. **Attempt** — timed where possible, even one heavy question counts  
2. **Mark** — line by line with the official scheme  
3. **Rewrite** — only the step or paragraph that lost marks  

Skipping step two is why students say they are “doing past papers” while grades stay flat.

### Suggested weekly rhythm (6–8 weeks out)

| Day | Focus |
|-----|--------|
| Mon | One structured question, full mark + rewrite |
| Wed | Topic drill (definitions / short calculations / essay plan) |
| Sat | Half or full component paper under time |
| Sun | Log misses in a single notebook page — one line per lost mark |

---

## Marking questions that are not from a past paper

Homework, textbook exercises, and test-style questions still deserve examiner-style feedback. On [MarkScheme](/mark):

1. Choose **My question**  
2. Select **${s.name} (${s.code})**  
3. Add the question (photo or text) and your answer  
4. Read feedback tied to **method marks, bands, or point marks** — whichever fits the question type  

For real past-paper items, use **Past paper** mode so we can match the official mark scheme when it is in our library. Tips for phone photos: [photographing handwritten answers](/blog/photograph-handwritten-past-paper-answers).

---

## Frequently asked questions

### Where do I download ${s.code} past papers?

From Cambridge International’s past paper portal or your school — always pair **paper + mark scheme + examiner report** for the same series.

### How strict should I be when self-marking?

Stricter than you feel is fair on the first pass. Generous marking feels good for ten minutes and expensive on results day.

### Can AI replace reading the mark scheme?

AI helps as a **second pair of eyes** after you have tried — not as a substitute for knowing what examiners reward. [AI marking guide](/blog/ai-marking-cambridge-past-papers-guide).

### How does MarkScheme differ from comparing to model answers?

Model answers show *an* solution. Mark schemes show **what earns each mark** — including partial credit you might miss.

---

## What to read next

- [How to read a Cambridge mark scheme](/blog/how-to-read-a-cambridge-mark-scheme)
- [How to mark Cambridge past papers yourself](/blog/how-to-mark-cambridge-past-papers-yourself)
- [Common mistakes when self-marking](/blog/common-mistakes-self-marking-past-papers)
- [Cambridge past paper revision schedule](/blog/cambridge-past-paper-revision-schedule)

---

## Bottom line

**${s.code} rewards precision against the mark scheme**, not vague knowledge. Learn examiner wording, mark honestly once per question, and fix one repeatable error at a time — that is how ${levelSlug} ${s.name} scores move.
`
}

const force = process.argv.includes('--force')

for (const s of SUBJECTS) {
  const file = path.join(BLOG_DIR, `${s.slug}.md`)
  if (fs.existsSync(file) && !force) {
    console.log('skip (exists):', s.slug)
    continue
  }
  fs.writeFileSync(file, buildPost(s), 'utf8')
  console.log(force ? 'updated:' : 'wrote:', s.slug)
}

console.log('done —', SUBJECTS.length, 'subjects', force ? '(forced)' : '')
