/**
 * Generate missing IB Diploma SEO blog spokes — subject-specific, keyword-rich revision guides.
 * Skips files that already exist unless --force.
 *
 *   node scripts/generate-ib-blog-spokes.mjs
 *   node scripts/generate-ib-blog-spokes.mjs --force
 */
import fs from 'fs'
import path from 'path'

const BLOG_DIR = path.join(process.cwd(), 'content', 'blog')
const DATE = '2026-06-25'
const FORCE = process.argv.includes('--force')
const ONLY = process.argv.find((a) => a.startsWith('--only='))?.slice('--only='.length)
const HL_ONLY = process.argv.includes('--hl-only')
const SL_ONLY = process.argv.includes('--sl-only')
const COURSES_DIR = path.join(process.cwd(), 'content', 'courses')

/** @typedef {{ slug: string; title: string; description: string; keywords: string[]; name: string; level: string; catalogSlug: string; courseSlug?: string; assessment: string; markbands: string; strategy: string; paperTips: string; pitfalls: string; faqs: { q: string; a: string }[]; intro?: string }} PostBrief */

/** @type {PostBrief[]} */
const POSTS = [
  // ── Sciences SL ───────────────────────────────────────────────────────────
  {
    slug: 'ib-biology-sl-past-papers-guide',
    title: 'IB Biology SL past papers & revision guide',
    description: 'How to revise IB Biology SL with past papers: Papers 1–3, markbands, data-based questions, and a workflow to reach a 6 or 7.',
    keywords: ['IB Biology SL', 'IB Biology SL past papers', 'IB Biology mark scheme', 'IB Biology SL revision', 'IB Biology markbands'],
    name: 'Biology', level: 'SL', catalogSlug: 'biology-sl', courseSlug: 'biology-sl',
    assessment: '**Paper 1** is multiple choice across the SL syllabus. **Paper 2** mixes data-based questions (DBQs) with shorter structured and extended responses. **Paper 3** covers practical skills, experimental techniques, and your chosen option topic. Your **Internal Assessment (IA)** is a hands-on investigation marked against five criteria.',
    markbands: 'Extended responses on Paper 2 use **markbands** — examiners place your whole answer in a level (e.g. 3–4 vs 5–6 marks) based on depth, terminology, and evaluation. Listing facts without linking them to the question keeps you in the middle bands.',
    strategy: 'Complete timed papers, then mark MCQs against the mark scheme and long answers against **band descriptors**. Track whether you lose marks on command terms (`Explain` vs `Evaluate`), data analysis, or option content before your next session.',
    paperTips: 'For **DBQs**, describe the trend first with quoted data and units, then explain the biology. For **Paper 3** option questions, learn the standard diagrams and definitions your option expects — they recur across sessions.',
    pitfalls: 'Memorising without application; ignoring units on graphs; writing narrative instead of answering the command term; leaving the option under-revised because it sits on Paper 3.',
    faqs: [
      { q: 'Is IB Biology SL easier than HL?', a: 'SL covers less content and has no HL-only topics, but markbands still reward analysis and precise terminology. Past papers from both levels help, but prioritise SL papers for timing and difficulty.' },
      { q: 'How important is the IA?', a: 'The IA is worth 20% of your final grade. A strong IA buffers exam performance — plan early and use the criteria checklist before you collect data.' },
      { q: 'May vs November papers?', a: 'Structure and difficulty are equivalent. Use both sessions to maximise question variety.' },
    ],
  },
  {
    slug: 'ib-chemistry-sl-past-papers-guide',
    title: 'IB Chemistry SL past papers & revision guide',
    description: 'IB Chemistry SL past paper strategy: Papers 1–3, stoichiometry under pressure, markbands, and how to push from a 5 to a 7.',
    keywords: ['IB Chemistry SL', 'IB Chemistry SL past papers', 'IB Chemistry mark scheme', 'IB Chemistry SL revision', 'IB Chemistry markbands'],
    name: 'Chemistry', level: 'SL', catalogSlug: 'chemistry-sl', courseSlug: 'chemistry-sl',
    assessment: '**Paper 1** is multiple choice. **Paper 2** has structured questions spanning stoichiometry, bonding, energetics, kinetics, and organic chemistry. **Paper 3** tests data interpretation, practical techniques, and your option. The **IA** is an individual investigation with criterion-based marking.',
    markbands: 'Longer Paper 2 responses are marked holistically against bands. Top bands require balanced equations, correct state symbols, logical working, and **chemical reasoning** — not just a final number.',
    strategy: 'After each timed paper, classify errors: calculation, mechanism, terminology, or time. Drill one weak topic (e.g. equilibrium ICE tables) before the next full paper. Use our [free Chemistry SL course](/ib/courses/chemistry-sl) for topic-by-topic refresh.',
    paperTips: 'Show **working** for every calculation — method marks exist even when the final answer is wrong. For organic mechanisms, curly arrows and partial charges must be unambiguous.',
    pitfalls: 'Unbalanced equations; missing units; vague definitions ("strong bond" without naming IMF vs covalent); rushing Paper 1 and losing easy MCQ marks.',
    faqs: [
      { q: 'Do I need to memorise the Data Booklet?', a: 'Know where every section lives — you cannot afford to search under time pressure. Practise papers with the booklet open from day one.' },
      { q: 'How do I improve Paper 3 data questions?', a: 'Practise reading graphs, identifying anomalies, and suggesting improvements to method — these skills transfer across topics.' },
      { q: 'Can HL past papers help SL students?', a: 'Use HL papers only for shared topics at SL depth; avoid HL-only content that will not be examined.' },
    ],
  },
  {
    slug: 'ib-physics-sl-past-papers-guide',
    title: 'IB Physics SL past papers & revision guide',
    description: 'Revise IB Physics SL with past papers: MCQ Paper 1, structured Paper 2, option Paper 3, and markband technique for a 7.',
    keywords: ['IB Physics SL', 'IB Physics SL past papers', 'IB Physics mark scheme', 'IB Physics SL revision', 'IB Physics markbands'],
    name: 'Physics', level: 'SL', catalogSlug: 'physics-sl', courseSlug: 'physics-sl',
    assessment: '**Paper 1** is multiple choice. **Paper 2** contains structured and extended questions across mechanics, thermal, waves, electricity, and atomic physics. **Paper 3** includes data-based practical-style questions and your option topic.',
    markbands: 'Extended answers are judged on **physics reasoning**: clear diagrams, stated assumptions, correct units, and linking maths to physical meaning. A correct number with no working rarely earns full credit.',
    strategy: 'Cycle: timed paper → mark → topic drill. Keep a formula sheet you build yourself (not just the booklet). Practise explaining *why* an equation applies, not only *how* to substitute.',
    paperTips: 'Draw diagrams for forces and circuits. Quote values with **SI units**. For uncertainties, practise combining absolute and percentage errors — a recurring Paper 3 theme.',
    pitfalls: 'Sign errors in vector problems; confusing scalars and vectors; skipping unit conversion; describing graphs without referencing gradient or area meaning.',
    faqs: [
      { q: 'Calculator for Paper 1?', a: 'Paper 1 allows a calculator in current syllabuses — confirm with your teacher, but practise MCQs with the calculator you will use in the exam.' },
      { q: 'How much working is enough?', a: 'If the question says "show that", every algebraic step must be visible. Examiners cannot infer missing logic.' },
      { q: 'Best option for SL?', a: 'Choose the option your school teaches well and for which you have the most past Paper 3 questions banked.' },
    ],
  },
  // ── Mathematics ───────────────────────────────────────────────────────────
  {
    slug: 'ib-maths-aa-sl-past-papers-guide',
    title: 'IB Maths AA SL past papers & revision guide',
    description: 'IB Mathematics Analysis and Approaches SL: Paper 1 (no GDC) and Paper 2 (GDC) past paper workflow, markbands, and grade 7 strategies.',
    keywords: ['IB Maths AA SL', 'IB Maths AA SL past papers', 'IB Analysis and Approaches SL', 'IB Maths AA mark scheme', 'IB Maths SL revision'],
    name: 'Mathematics: Analysis and Approaches', level: 'SL', catalogSlug: 'maths-aa-sl', courseSlug: 'maths-aa-sl',
    assessment: '**Paper 1** (no calculator) tests algebraic fluency, functions, trigonometry, and calculus without technology. **Paper 2** (calculator allowed) emphasises modelling, statistics, and longer problem-solving. There is no Paper 3 at SL. Your **IA** explores an individual mathematical topic.',
    markbands: 'IB maths uses criterion-based bands: communication, logical organisation, and correct notation matter as much as the final answer. Show reasoning even when the result seems obvious.',
    strategy: 'Alternate P1 and P2 practice — they test different muscles. For Paper 1, drill identities and manipulation speed. For Paper 2, master GDC skills: graph analysis, regression, and solver tools.',
    paperTips: 'On Paper 1, check domain restrictions and exact forms (surd, π). On Paper 2, always write down what you enter into the GDC and round only at the end unless told otherwise.',
    pitfalls: 'Calculator on Paper 1 (disqualifying); messy communication losing method marks; not practising statistics on GDC; weak IA dragging down a strong exam performance.',
    faqs: [
      { q: 'AA SL vs AI SL — which is harder?', a: 'AA SL is more algebra and proof-oriented; AI SL is more modelling and technology-heavy. Choose based on strength, not reputation.' },
      { q: 'How many past papers before exams?', a: 'Quality over quantity — 6–8 fully marked papers with error logs beats 20 rushed attempts.' },
      { q: 'Do I need Paper 3 practice?', a: 'No — SL has only Papers 1 and 2. Use that time to strengthen IA and weak syllabus topics.' },
    ],
  },
  {
    slug: 'ib-maths-ai-hl-past-papers-guide',
    title: 'IB Maths AI HL past papers & revision guide',
    description: 'IB Mathematics Applications and Interpretation HL: modelling papers, GDC mastery, Paper 3 problem-solving, and markband revision for a 7.',
    keywords: ['IB Maths AI HL', 'IB Maths AI past papers', 'IB Applications and Interpretation HL', 'IB Maths AI mark scheme', 'IB Maths AI HL revision'],
    name: 'Mathematics: Applications and Interpretation', level: 'HL', catalogSlug: 'maths-ai-hl', courseSlug: 'maths-ai-hl',
    assessment: '**Paper 1** (short response, GDC) and **Paper 2** (extended, GDC) emphasise real-world modelling, statistics, and technology. **Paper 3** (HL only) has two extended problem-solving questions requiring synthesis. The **IA** uses mathematical exploration in applied contexts.',
    markbands: 'Examiners reward **interpretation in context** — units, valid models, and commenting on limitations. A correct calculation without explaining what it means for the scenario sits in mid bands.',
    strategy: 'Practise full papers with the same GDC model you will use in exams. Build a checklist: model selection → parameters → validation → conclusion. Paper 3 needs calm, documented thinking — not speed.',
    paperTips: 'For statistics, state hypotheses, define variables, and interpret p-values in context. For modelling, always comment on domain, fit, and whether extrapolation is reasonable.',
    pitfalls: 'Treating AI HL like AA HL (symbolic manipulation without context); unlabeled graphs; ignoring Paper 3 communication marks; rounding too early in regression work.',
    faqs: [
      { q: 'Is Maths AI HL respected for university?', a: 'Requirements vary by course and country — check specific degree pages. AI HL suits social sciences, economics, and design-heavy fields.' },
      { q: 'GDC skills that matter most?', a: 'Graphing, solver, statistics packages, and matrix tools — practise until navigation is automatic.' },
      { q: 'How to prepare for Paper 3?', a: 'Work every available HL Paper 3 slowly; focus on structuring multi-step solutions and writing interim conclusions.' },
    ],
  },
  {
    slug: 'ib-maths-ai-sl-past-papers-guide',
    title: 'IB Maths AI SL past papers & revision guide',
    description: 'IB Maths Applications and Interpretation SL past papers: GDC-based Papers 1–2, modelling markbands, and revision workflow.',
    keywords: ['IB Maths AI SL', 'IB Maths AI SL past papers', 'IB Applications and Interpretation SL', 'IB Maths AI revision', 'IB Maths AI markbands'],
    name: 'Mathematics: Applications and Interpretation', level: 'SL', catalogSlug: 'maths-ai-sl', courseSlug: 'maths-ai-sl',
    assessment: '**Paper 1** and **Paper 2** are both calculator papers with shorter and longer questions on modelling, finance, statistics, and functions. No Paper 3 at SL.',
    markbands: 'Answers must connect maths to the **scenario** — interpret gradients, correlation, and model outputs in the units of the problem.',
    strategy: 'Use past papers to practise reading lengthy contexts quickly. Highlight given data, define variables, then plan before calculating.',
    paperTips: 'On finance questions, state whether values are nominal or effective. On statistics, link r or r² to strength and direction in plain language.',
    pitfalls: 'Calculator syntax errors; copying numbers wrong from the stem; answering without referencing the context; weak IA planning.',
    faqs: [
      { q: 'AA SL or AI SL for me?', a: 'If you enjoy contexts, data, and technology, AI SL fits. If you prefer algebra and calculus proofs, consider AA SL.' },
      { q: 'Non-calculator practice needed?', a: 'Minimal at SL — both papers allow GDC. Still practise mental estimation to catch entry errors.' },
      { q: 'Where to find AI SL papers?', a: 'Browse [IB Maths AI SL past papers](/ib/past-papers/maths-ai-sl) and pair with our [free course](/ib/courses/maths-ai-sl).' },
    ],
  },
  // ── Group 3 SL ────────────────────────────────────────────────────────────
  {
    slug: 'ib-economics-sl-past-papers-guide',
    title: 'IB Economics SL past papers & revision guide',
    description: 'IB Economics SL: Paper 1 essays and Paper 2 data response — markbands, diagrams, evaluation, and past paper workflow.',
    keywords: ['IB Economics SL', 'IB Economics SL past papers', 'IB Economics mark scheme', 'IB Economics SL revision', 'IB Economics markbands'],
    name: 'Economics', level: 'SL', catalogSlug: 'economics-sl', courseSlug: 'economics-sl',
    assessment: '**Paper 1** is extended response — choose one of three essay questions per section. **Paper 2** is data response based on an extract. There is no Paper 3 at SL (HL adds a policy/quantitative paper).',
    markbands: 'Essays are marked with **level descriptors** rewarding definitions, diagrams, analysis chains, and **evaluation** with a justified judgement. Data response marks link explicitly to the stimulus.',
    strategy: 'Essay plan before writing — thesis, two chains with diagrams, evaluation paragraph. For Paper 2, practise quoting from the extract for every application mark.',
    paperTips: 'Draw neat, labelled diagrams and explain them in words. Use real-world examples sparingly but precisely — one strong case beats three vague ones.',
    pitfalls: 'Descriptive essays without evaluation; diagrams not linked to the question; ignoring the extract in Paper 2; running out of time on part (d) evaluation.',
    faqs: [
      { q: 'How long are Paper 1 essays?', a: 'Follow the guide timing — typically around 45 minutes per essay including planning. Practise with a timer.' },
      { q: 'Do I need HL Paper 3 content?', a: 'No — SL stops at Papers 1 and 2. Do not waste revision time on HL extensions.' },
      { q: 'IA overlap with exams?', a: 'Micro/macroeconomics IA topics reinforce essay examples — align your IA theme with weak exam areas.' },
    ],
  },
  {
    slug: 'ib-business-management-sl-past-papers-guide',
    title: 'IB Business Management SL past papers & revision guide',
    description: 'IB Business Management SL past papers: case-study Paper 1, structured Paper 2, toolkit application, and markband essay technique.',
    keywords: ['IB Business Management SL', 'IB Business SL past papers', 'IB Business Management mark scheme', 'IB BM SL revision', 'IB Business markbands'],
    name: 'Business Management', level: 'SL', catalogSlug: 'business-management-sl', courseSlug: 'business-management-sl',
    assessment: '**Paper 1** is based on a pre-seen case study (SL) with structured questions testing application of the business management toolkit. **Paper 2** uses an unseen stimulus with quantitative and qualitative prompts.',
    markbands: 'Top bands require **application to the case**, not generic textbook lists. Name the tool, apply it to the business in the stimulus, then evaluate limitations.',
    strategy: 'Learn the toolkit by unit, then practise every past question by writing "tool → case evidence → so what → limitation" chains.',
    paperTips: 'For Paper 1, annotate the case study when it is released — stakeholders, financials, CSR angles. For Paper 2, show calculations clearly with units (currency, ratios).',
    pitfalls: 'Generic SWOT lists; no stakeholder named; forgetting to recommend a justified course of action; weak integration of HR/finance/marketing tools.',
    faqs: [
      { q: 'When is the Paper 1 case released?', a: 'IBO releases it in advance of the session — your school will distribute it. Start annotating immediately.' },
      { q: 'HL vs SL Paper 1 difference?', a: 'HL Paper 1 is an essay paper; SL is case-based structured questions — use SL-specific papers for timing.' },
      { q: 'How to practise evaluation?', a: 'End answers with "however" — stakeholder conflict, short vs long term, or data limitations.' },
    ],
  },
  {
    slug: 'ib-psychology-sl-past-papers-guide',
    title: 'IB Psychology SL past papers & revision guide',
    description: 'IB Psychology SL: Paper 1 approaches, Paper 2 options, markbands, studies, and past paper revision for a 6 or 7.',
    keywords: ['IB Psychology SL', 'IB Psychology SL past papers', 'IB Psychology mark scheme', 'IB Psychology SL revision', 'IB Psychology markbands'],
    name: 'Psychology', level: 'SL', catalogSlug: 'psychology-sl', courseSlug: 'psychology-sl',
    assessment: '**Paper 1** covers the three approaches (biological, cognitive, sociocultural) with SAQs and one essay. **Paper 2** tests your two options (from abnormal, developmental, health, or human relationships). No Paper 3 at SL.',
    markbands: 'Essays need **named studies** with method, findings, and link to the question. SAQs reward precision — define, study, apply in tight word limits.',
    strategy: 'Build study sheets: researcher, method, N, IV/DV, finding, ethics, one limitation. Practise SAQs to the minute; essays to a fixed plan (intro → study 1 → study 2 → counter → conclusion).',
    paperTips: 'Use command terms — "discuss" needs balance; "evaluate" needs judgement. Cite studies in the format examiners expect (name, year, key finding).',
    pitfalls: 'Vague study descriptions; no link back to the question; confusing approaches; neglecting options while over-revising Paper 1.',
    faqs: [
      { q: 'How many studies per essay?', a: 'Two well-developed studies plus evaluation usually outperform four shallow mentions.' },
      { q: 'HL papers for SL?', a: 'Paper 1 overlaps; ignore HL Paper 3 qualitative content for SL exams.' },
      { q: 'IA connection?', a: 'Simple experimental IA reinforces research methods vocabulary used in Paper 1 SAQs.' },
    ],
  },
  {
    slug: 'ib-history-sl-past-papers-guide',
    title: 'IB History SL past papers & revision guide',
    description: 'IB History SL: Paper 1 sources, Paper 2 essays, markbands, and revision workflow — no Paper 3 at SL.',
    keywords: ['IB History SL', 'IB History SL past papers', 'IB History mark scheme', 'IB History SL revision', 'IB History markbands'],
    name: 'History', level: 'SL', catalogSlug: 'history-sl', courseSlug: 'history-sl',
    assessment: '**Paper 1** is source-based on a prescribed subject. **Paper 2** requires two essays from different world history topics. SL has **no Paper 3** — regional depth is HL only. The **IA** is a historical investigation.',
    markbands: 'Essays need argument, evidence, and historiography — not narrative. Paper 1 rewards OPVL (origin, purpose, value, limitation) applied to the question.',
    strategy: 'Paper 1: practise every question type in the booklet. Paper 2: prepare two topic areas with essay plans and specific evidence banks (dates, names, statistics).',
    paperTips: 'Paper 1 synthesis question — integrate sources **and** own knowledge. Paper 2 — address the command term in your thesis first sentence.',
    pitfalls: 'Storytelling essays; generic OPVL without linking to utility; only revising one Paper 2 topic; running out of time on the second essay.',
    faqs: [
      { q: 'How many Paper 2 topics to learn?', a: 'You need depth in at least two world history topics — check which two your school entered.' },
      { q: 'Can I use HL Paper 3 questions?', a: 'Not for SL exams — but HL-style depth of evidence helps Paper 2 essays.' },
      { q: 'Best Paper 1 drill?', a: 'Timed source comparisons with a strict paragraph formula: claim → source evidence → limitation → judgement.' },
    ],
  },
  {
    slug: 'ib-geography-sl-past-papers-guide',
    title: 'IB Geography SL past papers & revision guide',
    description: 'IB Geography SL: Paper 1 themes, Paper 2 core units, markbands, case studies, and past paper revision.',
    keywords: ['IB Geography SL', 'IB Geography SL past papers', 'IB Geography mark scheme', 'IB Geography SL revision', 'IB Geography markbands'],
    name: 'Geography', level: 'SL', catalogSlug: 'geography-sl', courseSlug: 'geography-sl',
    assessment: '**Paper 1** tests optional themes (e.g. freshwater, food, health). **Paper 2** covers the core units (populations, urban, resources). SL has no HL Paper 3 on global interactions.',
    markbands: 'Top answers weave **named case studies** with processes and evaluation — sustainability, stakeholder conflict, and scale (local → global).',
    strategy: 'Case study bank per theme: location, stats, causes, impacts, management, evaluation. Practise sketch maps and annotated diagrams under time.',
    paperTips: 'Define terms first when asked. For 9-mark questions, structure: intro → process with diagram → case study → evaluate response/management.',
    pitfalls: 'Case studies without stats; confusing Paper 1 themes; no diagram when one is expected; generic "government should educate" evaluation.',
    faqs: [
      { q: 'How many case studies do I need?', a: 'At least one rich case per theme you study, plus flexible examples for Paper 2 cores.' },
      { q: 'HL Paper 3 for SL students?', a: 'Not examined at SL — invest that time in case study depth.' },
      { q: 'Fieldwork IA help exams?', a: 'Yes — methods and data presentation skills overlap with Paper 2 skills questions.' },
    ],
  },
  // ── Group 1 & 2 SL ────────────────────────────────────────────────────────
  {
    slug: 'ib-english-a-lang-lit-sl-past-papers-guide',
    title: 'IB English A Language & Literature SL revision guide',
    description: 'IB English A Language and Literature SL: Paper 1 non-literary analysis, Paper 2 comparative essay, criteria, and exam technique.',
    keywords: ['IB English A Language and Literature SL', 'IB English Lang Lit SL', 'IB English Paper 1', 'IB English SL revision', 'IB English markbands'],
    name: 'English A: Language and Literature', level: 'SL', catalogSlug: 'english-a-lang-lit-sl', courseSlug: 'english-a-lang-lit-sl',
    assessment: '**Paper 1** analyses unseen non-literary texts (ads, speeches, infographics). **Paper 2** is a comparative essay on two literary works studied in class. SL has shorter response lengths than HL but the same skills.',
    markbands: 'Criterion A rewards **understanding and interpretation**; B rewards analysis of authorial choices; C rewards coherence; D rewards language. HL weightings differ slightly but skills align.',
    strategy: 'Paper 1: practise micro-analysis — one technique, one effect, one link to context per paragraph. Paper 2: pre-build flexible thesis frames for each work pairing.',
    paperTips: 'Avoid feature spotting — chain technique → meaning → writer purpose. Paper 2: balance both texts every paragraph, not two separate halves.',
    pitfalls: 'Summarising plot; ignoring guiding question on Paper 1; no thesis on Paper 2; weak introduction that repeats the question.',
    faqs: [
      { q: 'Lang & Lit vs Literature SL?', a: 'Lang & Lit includes non-literary Paper 1; Literature SL analyses unseen poetry/prose only.' },
      { q: 'How many quotes to memorise?', a: 'Short, flexible fragments for Paper 2 — quality and relevance beat length.' },
      { q: 'Oral assessment?', a: 'Individual Oral reinforces analytical vocabulary that transfers to Paper 1 — rehearse aloud.' },
    ],
  },
  {
    slug: 'ib-english-a-literature-sl-past-papers-guide',
    title: 'IB English A Literature SL revision guide',
    description: 'IB English A Literature SL: guided literary analysis Paper 1, comparative Paper 2, assessment criteria, and revision workflow.',
    keywords: ['IB English Literature SL', 'IB English A Literature SL', 'IB Literature Paper 1', 'IB English SL revision', 'IB Literature markbands'],
    name: 'English A: Literature', level: 'SL', catalogSlug: 'english-a-literature-sl', courseSlug: 'english-a-literature-sl',
    assessment: '**Paper 1** is a guided literary analysis of an unseen poem or prose extract. **Paper 2** compares two studied works in response to one of several prompts.',
    markbands: 'Examiners reward sustained **literary analysis** — imagery, structure, voice, and tension — tied to an arguable thesis. Context is useful but must serve interpretation.',
    strategy: 'Paper 1: practise opening paragraphs that name a tension and a technique. Paper 2: outline four comparative paragraphs before writing — alternate texts.',
    paperTips: 'Close read line by line for Paper 1; avoid biographical digression. Paper 2: answer the **entire** prompt, not a prepared essay on a different angle.',
    pitfalls: 'Paraphrase instead of analysis; no conclusion; treating one text as primary; memorised essays that ignore the question wording.',
    faqs: [
      { q: 'Poetry or prose in Paper 1?', a: 'Either may appear — practise both. Learn scansion basics and prose narrative voice terms.' },
      { q: 'How many works for Paper 2?', a: 'Typically three studied works — you choose two that fit the prompt best.' },
      { q: 'Does SL differ from HL?', a: 'Shorter writing time and slightly lower word expectations — analysis quality standards remain high.' },
    ],
  },
  {
    slug: 'ib-spanish-b-sl-past-papers-guide',
    title: 'IB Spanish B SL past papers & revision guide',
    description: 'IB Spanish B SL: Paper 1 writing, Paper 2 reading and listening, themes, rubrics, and revision for a 6 or 7.',
    keywords: ['IB Spanish B SL', 'IB Spanish B SL past papers', 'IB Spanish B mark scheme', 'IB Spanish SL revision', 'IB Spanish B rubric'],
    name: 'Spanish B', level: 'SL', catalogSlug: 'spanish-b-sl', courseSlug: 'spanish-b-sl',
    assessment: '**Paper 1** is productive writing (email, blog, proposal) from a choice of prompts across five themes. **Paper 2** combines reading comprehension and listening with short and extended responses.',
    markbands: 'Writing is marked on **criterion-based rubrics**: vocabulary range, accuracy, organisation, and task fulfilment. Top bands need idiomatic range with few errors — not complexity with breakdown.',
    strategy: 'Theme vocabulary lists + writing templates per text type. Listening: daily short clips with note-taking; reading: underline question keywords before scanning.',
    paperTips: 'Hit every bullet in the prompt. For formal register, practise usted forms and set phrases. Leave five minutes to proofread accents and agreement.',
    pitfalls: 'Wrong register; answering in English where Spanish required; ignoring word limits; listening practice only with transcripts (hides weakness).',
    faqs: [
      { q: 'HL vs SL writing length?', a: 'HL tasks are longer and expect wider range — use SL-specific markschemes when self-assessing.' },
      { q: 'How to improve listening?', a: 'Past Paper 2 audio under timed conditions, no repeats unless the paper allows.' },
      { q: 'Themes to prioritise?', a: 'Identity, experiences, human ingenuity, social organisation, sharing the planet — all five appear cyclically.' },
    ],
  },
  {
    slug: 'ib-french-b-sl-past-papers-guide',
    title: 'IB French B SL past papers & revision guide',
    description: 'IB French B SL: Paper 1 writing tasks, Paper 2 receptive skills, theme vocabulary, and criterion-based revision.',
    keywords: ['IB French B SL', 'IB French B SL past papers', 'IB French B mark scheme', 'IB French SL revision', 'IB French B rubric'],
    name: 'French B', level: 'SL', catalogSlug: 'french-b-sl', courseSlug: 'french-b-sl',
    assessment: '**Paper 1** tests productive writing across text types and themes. **Paper 2** assesses reading and listening comprehension with French responses.',
    markbands: 'Rubrics reward **communication first**, then range and accuracy. A clear, well-organised response with modest errors beats ambitious grammar that obscures meaning.',
    strategy: 'Build phrase banks per theme (environment, technology, health). Weekly timed writes marked against official criteria, not just teacher gut feel.',
    paperTips: 'Use connectors (cependant, en revanche, par conséquent). For listening, jot infinitives quickly then conjugate in answers if time allows.',
    pitfalls: 'English false friends; neglecting listening; one tense only; not addressing all prompt bullets.',
    faqs: [
      { q: 'Dictionary in exams?', a: 'Not in Papers 1–2 — vocabulary must be pre-learned. Use reading time to plan synonyms.' },
      { q: 'Oral IO preparation?', a: 'Photo description practice reinforces theme vocabulary used in Paper 1.' },
      { q: 'Past papers enough?', a: 'Pair with [French B SL course](/ib/courses/french-b-sl) lessons and [criterion practice](/mark?subject=ib-french-b-sl).' },
    ],
  },
  // ── CS SL & ESS ───────────────────────────────────────────────────────────
  {
    slug: 'ib-computer-science-sl-past-papers-guide',
    title: 'IB Computer Science SL past papers & revision guide',
    description: 'IB Computer Science SL: Paper 1 theory, Paper 2 case study, markbands, pseudocode, and past paper workflow.',
    keywords: ['IB Computer Science SL', 'IB CS SL past papers', 'IB Computer Science mark scheme', 'IB CS SL revision', 'IB Computer Science markbands'],
    name: 'Computer Science', level: 'SL', catalogSlug: 'computer-science-sl', courseSlug: 'computer-science-sl',
    assessment: '**Paper 1** covers systems fundamentals, networks, databases, and computational thinking with short and extended responses. **Paper 2** is the **case study** paper — apply syllabus concepts to a pre-released scenario. No Paper 3 at SL.',
    markbands: 'Extended answers need precise **technical vocabulary** and structured reasoning. Pseudocode must be unambiguous — examiners mark logic, not language syntax trivia.',
    strategy: 'Master Paper 1 topic checklists; for Paper 2, annotate the case study on release day and map every paragraph to syllabus dot points.',
    paperTips: 'Trace tables for algorithm questions. For networks, draw topology diagrams. Case study: justify recommendations with trade-offs (cost, security, UX).',
    pitfalls: 'Vague answers ("faster computer"); skipping justification; ignoring the case study details; no Paper 2 practice until exam month.',
    faqs: [
      { q: 'HL options at SL?', a: 'Paper 3 options are HL only — SL focuses on core + case study depth.' },
      { q: 'Language for pseudocode?', a: 'Follow the guide conventions your teacher uses — consistency and clarity matter.' },
      { q: 'IA overlap?', a: 'Solution IA reinforces OOP and documentation skills useful in Paper 1 extended responses.' },
    ],
  },
  {
    slug: 'ib-environmental-systems-and-societies-past-papers-guide',
    title: 'IB Environmental Systems & Societies (ESS) past papers guide',
    description: 'IB ESS SL: Paper 1 case study, Paper 2 essays, systems thinking, markbands, and revision — the transdisciplinary Group 3/4 course.',
    keywords: ['IB ESS', 'IB Environmental Systems and Societies', 'IB ESS past papers', 'IB ESS mark scheme', 'IB ESS revision'],
    name: 'Environmental Systems and Societies', level: 'SL', catalogSlug: 'environmental-systems-and-societies-sl', courseSlug: 'environmental-systems-and-societies-sl',
    assessment: 'ESS is **SL only**. **Paper 1** uses a resource booklet (case study) with structured questions. **Paper 2** has longer essays on syllabus themes linking environment and society. Fieldwork feeds the **IA**.',
    markbands: 'Answers should show **systems thinking** — stakeholders, flows, feedback, scale, and sustainability trade-offs — with named examples.',
    strategy: 'Build case study banks (pollution, conservation, energy). Practise essay plans that always include human + environmental lens and an evaluated solution.',
    paperTips: 'Paper 1: cite data from the booklet. Paper 2: define key terms (carrying capacity, ecological footprint) precisely before developing.',
    pitfalls: 'Biology-only answers without social dimension; no specific example; ignoring sustainability pillars; weak IA fieldwork design.',
    faqs: [
      { q: 'ESS vs Biology SL?', a: 'ESS is interdisciplinary — less depth in pure bio, more on systems, policy, and ethics. Check university acceptance for your path.' },
      { q: 'Group 3 or 4?', a: 'Counts as one subject in either group depending on your diploma structure — confirm with your coordinator.' },
      { q: 'Where are ESS papers?', a: 'See [IB ESS past papers](/ib/past-papers/environmental-systems-and-societies-sl) on MarkScheme.' },
    ],
  },
  // ── Group 6 ───────────────────────────────────────────────────────────────
  {
    slug: 'ib-visual-arts-sl-past-papers-guide',
    title: 'IB Visual Arts SL portfolio & assessment guide',
    description: 'IB Visual Arts SL: comparative study, process portfolio, exhibition criteria, and how to hit top markbands.',
    keywords: ['IB Visual Arts SL', 'IB Visual Arts SL portfolio', 'IB Visual Arts comparative study', 'IB Visual Arts exhibition', 'IB Visual Arts markbands'],
    name: 'Visual Arts', level: 'SL', catalogSlug: 'visual-arts-sl', courseSlug: 'visual-arts-sl',
    assessment: 'SL uses the same three components as HL with adjusted expectations: **Comparative study** (visual and written analysis), **Process portfolio** (experimentation), and **Exhibition** (resolved works + curatorial rationale).',
    markbands: 'Criteria reward **formal analysis**, cultural context, and coherent curatorial intent — not only technical skill.',
    strategy: 'Weekly process documentation with photos and annotations. Comparative study: pair artworks with genuine formal contrast. Exhibition: write rationale before final selection.',
    paperTips: 'Use art vocabulary (composition, materiality, focal point). Compare artists by technique and meaning, not biography timelines.',
    pitfalls: 'Description without analysis; process portfolio as finals-only gallery; exhibition pieces unrelated to stated theme.',
    faqs: [
      { q: 'SL vs HL workload?', a: 'HL expects greater breadth and depth in investigation — SL still needs consistent process evidence.' },
      { q: 'Digital media allowed?', a: 'Yes if your programme supports it — check guide limits on dimensions and submission format.' },
      { q: 'Free lessons?', a: 'Use our [Visual Arts SL course](/ib/courses/visual-arts-sl) for comparative study and formal analysis skills.' },
    ],
  },
  {
    slug: 'ib-theatre-hl-past-papers-guide',
    title: 'IB Theatre HL assessment & portfolio guide',
    description: 'IB Theatre HL: solo theatre piece, director\'s notebook, research presentation, collaborative project — criteria and revision workflow.',
    keywords: ['IB Theatre HL', 'IB Theatre portfolio', 'IB Theatre director notebook', 'IB Theatre solo piece', 'IB Theatre markbands'],
    name: 'Theatre', level: 'HL', catalogSlug: 'theatre-hl', courseSlug: 'theatre-hl',
    assessment: 'HL components: **Solo theatre piece**, **Director\'s notebook**, **Research presentation**, and **Collaborative project** (SL omits the latter\'s HL weighting). All are criterion-assessed performance and written work.',
    markbands: 'Examiners look for **artistic intention**, applied theatre theory, reflection, and collaboration evidence — not just performance polish.',
    strategy: 'Document decisions in the notebook as you rehearse — never retrofit. Research presentation: tie practitioners to your own practice with specific examples.',
    paperTips: 'Solo piece: justify staging choices. Collaborative: log contributions and conflicts resolved. Use theatre vocabulary (gestus, proxemics, subtext).',
    pitfalls: 'Notebook as diary without analysis; research presentation as biography; solo piece without clear through-line; ignoring criteria until submission week.',
    faqs: [
      { q: 'Traditional past papers?', a: 'Theatre has no written exam papers — practise through mock performances and criterion self-assessment.' },
      { q: 'SL vs HL?', a: 'HL adds depth in research and collaborative expectations — check component weightings in the current guide.' },
      { q: 'Course support?', a: 'See [Theatre HL lessons](/ib/courses/theatre-hl) for notebook and performance skills.' },
    ],
  },
  {
    slug: 'ib-music-hl-past-papers-guide',
    title: 'IB Music HL assessment & portfolio guide',
    description: 'IB Music HL: exploring music, experimenting, presenting — inquiry, analysis, and performance criteria for a 6 or 7.',
    keywords: ['IB Music HL', 'IB Music portfolio', 'IB Music IA', 'IB Music HL revision', 'IB Music markbands'],
    name: 'Music', level: 'HL', catalogSlug: 'music-hl', courseSlug: 'music-hl',
    assessment: 'Components: **Exploring music** (listening/analysis), **Experimenting** (creating), and **Presenting** (performance). HL includes deeper inquiry and wider stylistic range than SL.',
    markbands: 'Top bands connect **musical features** (melody, harmony, texture, form) to context and your own creative choices.',
    strategy: 'Maintain a listening log with score annotations. Experimentation: document iterations. Performance: programme notes linking pieces to inquiry question.',
    paperTips: 'Use precise terminology (modulation, ostinato, polymeter). When analysing, always link feature → effect → composer intent.',
    pitfalls: 'Generic adjectives ("emotional"); no score references; experimentation without reflection; performance without programme rationale.',
    faqs: [
      { q: 'Music theory exams?', a: 'No separate theory paper — analysis is embedded in portfolio components.' },
      { q: 'Can I use DAW production?', a: 'Yes for creating — document process and musical decisions in experimenting.' },
      { q: 'Lessons on MarkScheme?', a: 'Browse [Music HL course](/ib/courses/music-hl) for inquiry and analysis frameworks.' },
    ],
  },
  {
    slug: 'ib-film-hl-past-papers-guide',
    title: 'IB Film HL assessment & portfolio guide',
    description: 'IB Film HL: textual analysis, comparative study, portfolio, and collaborative project — film language, criteria, and workflow.',
    keywords: ['IB Film HL', 'IB Film portfolio', 'IB Film textual analysis', 'IB Film comparative study', 'IB Film markbands'],
    name: 'Film', level: 'HL', catalogSlug: 'film-hl', courseSlug: 'film-hl',
    assessment: 'HL: **Textual analysis** of a film extract, **Comparative study** of films, **Film portfolio** (creative work), and **Collaborative film project**. SL shares core components with adjusted scope.',
    markbands: 'Analysis must use **film language** — mise-en-scène, cinematography, editing, sound — tied to meaning and spectator response.',
    strategy: 'Shot-by-shot logs for textual analysis. Comparative study: theme + formal technique across cultures. Portfolio: pre-production evidence counts heavily.',
    paperTips: 'Timestamp shots when analysing. Link auteur theory to evidence, not trivia. Collaborative: document roles and creative problem-solving.',
    pitfalls: 'Plot summary; ignoring sound design; comparative study as two separate reviews; weak reflection on creative choices.',
    faqs: [
      { q: 'Written exams?', a: 'Assessment is portfolio-based — practise through timed analysis writes and mock commentaries.' },
      { q: 'Equipment requirements?', a: 'School provides basics — storyboard and edit decision lists show skill even with modest gear.' },
      { q: 'Course link?', a: '[Film HL lessons](/ib/courses/film-hl) cover textual analysis and film theory.' },
    ],
  },
  {
    slug: 'ib-dance-hl-past-papers-guide',
    title: 'IB Dance HL assessment & portfolio guide',
    description: 'IB Dance HL: composition, dance investigation, performance — choreography, analysis, and criterion-based preparation.',
    keywords: ['IB Dance HL', 'IB Dance portfolio', 'IB Dance composition', 'IB Dance investigation', 'IB Dance markbands'],
    name: 'Dance', level: 'HL', catalogSlug: 'dance-hl', courseSlug: 'dance-hl',
    assessment: '**Composition** (choreography), **Dance investigation** (written analysis of dance from another culture), and **Performance** (solo and group). HL demands greater complexity and research depth.',
    markbands: 'Choreography is marked on structure, use of space/time/energy, and intent. Investigation needs cultural context and **embodied analysis**, not Wikipedia summaries.',
    strategy: 'Film rehearsals for composition reflection. Investigation: pair with a practitioner or cultural source. Performance: train stamina and clarity of intent.',
    paperTips: 'Use dance vocabulary (canon, motif, locomotion). Investigation: analyse movement examples with screenshots or stills. Composition: show development of motifs.',
    pitfalls: 'Investigation without movement analysis; composition with no structure; performance without connection to choreographic intent.',
    faqs: [
      { q: 'Past papers for Dance?', a: 'No traditional papers — use assessment criteria as your rubric for mocks.' },
      { q: 'SL vs HL choreography?', a: 'HL expects more complex group work and longer investigation — check current guide word/time limits.' },
      { q: 'Resources?', a: '[Dance HL course](/ib/courses/dance-hl) on MarkScheme covers investigation and composition skills.' },
    ],
  },
  // ── Core ──────────────────────────────────────────────────────────────────
  {
    slug: 'ib-extended-essay-complete-guide',
    title: 'IB Extended Essay complete guide — criteria, structure & grade 7 tips',
    description: 'Everything you need for the IB Extended Essay: research question, 4,000-word structure, criteria A–E, RPPF reflections, and common mistakes.',
    keywords: ['IB Extended Essay', 'IB EE guide', 'Extended Essay criteria', 'IB EE structure', 'how to write Extended Essay', 'IB EE grade 7'],
    name: 'Extended Essay', level: '', catalogSlug: 'extended-essay', courseSlug: 'extended-essay',
    assessment: 'The EE is a **4,000-word research essay** in one of 34+ subjects, externally marked on five criteria: focus/method (A), knowledge (B), critical thinking (C), presentation (D), and engagement (RPPF). Together with TOK, it can add up to **3 bonus diploma points**.',
    markbands: 'Each criterion uses bands. A 7 in the EE requires a narrow **research question**, systematic methodology, sustained argument, proper academic citation, and authentic reflection in the RPPF.',
    strategy: 'Month 1: question + sources. Month 2: outline + draft body. Month 3: revise for argument and citation. Final weeks: presentation polish + RPPF. Meet your supervisor deadlines.',
    paperTips: 'Research question must be arguable, not descriptive. Use primary sources where possible. Every paragraph should advance the argument — cut tangents ruthlessly.',
    pitfalls: 'Too broad a question; last-minute RPPF; poor citation (academic honesty); descriptive essays without evaluation; ignoring word limit buffers.',
    faqs: [
      { q: 'How many sources?', a: 'Quality over quantity — typically 15–25 academic sources for humanities; fewer for tightly experimental sciences.' },
      { q: 'Does EE topic match HL subject?', a: 'Recommended but not required — you need a qualified supervisor in that subject.' },
      { q: 'Free course?', a: 'Work through our [Extended Essay course](/ib/courses/extended-essay) with criterion-linked lessons.' },
    ],
    intro: 'The Extended Essay is your chance to prove you can research like an undergraduate — and it can add up to three bonus points with TOK. This guide covers criteria, structure, and the habits that separate a C from an A.',
  },
  {
    slug: 'ib-cas-complete-guide',
    title: 'IB CAS complete guide — learning outcomes, portfolio & reflections',
    description: 'IB Creativity Activity Service explained: seven learning outcomes, CAS project, portfolio evidence, interviews, and passing CAS without stress.',
    keywords: ['IB CAS', 'IB CAS guide', 'CAS learning outcomes', 'IB CAS project', 'CAS reflections', 'IB CAS portfolio'],
    name: 'Creativity, Activity, Service', level: '', catalogSlug: 'cas', courseSlug: 'cas',
    assessment: 'CAS is **not graded with a 1–7** but is a diploma requirement. You must demonstrate the **seven learning outcomes** over 18 months, complete a **CAS project** (minimum one month), maintain a portfolio, and pass supervisor interviews.',
    markbands: 'There are no markbands — supervisors confirm **completion** with evidence of planning, reflection, and growth. Vague logs fail; specific reflections pass.',
    strategy: 'Plan CAS around activities you already enjoy — sustainability club, sport, music, tutoring. Log **during** the activity, not months later. Link each experience to at least one learning outcome explicitly.',
    paperTips: 'Use the CAS stages: investigation → preparation → action → reflection. Quantify impact where possible (hours, funds raised, people reached).',
    pitfalls: 'Tick-box volunteering; identical reflections; CAS project without collaboration; leaving everything to Year 2.',
    faqs: [
      { q: 'How many hours?', a: 'The guide removed fixed hour counts — focus on outcomes and balance across C, A, and S.' },
      { q: 'Can I fail CAS?', a: 'Yes — insufficient evidence or non-completion can block the diploma. Take supervisor feedback seriously.' },
      { q: 'CAS lessons?', a: 'See our [CAS course](/ib/courses/cas) for outcome-by-outcome guidance.' },
    ],
    intro: 'CAS is the diploma requirement students underestimate — until a supervisor flags weak reflections. Here is how to document Creativity, Activity, and Service properly and pass with evidence that actually shows growth.',
  },
  // ── Cross-cutting keyword pillars ─────────────────────────────────────────
  {
    slug: 'ib-internal-assessment-complete-guide',
    title: 'IB Internal Assessment (IA) complete guide — every subject, criteria & tips',
    description: 'Master the IB IA across sciences, humanities, maths, and arts: word counts, criteria, supervisor role, and how to score top bands.',
    keywords: ['IB Internal Assessment', 'IB IA guide', 'IB IA criteria', 'IB IA word count', 'how to write IB IA', 'IB IA grade 7'],
    name: 'Internal Assessment', level: '', catalogSlug: '', courseSlug: '',
    assessment: 'Most IB subjects include an **IA** — coursework marked internally and moderated externally. Sciences use individual investigations; humanities use essays or fieldwork; maths uses exploration; arts use portfolio components. Weighting is typically **20–25%** of the subject grade.',
    markbands: 'Each subject publishes **criteria** (often A–D or similar) with band descriptors. Examiners reward clear research questions, appropriate methodology, critical analysis, and presentation — not padding or fancy formatting.',
    strategy: 'Choose a **narrow question** early. Draft criteria checklist before you start. Submit supervisor drafts on schedule. Keep a research log — it makes the write-up faster and more honest.',
    paperTips: 'Sciences: personal engagement and uncertainty analysis matter. Economics/BM: structure like a mini-dissertation with diagrams. English: global issue must drive the oral/written link.',
    pitfalls: 'AI-generated plagiarism; supervisor draft ignored; exceeding word limits; weak ethical consideration; copying online IA structures verbatim.',
    faqs: [
      { q: 'IA word limits?', a: 'Varies by subject (e.g. 2,200 History, 4,000 EE is separate). Check the current guide for your subject.' },
      { q: 'Can the same topic as EE?', a: 'Generally no — overlap is restricted. Discuss with your coordinator.' },
      { q: 'Practice marking?', a: 'Upload IA sections to [/mark](/mark) where your subject is supported for criterion feedback.' },
    ],
    intro: 'The Internal Assessment can cushion a bad exam day — or drag a strong student down. This cross-subject guide explains what every IA shares, where they differ, and how to hit top criteria bands.',
  },
  {
    slug: 'ib-command-terms-explained',
    title: 'IB command terms explained — what examiners expect on every question',
    description: 'Full guide to IB command terms: analyse, evaluate, discuss, explain, compare — and how to answer each for full markband credit.',
    keywords: ['IB command terms', 'IB explain vs evaluate', 'IB discuss command term', 'IB exam technique', 'IB assessment objectives'],
    name: 'Command terms', level: '', catalogSlug: '', courseSlug: '',
    assessment: 'IB questions use **prescribed command terms** that tell you the cognitive skill required — from "state" (minimal) to "evaluate" (judgement with evidence). Misreading the command term is one of the fastest ways to lose a full markband level.',
    markbands: 'Higher-order terms (`analyse`, `evaluate`, `discuss`) require structure: claim → evidence → link → (for evaluate) judgement. Lower-order terms (`define`, `outline`) need precision and brevity.',
    strategy: 'Build a one-page command term cheat sheet. When practising past papers, **highlight the command term** before planning. Self-mark: "Did I actually evaluate, or only describe?"',
    paperTips: '**Compare** = similarities and differences with explicit linking. **Contrast** = differences only. **To what extent** = thesis with counterargument. **Discuss** = balanced exploration, not one-sided rant.',
    pitfalls: 'Writing everything you know; ignoring "with reference to"; treating discuss as evaluate; no conclusion on evaluate questions.',
    faqs: [
      { q: 'Where is the official list?', a: 'In the IB subject guides — terms are consistent across many subjects but check subject-specific glossaries.' },
      { q: 'Command terms in IAs?', a: 'Yes — research questions and reflections use the same skills. Practise in coursework too.' },
      { q: 'Cambridge vs IB terms?', a: 'Similar words, different mark schemes — if you sit both boards, keep separate technique notes.' },
    ],
    intro: 'Misreading a command term costs full markband levels — even when your knowledge is solid. Here is what IB examiners expect for every major command term, with examples you can apply in sciences, humanities, and languages.',
  },
  {
    slug: 'ib-maths-aa-vs-ai-which-to-choose',
    title: 'IB Maths AA vs AI — which course should you choose?',
    description: 'Analysis & Approaches vs Applications & Interpretation at HL and SL: difficulty, university requirements, GDC use, and student profiles.',
    keywords: ['IB Maths AA vs AI', 'IB Analysis and Approaches', 'IB Applications and Interpretation', 'which IB maths', 'IB maths HL choice'],
    name: 'Mathematics', level: '', catalogSlug: '', courseSlug: '',
    assessment: '**Maths AA** emphasises algebra, calculus, proof, and theoretical understanding — Paper 1 is non-calculator at HL/SL. **Maths AI** emphasises modelling, statistics, and technology — both papers use GDC extensively; HL adds Paper 3 problem-solving.',
    markbands: 'AA rewards algebraic elegance and rigorous communication; AI rewards contextual interpretation and valid modelling assumptions.',
    strategy: 'Choose AA if you enjoy calculus proofs and plan STEM with heavy maths. Choose AI if you thrive on data, finance models, and real-world contexts — or your degree only requires "maths" broadly.',
    paperTips: 'Check **university pages** early — engineering often prefers AA HL; some economics courses accept AI HL. Do not choose based on rumours alone.',
    pitfalls: 'Picking AI to avoid calculus then hitting degree requirements for AA; switching courses too late; ignoring IA differences.',
    faqs: [
      { q: 'Which is harder?', a: 'Neither is universally harder — AA stresses abstract maths; AI stresses interpretation under time pressure.' },
      { q: 'Can I switch mid-course?', a: 'School-dependent — switching after Year 1 is often disruptive. Decide in consultation with your teacher.' },
      { q: 'Past papers for both?', a: '[Maths AA](/ib/past-papers/maths-aa-hl) and [Maths AI](/ib/past-papers/maths-ai-hl) archives on MarkScheme — try one paper of each before committing.' },
    ],
    intro: 'Choosing between IB Maths Analysis & Approaches and Applications & Interpretation shapes your whole diploma — and university options. Here is an honest comparison of skills, papers, and who each course suits.',
  },
  {
    slug: 'ib-predicted-grades-explained',
    title: 'IB predicted grades explained — how they work & how to improve yours',
    description: 'What IB predicted grades are, who submits them, how universities use them, and how to earn predictions that match your potential.',
    keywords: ['IB predicted grades', 'IB predicted score', 'IB university application', 'IB predicted 45', 'IB UCAS predicted'],
    name: 'Predicted grades', level: '', catalogSlug: '', courseSlug: '',
    assessment: '**Predicted grades** are teacher estimates of your final 1–7 per subject, submitted to universities (UCAS, Common App, etc.) before exams. They are **not** set by the IBO and are not official results.',
    markbands: 'Teachers base predictions on mock exams, IA progress, coursework, and trajectory. Consistent performance across mocks matters more than one brilliant week.',
    strategy: 'Treat mocks as prediction drivers — full timed papers, honest marking. Ask teachers what evidence they use. Improve IA drafts early; they signal final ability.',
    paperTips: 'Document improvement: if mocks rise, share the trend. If one subject lags, show an action plan (past paper schedule, tutoring, criterion practice).',
    pitfalls: 'Assuming predictions are negotiable without evidence; ignoring IA; surprise weak mocks in final term; universities seeing inflated predictions that finals do not match.',
    faqs: [
      { q: 'Can predictions change?', a: 'Schools may update before results — policies vary. Never assume a verbal promise equals the submitted figure.' },
      { q: 'Do universities trust predictions?', a: 'They know the system — offers align with predictions, finals must meet conditions. Inflated predictions hurt if you miss offers.' },
      { q: 'TOK/EE predictions?', a: 'Bonus points are often estimated separately — strong EE drafts help the overall profile.' },
    ],
    intro: 'Predicted grades shape your university offers — but many students only discover how they work after mocks. Here is what teachers submit, what admissions officers read, and how to earn predictions that reflect your real level.',
  },
  {
    slug: 'ib-how-to-get-a-7-diploma',
    title: 'How to get a 7 in IB (every subject) — markbands, habits & revision science',
    description: 'Practical system for IB grade 7s: markband thinking, spaced repetition, past paper cycles, IA strategy, and avoiding the mistakes that cap you at a 5.',
    keywords: ['how to get a 7 in IB', 'IB grade 7 tips', 'IB revision strategy', 'IB top marks', 'IB study tips', 'IB markbands'],
    name: 'Diploma Programme', level: '', catalogSlug: '', courseSlug: '',
    assessment: 'A **7** is the top subject grade — typically ~80%+ scaled marks, varying by session boundaries. It requires strong IAs plus exam performance that consistently hits **top markbands**, not occasional brilliance.',
    markbands: 'Read band descriptors until you can predict which level your answer fits. Top bands share: precise subject language, structured argument, evaluation, and direct engagement with the question.',
    strategy: 'Weekly cycle: learn → retrieve (flashcards) → apply (past questions) → mark → fix. Protect sleep — cramming destroys Paper 2 stamina. Start IA early; it is free marks on the table.',
    paperTips: 'Build a "mistake log" across subjects. One hour drilling your top three recurring errors beats three hours of passive rereading.',
    pitfalls: 'Passive highlighting; ignoring teacher feedback on drafts; revising only favourite topics; no timed practice until April.',
    faqs: [
      { q: 'How many hours per week?', a: 'No magic number — quality and consistency beat totals. Track tasks completed, not hours logged.' },
      { q: 'Is a 45 realistic?', a: 'Rare — 7s in six subjects plus full TOK/EE bonus requires sustained excellence. Aim high but plan sensibly.' },
      { q: 'Where to start?', a: 'Read [IB markbands explained](/blog/ib-markbands-explained), then your subject [past paper guide](/guides/ib), then [free courses](/ib/courses).' },
    ],
    intro: 'A 7 is not luck — it is repeated top-band answers under time pressure, plus an IA that was started early. Here is the cross-subject system students use to move from 5s to 7s without burning out.',
  },
]

/** @typedef {{ slug: string; title: string; description: string; keywords: string[]; subject: string; catalogSlug: string; courseSlug: string; weight: string; criteria: string; structure: string; strategy: string; pitfalls: string; faqs: { q: string; a: string }[] }} IaBrief */

/** @type {IaBrief[]} */
const IA_POSTS = [
  {
    slug: 'ib-biology-ia-guide',
    title: 'IB Biology IA guide — individual investigation criteria & grade 7 tips',
    description: 'How to write a top-band IB Biology Internal Assessment: research question, methodology, analysis, evaluation, and the five IA criteria explained.',
    keywords: ['IB Biology IA', 'IB Biology Internal Assessment', 'Biology IA criteria', 'IB Biology IA example', 'Biology IA grade 7'],
    subject: 'Biology', catalogSlug: 'biology-hl', courseSlug: 'biology-hl', weight: '20% of your final Biology grade',
    criteria: 'Five criteria: **Personal engagement**, **Exploration**, **Analysis**, **Evaluation**, and **Communication**. Moderators check that your investigation is yours — authentic question, appropriate method, processed data, and honest limitations.',
    structure: 'Typical layout: title, research question, introduction, hypothesis, variables, methodology, safety/ethics, raw data, processed tables/graphs, statistical test, conclusion, evaluation (strengths + limitations + extensions). Keep within the **6–12 page** guide limit excluding appendices.',
    strategy: 'Pick a **narrow, measurable** question you can answer with school lab equipment. Pilot the method once. Photograph setup for engagement. Use a statistical test only when justified (e.g. t-test for two means).',
    pitfalls: 'Cookie-cutter topics without personal angle; no uncertainty; correlation presented as causation; copying online IA structures; weak evaluation that only says "more time".',
    faqs: [
      { q: 'HL vs SL Biology IA?', a: 'Same criteria and weighting — depth and complexity should match your level, not a different rubric.' },
      { q: 'Can I use AI to write it?', a: 'No — academic honesty applies. AI-drafted text risks malpractice findings.' },
      { q: 'Past papers help?', a: 'IA skills differ from exams — but [Biology past papers](/ib/past-papers/biology-hl) plus [lessons](/ib/courses/biology-hl) reinforce data-handling for Paper 2.' },
    ],
  },
  {
    slug: 'ib-chemistry-ia-guide',
    title: 'IB Chemistry IA guide — investigation criteria, structure & examples',
    description: 'IB Chemistry Internal Assessment guide: research question, titration/calorimetry/kinetics IA structure, criteria A–D, and moderator expectations.',
    keywords: ['IB Chemistry IA', 'IB Chemistry Internal Assessment', 'Chemistry IA criteria', 'IB Chemistry IA topics', 'Chemistry IA grade 7'],
    subject: 'Chemistry', catalogSlug: 'chemistry-hl', courseSlug: 'chemistry-hl', weight: '20% of your final Chemistry grade',
    criteria: 'Marked on **Personal engagement**, **Exploration**, **Analysis**, **Evaluation**, and **Communication** — same science IA framework as Biology and Physics.',
    structure: 'Clear research question → background (linked to syllabus) → method with controlled variables → qualitative/quantitative data → calculations with units and sig figs → graph with trend line → conclusion tied to question → evaluation referencing uncertainty.',
    strategy: 'Choose a reaction or property you can repeat 5+ times. Record **uncertainty** in apparatus. Show one full sample calculation then a table for the rest.',
    pitfalls: 'Uncontrolled temperature; wrong SF rules; missing safety; procedure copied from a website without adaptation; evaluation that ignores systematic error.',
    faqs: [
      { q: 'Good IA topics?', a: 'Enthalpy, rates, equilibrium shifts, acid-base titrations — if variables are measurable and syllabus-linked.' },
      { q: 'Database IA?', a: 'Some schools allow database investigations — confirm with your teacher; methodology criteria still apply.' },
      { q: 'More help?', a: '[Chemistry HL course](/ib/courses/chemistry-hl) and [past papers](/ib/past-papers/chemistry-hl).' },
    ],
  },
  {
    slug: 'ib-physics-ia-guide',
    title: 'IB Physics IA guide — investigation, uncertainty & criteria explained',
    description: 'Write a strong IB Physics Internal Assessment: research design, uncertainty propagation, linearisation, and hitting top criteria bands.',
    keywords: ['IB Physics IA', 'IB Physics Internal Assessment', 'Physics IA criteria', 'Physics IA uncertainty', 'IB Physics IA grade 7'],
    subject: 'Physics', catalogSlug: 'physics-hl', courseSlug: 'physics-hl', weight: '20% of your final Physics grade',
    criteria: 'Science IA criteria reward a **focused physics question**, controlled experiment, correct processing (including graphs and uncertainties), and critical evaluation of method and data quality.',
    structure: 'Research question with measurable independent/dependent variables → theory from syllabus → method diagram → raw data table → processed graph (with error bars where appropriate) → conclusion → evaluation.',
    strategy: 'Linearise relationships (e.g. log graphs) when the syllabus expects it. Propagate uncertainty for derived quantities. Video or photo evidence boosts engagement marks.',
    pitfalls: 'Tiny range of data; no repeat readings; plotting without units; ignoring systematic errors; conclusion that does not reference uncertainty.',
    faqs: [
      { q: 'Simulation IA?', a: 'Policy varies — physical data collection is standard; check your coordinator.' },
      { q: 'HL depth?', a: 'HL students often use more sophisticated analysis — but criteria are the same.' },
      { q: 'Exam overlap?', a: 'IA data skills directly help Paper 2 DBQs — see [Physics past papers](/ib/past-papers/physics-hl).' },
    ],
  },
  {
    slug: 'ib-economics-ia-guide',
    title: 'IB Economics IA guide — commentary structure, rubric & 7s',
    description: 'IB Economics Internal Assessment: three commentaries, article choice, diagrams, evaluation, and the 14-criterion rubric explained.',
    keywords: ['IB Economics IA', 'IB Economics commentary', 'Economics IA rubric', 'IB Economics IA structure', 'Economics IA grade 7'],
    subject: 'Economics', catalogSlug: 'economics-hl', courseSlug: 'economics-hl', weight: '20% of your final Economics grade',
    criteria: 'Each commentary is marked on **micro/macro/global** syllabus link, **terminology**, **diagram(s)**, **analysis**, and **evaluation/judgement** — 14 criteria per commentary, three commentaries total across the course.',
    structure: 'Highlight article → define key term → draw and explain **labelled diagram** → analyse cause/effect using the article → evaluate with stakeholders and time horizons → word limit (~800 words each).',
    strategy: 'Bank articles weekly from reputable sources. One diagram minimum, fully explained. End with "overall, …" judgement, not a summary.',
    pitfalls: 'Article not syllabus-linked; diagram not explained; description without analysis; no evaluation; exceeding word count.',
    faqs: [
      { q: 'HL vs SL commentaries?', a: 'Same structure — HL may expect slightly deeper policy discussion; check current guide.' },
      { q: 'Can articles repeat topics?', a: 'You need variety across micro, macro, and the global economy where required.' },
      { q: 'Practice?', a: 'Draft one commentary per month; pair with [Economics past papers](/ib/past-papers/economics-hl).' },
    ],
  },
  {
    slug: 'ib-history-ia-guide',
    title: 'IB History IA guide — historical investigation (2,200 words) & criteria',
    description: 'IB History Internal Assessment: research question, sources, 2,200-word investigation structure, criteria A–D, and grade 7 advice.',
    keywords: ['IB History IA', 'IB Historical Investigation', 'History IA 2200 words', 'IB History IA criteria', 'History IA grade 7'],
    subject: 'History', catalogSlug: 'history-hl', courseSlug: 'history-hl', weight: '25% of your final History grade',
    criteria: 'Four criteria: **Identification and evaluation of sources**, **Investigation**, **Reflection**, and **Structure** (word limit 2,200). External moderation applies.',
    structure: 'Section A: plan + summary of evidence + evaluation of sources. Section B: investigation (argument with footnoted evidence). Section C: reflection on methods and challenges.',
    strategy: 'Choose a **narrow, debatable** question answerable with available primary/secondary sources. Footnote as you draft. Reflection must discuss historians\' methods, not just "I worked hard".',
    pitfalls: 'Narrative not argument; too broad a question; weak source evaluation; reflection generic; over word limit.',
    faqs: [
      { q: 'Overlap with EE?', a: 'Cannot duplicate — different scope and supervision rules.' },
      { q: 'Paper 1 skills?', a: 'OPVL practice in Paper 1 feeds IA source evaluation — see [History past papers](/ib/past-papers/history-hl).' },
      { q: 'SL vs HL?', a: 'Same IA requirements for History SL and HL.' },
    ],
  },
  {
    slug: 'ib-geography-ia-guide',
    title: 'IB Geography IA guide — fieldwork, written report & criteria',
    description: 'IB Geography Internal Assessment: fieldwork question, methodology, data presentation, analysis, evaluation, and criterion bands.',
    keywords: ['IB Geography IA', 'IB Geography fieldwork', 'Geography IA criteria', 'IB Geography IA structure', 'Geography IA grade 7'],
    subject: 'Geography', catalogSlug: 'geography-hl', courseSlug: 'geography-hl', weight: '20% of your final Geography grade',
    criteria: 'Criteria cover **fieldwork question and geographic context**, **planning**, **data collection**, **presentation/analysis**, and **evaluation** — linking to syllabus themes and geographic theory.',
    structure: 'Introduction and geographic context → methodology (sampling, ethics, risks) → data presentation (maps, graphs, photos) → analysis linked to theory → conclusion → evaluation of reliability and next steps.',
    strategy: 'Align fieldwork with a taught theme. Use **maps and GIS** where possible. Every graph needs interpretation, not just description.',
    pitfalls: 'No clear geographic theory; convenience sampling without acknowledgement; figures without titles/units; evaluation that ignores weather or sample size.',
    faqs: [
      { q: 'Can fieldwork be local?', a: 'Yes — urban or river studies near school are common if methodology is rigorous.' },
      { q: 'HL extra?', a: 'HL IA uses the same criteria — depth and geographic sophistication should reflect HL.' },
      { q: 'Revision link?', a: '[Geography past papers](/ib/past-papers/geography-hl) reinforce essay and skills questions.' },
    ],
  },
  {
    slug: 'ib-psychology-ia-guide',
    title: 'IB Psychology IA guide — simple experiment, report & rubric',
    description: 'IB Psychology Internal Assessment: simple experimental study, ethics, statistics, APA-style report, and criteria for top bands.',
    keywords: ['IB Psychology IA', 'IB Psychology experiment', 'Psychology IA criteria', 'IB Psychology IA structure', 'Psychology IA grade 7'],
    subject: 'Psychology', catalogSlug: 'psychology-hl', courseSlug: 'psychology-hl', weight: '20% of your final Psychology grade',
    criteria: 'Introduction (aim, theory), **exploration** (design, variables, controls), **analysis** (descriptive + inferential stats), **evaluation** (method limits, ethics, extensions).',
    structure: 'Standard experiment report: abstract, intro with study citation, method (design, participants, materials, procedure), results (graph + test), discussion (findings vs theory, limitations, ethics).',
    strategy: 'Replicate a classic study with a twist. Get **ethical approval** early. Report means, SD, and p-values correctly. Link back to the named theory in the introduction.',
    pitfalls: 'No informed consent; wrong statistical test; discussing results without linking to aim; copying procedure without citing original study.',
    faqs: [
      { q: 'HL qualitative IA?', a: 'HL has additional qualitative component in the syllabus — confirm current guide for your cohort.' },
      { q: 'Participants?', a: 'School convenience samples are fine if limitations are discussed.' },
      { q: 'Exam link?', a: 'Research methods in Paper 1/2 — practise with [Psychology past papers](/ib/past-papers/psychology-hl).' },
    ],
  },
  {
    slug: 'ib-business-management-ia-guide',
    title: 'IB Business Management IA guide — research project & criteria',
    description: 'IB Business Management Internal Assessment: research proposal, tools, primary research, and the HL/SL IA rubric explained.',
    keywords: ['IB Business Management IA', 'IB BM IA', 'Business IA criteria', 'IB Business IA research project', 'Business Management IA grade 7'],
    subject: 'Business Management', catalogSlug: 'business-management-hl', courseSlug: 'business-management-hl', weight: '25% of your final Business Management grade',
    criteria: 'Marked on **research proposal**, **application of tools**, **analysis and evaluation**, and **structure** — SL and HL differ in length and depth (HL expects more strategic analysis).',
    structure: 'Research question on a real business → methodology (primary/secondary sources) → apply toolkit (SWOT, Ansoff, etc.) → findings → conclusions and recommendations → bibliography.',
    strategy: 'Choose a business you can interview or survey. Every tool must be **applied**, not defined. Recommendations need feasibility and stakeholders.',
    pitfalls: 'Generic tools without data; no primary research; recommendations unsupported; ignoring ethical consent for surveys.',
    faqs: [
      { q: 'HL vs SL length?', a: 'HL IA is longer with deeper strategic analysis — check current word/page limits.' },
      { q: 'Real company names?', a: 'Often allowed with anonymity if needed — follow school ethics guidance.' },
      { q: 'Exam prep?', a: 'Toolkit fluency helps Paper 1/2 — see [Business past papers](/ib/past-papers/business-management-hl).' },
    ],
  },
  {
    slug: 'ib-maths-ia-guide',
    title: 'IB Maths IA guide — exploration (AA & AI), criteria & topic ideas',
    description: 'IB Mathematics Internal Assessment: exploration structure, criteria A–E, topic choice for AA and AI, and how to score top bands.',
    keywords: ['IB Maths IA', 'IB Math exploration', 'Maths IA criteria', 'IB Maths IA topics', 'Maths IA grade 7'],
    subject: 'Mathematics', catalogSlug: 'maths-aa-hl', courseSlug: 'maths-aa-hl', weight: '20% of your final Maths grade',
    criteria: 'Five criteria: **Communication**, **Mathematical presentation**, **Personal engagement**, **Reflection**, and **Use of mathematics**. Applies to both **AA and AI** explorations.',
    structure: 'Introduction (aim and curiosity) → mathematical development (definitions, algebra, graphs) → exploration (models, proofs, or data) → reflection (limitations, extensions) → bibliography. Typical length ~12–20 pages depending on guide.',
    strategy: 'Pick a topic with **enough maths at your level** — not too trivial, not postgraduate. AA: proofs, series, calculus models. AI: regression, optimisation, modelling real datasets.',
    pitfalls: 'Topic too shallow; maths copied from internet; no reflection; graphs without interpretation; exploration that is just a homework sheet.',
    faqs: [
      { q: 'AA vs AI exploration?', a: 'AA leans analytical; AI leans modelling — choose matching your course.' },
      { q: 'Topic ideas?', a: 'Gold ratios, projectile models, statistical surveys, graph theory — if syllabus maths is central.' },
      { q: 'Courses?', a: '[Maths AA](/ib/courses/maths-aa-hl) and [Maths AI](/ib/courses/maths-ai-hl) lessons support exploration skills.' },
    ],
  },
  {
    slug: 'ib-computer-science-ia-guide',
    title: 'IB Computer Science IA guide — solution, criteria & documentation',
    description: 'IB Computer Science Internal Assessment: client problem, design, development, testing, evaluation, and criterion-by-criterion advice.',
    keywords: ['IB Computer Science IA', 'IB CS IA', 'Computer Science IA criteria', 'IB CS solution', 'Computer Science IA grade 7'],
    subject: 'Computer Science', catalogSlug: 'computer-science-hl', courseSlug: 'computer-science-hl', weight: '25% of your final Computer Science grade',
    criteria: 'Criteria cover **planning**, **solution design**, **development**, **functionality** (video evidence), **testing**, and **evaluation** — product and documentation both matter.',
    structure: 'Record of tasks → design (UML, wireframes) → development log → testing plan with normal/boundary/abnormal data → video demo → evaluation against success criteria.',
    strategy: 'Scope a product finishable in time — calendar app, inventory, quiz. Use **OOP** at HL. Test every feature on video. Client feedback strengthens evaluation.',
    pitfalls: 'No test evidence; feature creep; code without comments; evaluation vague; academic honesty on borrowed code.',
    faqs: [
      { q: 'Language choice?', a: 'Java, Python, JS etc. — pick what your school supports and you can test thoroughly.' },
      { q: 'SL vs HL?', a: 'HL expects more complex techniques (e.g. OOP, advanced data structures).' },
      { q: 'Theory exams?', a: '[CS past papers](/ib/past-papers/computer-science-hl) for Papers 1–3 alongside IA build.' },
    ],
  },
  {
    slug: 'ib-english-ia-guide',
    title: 'IB English IA guide — Individual Oral, HL Essay & written tasks',
    description: 'IB English A Internal Assessment: Individual Oral structure, HL Essay, written tasks, criteria, and how Lang & Lit differs from Literature.',
    keywords: ['IB English IA', 'IB Individual Oral', 'IB HL Essay English', 'English IA criteria', 'IB English oral guide'],
    subject: 'English A', catalogSlug: 'english-a-lang-lit-hl', courseSlug: 'english-a-lang-lit-hl', weight: 'varies by component (Oral + written coursework)',
    criteria: '**Individual Oral** (SL & HL): global issue, two works (one literary), 10-minute extract analysis + discussion. **HL Essay** (HL only): 1,200–1,500 words on a literary work. Lang & Lit adds **written tasks** on non-literary topics.',
    structure: 'Oral: outline global issue → analyse extract (techniques + meaning) → connect to second work → questions. HL Essay: thesis on literary line/theme → sustained analysis with quotations.',
    strategy: 'Choose a **global issue** you care about — passion shows in delivery. Rehearse with timer. HL Essay: one work, one sharp thesis, no plot summary.',
    pitfalls: 'Global issue too vague; feature spotting in oral; HL Essay plot retell; written task wrong text type format (Lang & Lit).',
    faqs: [
      { q: 'Lang & Lit vs Literature?', a: 'Lang & Lit oral uses one non-literary + one literary work; Literature uses two literary works.' },
      { q: 'Recording?', a: 'Oral is recorded for moderation — practise with the same note policy you will use.' },
      { q: 'Courses?', a: '[Lang & Lit](/ib/courses/english-a-lang-lit-hl) and [Literature](/ib/courses/english-a-literature-hl) lessons cover Paper skills too.' },
    ],
  },
  {
    slug: 'ib-ess-ia-guide',
    title: 'IB ESS IA guide — fieldwork investigation & criteria',
    description: 'IB Environmental Systems and Societies Internal Assessment: research question, fieldwork, report structure, and criterion bands.',
    keywords: ['IB ESS IA', 'ESS Internal Assessment', 'IB ESS fieldwork', 'ESS IA criteria', 'ESS IA grade 7'],
    subject: 'Environmental Systems and Societies', catalogSlug: 'environmental-systems-and-societies-sl', courseSlug: 'environmental-systems-and-societies-sl', weight: '25% of your final ESS grade',
    criteria: 'Similar to Geography IA: **context**, **planning**, **results**, **analysis/evaluation** with explicit **systems** and **sustainability** framing.',
    structure: 'Research question linking environment and society → methodology → data → analysis with syllibus concepts (stakeholders, feedback loops) → conclusion → evaluation.',
    strategy: 'Pick a local issue (water quality, waste, energy use). Show both **environmental and social** dimensions in every section.',
    pitfalls: 'Pure science report without society angle; no ethical consideration; weak link to syllabus terms; no secondary sources.',
    faqs: [
      { q: 'ESS vs Geography IA?', a: 'ESS must emphasise systems and sustainability trade-offs — not just spatial patterns.' },
      { q: 'Group 3 or 4?', a: 'ESS sits in both — IA still follows ESS guide criteria.' },
      { q: 'Papers?', a: '[ESS past papers](/ib/past-papers/environmental-systems-and-societies-sl) for exam technique.' },
    ],
  },
]

/** Group 6 SL portfolio guides */
const GROUP6_SL = [
  {
    slug: 'ib-theatre-sl-past-papers-guide',
    title: 'IB Theatre SL assessment & portfolio guide',
    description: 'IB Theatre SL: solo piece, director\'s notebook, research presentation — criteria, rehearsal workflow, and top-band tips.',
    keywords: ['IB Theatre SL', 'IB Theatre SL portfolio', 'Theatre director notebook', 'IB Theatre SL criteria', 'IB Theatre assessment'],
    name: 'Theatre', level: 'SL', catalogSlug: 'theatre-sl', courseSlug: 'theatre-sl',
    assessment: '**Solo theatre piece**, **Director\'s notebook**, and **Research presentation** — criterion-assessed performance and written work (HL adds collaborative project weight).',
    markbands: 'Examiners reward clear **artistic intention**, applied theatre theory, and reflective documentation — not just performance polish.',
    strategy: 'Notebook entries during rehearsal, not after. Research presentation: link practitioner to your own staging choices with video stills.',
    paperTips: 'Use vocabulary: proxemics, subtext, staging concept. Solo piece: justify every blocking decision in the notebook.',
    pitfalls: 'Notebook as diary; research as biography; solo piece without through-line; ignoring criteria until submission.',
    faqs: [
      { q: 'HL vs SL?', a: 'HL includes collaborative project with higher weight — SL focuses on the three core components.' },
      { q: 'Past papers?', a: 'No written exam — mock performances against criteria.' },
      { q: 'Course?', a: '[Theatre SL lessons](/ib/courses/theatre-sl).' },
    ],
  },
  {
    slug: 'ib-music-sl-past-papers-guide',
    title: 'IB Music SL assessment & portfolio guide',
    description: 'IB Music SL: exploring, experimenting, presenting — inquiry, analysis, and performance criteria explained.',
    keywords: ['IB Music SL', 'IB Music SL portfolio', 'IB Music presenting', 'IB Music SL criteria', 'IB Music assessment'],
    name: 'Music', level: 'SL', catalogSlug: 'music-sl', courseSlug: 'music-sl',
    assessment: '**Exploring music** (listening/analysis), **Experimenting** (creating), and **Presenting** (performance) — portfolio-based, no traditional exam paper.',
    markbands: 'Top bands link **musical features** to context and your creative choices with score evidence.',
    strategy: 'Listening log with annotated scores. Experimentation: show drafts. Performance: programme notes connecting pieces to your inquiry.',
    paperTips: 'Name harmonic devices, form, texture. Avoid vague praise — be specific.',
    pitfalls: 'Generic adjectives; no score citations; thin experimentation log; performance without rationale.',
    faqs: [
      { q: 'DAW allowed?', a: 'Yes for creating — document decisions in experimenting.' },
      { q: 'HL difference?', a: 'HL expects wider stylistic range and deeper inquiry.' },
      { q: 'Lessons?', a: '[Music SL course](/ib/courses/music-sl).' },
    ],
  },
  {
    slug: 'ib-film-sl-past-papers-guide',
    title: 'IB Film SL assessment & portfolio guide',
    description: 'IB Film SL: textual analysis, comparative study, portfolio — film language, criteria, and workflow.',
    keywords: ['IB Film SL', 'IB Film SL portfolio', 'IB Film textual analysis', 'IB Film comparative study', 'IB Film criteria'],
    name: 'Film', level: 'SL', catalogSlug: 'film-sl', courseSlug: 'film-sl',
    assessment: '**Textual analysis**, **Comparative study**, and **Film portfolio** — HL adds collaborative film (SL has adjusted scope).',
    markbands: 'Analysis uses **film language** (mise-en-scène, cinematography, editing, sound) tied to meaning.',
    strategy: 'Shot logs with timestamps. Comparative study: one theme, two films, formal comparison.',
    paperTips: 'Never plot-summary only. Portfolio: pre-production evidence (storyboard, shot list) counts heavily.',
    pitfalls: 'Ignoring sound; two separate reviews instead of comparison; weak reflection on edits.',
    faqs: [
      { q: 'Equipment?', a: 'School gear is fine — planning docs prove skill.' },
      { q: 'HL collaborative?', a: 'HL-only component — SL portfolio scope is smaller.' },
      { q: 'Course?', a: '[Film SL](/ib/courses/film-sl).' },
    ],
  },
  {
    slug: 'ib-dance-sl-past-papers-guide',
    title: 'IB Dance SL assessment & portfolio guide',
    description: 'IB Dance SL: composition, investigation, performance — choreography and embodied analysis for top criteria.',
    keywords: ['IB Dance SL', 'IB Dance SL portfolio', 'IB Dance composition', 'IB Dance investigation', 'IB Dance criteria'],
    name: 'Dance', level: 'SL', catalogSlug: 'dance-sl', courseSlug: 'dance-sl',
    assessment: '**Composition**, **Dance investigation**, and **Performance** — same three components as HL with adjusted depth expectations.',
    markbands: 'Choreography needs structure and intent; investigation needs **movement analysis** from another culture.',
    strategy: 'Film rehearsals. Investigation: analyse video clips with dance terminology. Performance: connect to choreographic intent.',
    paperTips: 'Motif development, spatial patterns, energy qualities. Investigation: not Wikipedia — embodied description.',
    pitfalls: 'Investigation without movement examples; unstructured composition; performance disconnected from concept.',
    faqs: [
      { q: 'HL vs SL?', a: 'HL expects greater complexity in group composition and investigation depth.' },
      { q: 'Written exam?', a: 'None — criteria-based portfolio and performance.' },
      { q: 'Lessons?', a: '[Dance SL course](/ib/courses/dance-sl).' },
    ],
  },
]

POSTS.push(...GROUP6_SL)

/** HL revision guides — regenerated with free-course cross-links (SL sibling when available). */
const HL_POSTS = [
  {
    slug: 'ib-biology-hl-past-papers-guide',
    title: 'IB Biology HL past papers & revision guide',
    description: 'How to revise IB Biology HL with past papers: Papers 1–3, AHL content, markbands, DBQs, and a workflow to reach a 6 or 7.',
    keywords: ['IB Biology HL', 'IB Biology HL past papers', 'IB Biology mark scheme', 'IB Biology HL revision', 'IB Biology markbands'],
    name: 'Biology', level: 'HL', catalogSlug: 'biology-hl', courseSlug: 'biology-hl',
    assessment: '**Paper 1** is multiple choice across core and AHL. **Paper 2** mixes data-based questions with structured and extended responses. **Paper 3** covers practical skills and your option topic. The **IA** is an individual investigation.',
    markbands: 'Extended Paper 2 responses use **markbands** — top bands need synthesis, precise terminology, and evaluation, not fact lists.',
    strategy: 'Cycle timed papers → mark MCQs and band long answers → drill weak AHL topics before the next paper. Track command-term losses separately from content gaps.',
    paperTips: 'For DBQs, describe trends with quoted data first, then explain biology. Paper 3 option: learn standard diagrams for your option.',
    pitfalls: 'Ignoring AHL depth; rote recall without application; weak option revision; IA left until the final term.',
    faqs: [
      { q: 'HL vs SL papers?', a: 'HL adds AHL content and greater depth on Paper 2/3 — use HL papers for timing, not SL-only mocks.' },
      { q: 'How many past papers?', a: '6–8 fully marked HL papers with error logs beats rushing through twenty.' },
      { q: 'Free course?', a: 'Use our [Biology HL course](/ib/courses/biology-hl) for topic refresh between papers.' },
    ],
  },
  {
    slug: 'ib-chemistry-hl-past-papers-guide',
    title: 'IB Chemistry HL past papers & revision guide',
    description: 'IB Chemistry HL past paper strategy: Papers 1–3, AHL mechanisms, markbands, and how to push from a 5 to a 7.',
    keywords: ['IB Chemistry HL', 'IB Chemistry HL past papers', 'IB Chemistry mark scheme', 'IB Chemistry HL revision', 'IB Chemistry markbands'],
    name: 'Chemistry', level: 'HL', catalogSlug: 'chemistry-hl', courseSlug: 'chemistry-hl',
    assessment: '**Paper 1** MCQ. **Paper 2** structured and extended questions including AHL organic and physical chemistry. **Paper 3** data/option. **IA** individual investigation.',
    markbands: 'Long answers need balanced equations, state symbols, logical working, and **chemical reasoning** — not just a final number.',
    strategy: 'Classify errors after each paper: calculation, mechanism, terminology, time. Drill one weak AHL topic before the next full paper.',
    paperTips: 'Show working on every calculation. Organic mechanisms need unambiguous curly arrows.',
    pitfalls: 'Unbalanced equations; missing units; skipping AHL organic practice; Data Booklet navigation under pressure.',
    faqs: [
      { q: 'Data Booklet?', a: 'Practise every paper with the booklet open — know where each section lives.' },
      { q: 'SL papers for HL?', a: 'Use SL papers only for shared core topics at SL depth.' },
      { q: 'Course support?', a: '[Chemistry HL lessons](/ib/courses/chemistry-hl) cover syllabus order including AHL.' },
    ],
  },
  {
    slug: 'ib-physics-hl-past-papers-guide',
    title: 'IB Physics HL past papers & revision guide',
    description: 'Revise IB Physics HL with past papers: MCQ Paper 1, structured Paper 2, option Paper 3, and markband technique for a 7.',
    keywords: ['IB Physics HL', 'IB Physics HL past papers', 'IB Physics mark scheme', 'IB Physics HL revision', 'IB Physics markbands'],
    name: 'Physics', level: 'HL', catalogSlug: 'physics-hl', courseSlug: 'physics-hl',
    assessment: '**Paper 1** MCQ. **Paper 2** structured and extended across mechanics, fields, waves, and atomic physics including AHL. **Paper 3** practical-style and option questions.',
    markbands: 'Extended answers need **physics reasoning**: diagrams, stated assumptions, SI units, and linking maths to physical meaning.',
    strategy: 'Alternate full papers with AHL topic drills. Build your own formula sheet; practise explaining why an equation applies.',
    paperTips: 'Draw force and circuit diagrams. Combine uncertainties correctly on Paper 3.',
    pitfalls: 'Sign errors; scalar/vector confusion; skipping unit conversion; neglecting the option.',
    faqs: [
      { q: 'Paper 1 calculator?', a: 'Confirm with your teacher for your session — practise MCQs with your exam calculator.' },
      { q: 'Show that questions?', a: 'Every algebraic step must be visible — examiners cannot infer missing logic.' },
      { q: 'Free course?', a: '[Physics HL](/ib/courses/physics-hl) lessons align to syllabus topic codes.' },
    ],
  },
  {
    slug: 'ib-maths-aa-hl-past-papers-guide',
    title: 'IB Maths AA HL past papers & revision guide',
    description: 'IB Mathematics Analysis and Approaches HL: Paper 1 (no GDC), Paper 2 (GDC), Paper 3 problem-solving, and markband revision.',
    keywords: ['IB Maths AA HL', 'IB Maths AA HL past papers', 'IB Analysis and Approaches HL', 'IB Maths AA mark scheme', 'IB Maths AA HL revision'],
    name: 'Mathematics: Analysis and Approaches', level: 'HL', catalogSlug: 'maths-aa-hl', courseSlug: 'maths-aa-hl',
    assessment: '**Paper 1** (no calculator) tests algebraic fluency and proof-style reasoning. **Paper 2** (GDC) emphasises modelling and longer problems. **Paper 3** (HL) has two extended synthesis questions. **IA** mathematical exploration.',
    markbands: 'IB maths rewards communication and logical organisation — show reasoning even when the answer seems obvious.',
    strategy: 'Alternate P1 and P2 practice. For Paper 3, work every available HL Paper 3 slowly with documented thinking.',
    paperTips: 'Paper 1: exact forms and domain restrictions. Paper 2: note GDC inputs; round only at the end.',
    pitfalls: 'Calculator on Paper 1; weak Paper 3 communication; IA dragging down strong exams.',
    faqs: [
      { q: 'AA HL vs AI HL?', a: 'AA is algebra/proof-heavy; AI is modelling-heavy — choose by strength and degree requirements.' },
      { q: 'How many papers?', a: '6–8 fully marked papers with error logs is a solid target.' },
      { q: 'Course?', a: '[Maths AA HL course](/ib/courses/maths-aa-hl) for topic-by-topic refresh.' },
    ],
  },
  {
    slug: 'ib-economics-hl-past-papers-guide',
    title: 'IB Economics HL past papers & revision guide',
    description: 'IB Economics HL: Paper 1 essays, Paper 2 data response, Paper 3 policy/quantitative — markbands and revision workflow.',
    keywords: ['IB Economics HL', 'IB Economics HL past papers', 'IB Economics mark scheme', 'IB Economics HL revision', 'IB Economics markbands'],
    name: 'Economics', level: 'HL', catalogSlug: 'economics-hl', courseSlug: 'economics-hl',
    assessment: '**Paper 1** extended essays. **Paper 2** data response from an extract. **Paper 3** (HL) policy and quantitative questions. **IA** commentaries.',
    markbands: 'Essays need definitions, diagrams, analysis chains, and **evaluation** with a justified judgement.',
    strategy: 'Essay plan → two diagram chains → evaluation paragraph. Paper 3: practise quantitative drills separately from essays.',
    paperTips: 'Draw labelled diagrams and explain them in words. Paper 2: quote the extract for application marks.',
    pitfalls: 'Descriptive essays; ignoring Paper 3; weak IA commentaries; no evaluation on part (d).',
    faqs: [
      { q: 'Paper 3 content?', a: 'HL extensions — do not skip quantitative policy practice.' },
      { q: 'SL vs HL?', a: 'SL has no Paper 3 — HL students need HL-specific papers for timing.' },
      { q: 'Free course?', a: '[Economics HL](/ib/courses/economics-hl) plus [Economics SL](/ib/courses/economics-sl) for shared micro/macro refresh.' },
    ],
  },
  {
    slug: 'ib-business-management-hl-past-papers-guide',
    title: 'IB Business Management HL past papers & revision guide',
    description: 'IB Business Management HL: Paper 1 essays, Paper 2 case study, toolkit application, and markband technique.',
    keywords: ['IB Business Management HL', 'IB Business HL past papers', 'IB Business Management mark scheme', 'IB BM HL revision', 'IB Business markbands'],
    name: 'Business Management', level: 'HL', catalogSlug: 'business-management-hl', courseSlug: 'business-management-hl',
    assessment: '**Paper 1** (HL) is essay-based on the toolkit. **Paper 2** uses an unseen stimulus with quantitative and qualitative prompts.',
    markbands: 'Top bands require **application to the case** — tool → evidence → implication → limitation.',
    strategy: 'Learn toolkit by unit; practise "tool → case evidence → so what → limitation" chains under time.',
    paperTips: 'Paper 2: show ratio calculations with units. End with a justified recommendation.',
    pitfalls: 'Generic SWOT lists; no named stakeholder; confusing HL Paper 1 with SL case Paper 1.',
    faqs: [
      { q: 'HL vs SL Paper 1?', a: 'HL Paper 1 is essays; SL Paper 1 is pre-seen case structured questions.' },
      { q: 'Toolkit depth?', a: 'Finance, HR, marketing, and ops tools all appear — rotate practice.' },
      { q: 'Courses?', a: '[Business Management HL](/ib/courses/business-management-hl) and [SL](/ib/courses/business-management-sl).' },
    ],
  },
  {
    slug: 'ib-psychology-hl-past-papers-guide',
    title: 'IB Psychology HL past papers & revision guide',
    description: 'IB Psychology HL: Paper 1 approaches, Paper 2 options, Paper 3 qualitative research, markbands, and study technique.',
    keywords: ['IB Psychology HL', 'IB Psychology HL past papers', 'IB Psychology mark scheme', 'IB Psychology HL revision', 'IB Psychology markbands'],
    name: 'Psychology', level: 'HL', catalogSlug: 'psychology-hl', courseSlug: 'psychology-hl',
    assessment: '**Paper 1** biological, cognitive, sociocultural approaches. **Paper 2** two options. **Paper 3** (HL) qualitative research methods and analysis.',
    markbands: 'Essays need **named studies** with method, findings, and explicit link to the question.',
    strategy: 'Study sheets per study; timed SAQs; essay plan with two studies + counter + conclusion. Paper 3: practise qualitative analysis prompts.',
    paperTips: 'Match command terms — discuss needs balance; evaluate needs judgement.',
    pitfalls: 'Vague studies; neglecting Paper 3; confusing HL qualitative content with SL-only prep.',
    faqs: [
      { q: 'How many studies per essay?', a: 'Two developed studies plus evaluation usually beats four shallow mentions.' },
      { q: 'Paper 3 for SL?', a: 'Not examined at SL — HL must practise Paper 3 separately.' },
      { q: 'Courses?', a: '[Psychology HL](/ib/courses/psychology-hl) and [SL](/ib/courses/psychology-sl).' },
    ],
  },
  {
    slug: 'ib-history-hl-past-papers-guide',
    title: 'IB History HL past papers & revision guide',
    description: 'IB History HL: Paper 1 sources, Paper 2 essays, Paper 3 regional depth, markbands, and revision workflow.',
    keywords: ['IB History HL', 'IB History HL past papers', 'IB History mark scheme', 'IB History HL revision', 'IB History markbands'],
    name: 'History', level: 'HL', catalogSlug: 'history-hl', courseSlug: 'history-hl',
    assessment: '**Paper 1** source-based prescribed subject. **Paper 2** world history essays. **Paper 3** (HL) regional depth study. **IA** historical investigation.',
    markbands: 'Essays need argument and evidence, not narrative. Paper 1 rewards OPVL applied to the question.',
    strategy: 'Paper 1 question-type drills. Paper 2/3: essay plans with evidence banks (dates, names, stats).',
    paperTips: 'Paper 3: regional depth needs specific evidence, not generic world history.',
    pitfalls: 'Storytelling essays; only one Paper 2 topic revised; weak Paper 1 synthesis.',
    faqs: [
      { q: 'Paper 3 region?', a: 'Revise the region your school entered — check with your teacher.' },
      { q: 'SL papers?', a: 'Paper 1/2 overlap; ignore SL-only timing for Paper 3.' },
      { q: 'Course?', a: '[History HL](/ib/courses/history-hl) and [SL](/ib/courses/history-sl).' },
    ],
  },
  {
    slug: 'ib-geography-hl-past-papers-guide',
    title: 'IB Geography HL past papers & revision guide',
    description: 'IB Geography HL: Paper 1 themes, Paper 2 core, Paper 3 global interactions, markbands, and case studies.',
    keywords: ['IB Geography HL', 'IB Geography HL past papers', 'IB Geography mark scheme', 'IB Geography HL revision', 'IB Geography markbands'],
    name: 'Geography', level: 'HL', catalogSlug: 'geography-hl', courseSlug: 'geography-hl',
    assessment: '**Paper 1** optional themes. **Paper 2** core units. **Paper 3** (HL) global interactions. **IA** fieldwork report.',
    markbands: 'Top answers weave **named case studies** with processes, scale, and evaluated management responses.',
    strategy: 'Case study bank per theme; sketch maps under time; Paper 3 global interactions essays with stats.',
    paperTips: 'Define terms when asked. Nine-mark questions: process → case study → evaluate.',
    pitfalls: 'Case studies without stats; ignoring Paper 3; generic evaluation.',
    faqs: [
      { q: 'HL Paper 3?', a: 'Global interactions — separate revision from Paper 1 themes.' },
      { q: 'SL help?', a: 'Paper 1/2 overlap — [Geography SL course](/ib/courses/geography-sl) reinforces cores.' },
      { q: 'HL course?', a: '[Geography HL](/ib/courses/geography-hl) for full syllabus coverage.' },
    ],
  },
  {
    slug: 'ib-english-a-lang-lit-hl-past-papers-guide',
    title: 'IB English A Language & Literature HL revision guide',
    description: 'IB English A Language and Literature HL: Paper 1 non-literary analysis, Paper 2 comparative essay, HL Essay, criteria, and technique.',
    keywords: ['IB English A Language and Literature HL', 'IB English Lang Lit HL', 'IB English Paper 1', 'IB English HL revision', 'IB English markbands'],
    name: 'English A: Language and Literature', level: 'HL', catalogSlug: 'english-a-lang-lit-hl', courseSlug: 'english-a-lang-lit-hl',
    assessment: '**Paper 1** analyses unseen non-literary texts. **Paper 2** compares two literary works. **HL Essay** (1,200–1,500 words) on a literary work. **Individual Oral** links a global issue to works studied.',
    markbands: 'Criteria reward interpretation, analysis of authorial choices, coherence, and language — HL expects greater depth and range than SL.',
    strategy: 'Paper 1: technique → effect → purpose chains. Paper 2: balance both texts each paragraph. HL Essay: one sharp thesis, no plot summary.',
    paperTips: 'Avoid feature spotting. IO: rehearse with the same note policy as the exam.',
    pitfalls: 'Plot summary; HL Essay drafted late; IO global issue too vague.',
    faqs: [
      { q: 'HL vs SL?', a: 'HL adds HL Essay and longer IO — criteria align but expectations are higher.' },
      { q: 'Lang & Lit vs Literature?', a: 'Lang & Lit Paper 1 is non-literary; Literature analyses unseen literary extracts.' },
      { q: 'Course?', a: '[Lang & Lit HL](/ib/courses/english-a-lang-lit-hl) and [SL](/ib/courses/english-a-lang-lit-sl).' },
    ],
  },
  {
    slug: 'ib-english-a-literature-hl-past-papers-guide',
    title: 'IB English A Literature HL revision guide',
    description: 'IB English A Literature HL: guided literary analysis Paper 1, comparative Paper 2, HL Essay, assessment criteria, and workflow.',
    keywords: ['IB English Literature HL', 'IB English A Literature HL', 'IB Literature Paper 1', 'IB English HL revision', 'IB Literature markbands'],
    name: 'English A: Literature', level: 'HL', catalogSlug: 'english-a-literature-hl', courseSlug: 'english-a-literature-hl',
    assessment: '**Paper 1** guided analysis of unseen poetry or prose. **Paper 2** comparative essay on studied works. **HL Essay** on a literary line of inquiry.',
    markbands: 'Sustained **literary analysis** — imagery, structure, voice — tied to an arguable thesis.',
    strategy: 'Paper 1: tension + technique in the opening paragraph. Paper 2: alternate texts; answer the whole prompt.',
    paperTips: 'Close read line by line; context only when it serves interpretation.',
    pitfalls: 'Paraphrase; memorised essays; HL Essay plot retell.',
    faqs: [
      { q: 'Poetry or prose Paper 1?', a: 'Either may appear — practise both.' },
      { q: 'HL Essay length?', a: '1,200–1,500 words — start after works are well understood.' },
      { q: 'Course?', a: '[Literature HL](/ib/courses/english-a-literature-hl) and [SL](/ib/courses/english-a-literature-sl).' },
    ],
  },
  {
    slug: 'ib-spanish-b-hl-past-papers-guide',
    title: 'IB Spanish B HL past papers & revision guide',
    description: 'IB Spanish B HL: Paper 1 writing, Paper 2 receptive skills, themes, rubrics, and revision for a 6 or 7.',
    keywords: ['IB Spanish B HL', 'IB Spanish B HL past papers', 'IB Spanish B mark scheme', 'IB Spanish HL revision', 'IB Spanish B rubric'],
    name: 'Spanish B', level: 'HL', catalogSlug: 'spanish-b-hl', courseSlug: 'spanish-b-hl',
    assessment: '**Paper 1** productive writing across text types and themes (longer at HL). **Paper 2** reading and listening with Spanish responses.',
    markbands: 'Rubrics reward range, accuracy, organisation, and task fulfilment — idiomatic HL range with control beats ambitious errors.',
    strategy: 'Theme vocabulary + writing templates per text type. Listening daily without transcripts.',
    paperTips: 'Address every bullet. Proofread accents and agreement. HL expects wider register range.',
    pitfalls: 'Wrong register; listening only with transcripts; ignoring word limits.',
    faqs: [
      { q: 'HL vs SL writing?', a: 'HL tasks are longer with wider expected range — use HL rubrics when self-marking.' },
      { q: 'Dictionary?', a: 'Not permitted in Papers 1–2 — vocabulary must be pre-learned.' },
      { q: 'Course?', a: '[Spanish B HL](/ib/courses/spanish-b-hl) and [SL](/ib/courses/spanish-b-sl).' },
    ],
  },
  {
    slug: 'ib-french-b-hl-past-papers-guide',
    title: 'IB French B HL past papers & revision guide',
    description: 'IB French B HL: Paper 1 writing, Paper 2 receptive skills, theme vocabulary, and criterion-based revision.',
    keywords: ['IB French B HL', 'IB French B HL past papers', 'IB French B mark scheme', 'IB French HL revision', 'IB French B rubric'],
    name: 'French B', level: 'HL', catalogSlug: 'french-b-hl', courseSlug: 'french-b-hl',
    assessment: '**Paper 1** productive writing (HL length and range). **Paper 2** reading and listening comprehension.',
    markbands: 'Communication first, then range and accuracy — clear organisation beats risky grammar at HL.',
    strategy: 'Phrase banks per theme; weekly timed writes marked against official criteria.',
    paperTips: 'Connectors (cependant, en revanche). HL: justify opinions with developed paragraphs.',
    pitfalls: 'False friends; one tense only; neglecting listening under exam audio conditions.',
    faqs: [
      { q: 'HL length?', a: 'Longer productive tasks than SL — practise to time with HL prompts.' },
      { q: 'IO prep?', a: 'Photo description reinforces theme vocabulary for Paper 1.' },
      { q: 'Course?', a: '[French B HL](/ib/courses/french-b-hl) and [SL](/ib/courses/french-b-sl).' },
    ],
  },
  {
    slug: 'ib-computer-science-hl-past-papers-guide',
    title: 'IB Computer Science HL past papers & revision guide',
    description: 'IB Computer Science HL: Paper 1 theory, Paper 2 case study, Paper 3 options, pseudocode, and workflow.',
    keywords: ['IB Computer Science HL', 'IB CS HL past papers', 'IB Computer Science mark scheme', 'IB CS HL revision', 'IB Computer Science markbands'],
    name: 'Computer Science', level: 'HL', catalogSlug: 'computer-science-hl', courseSlug: 'computer-science-hl',
    assessment: '**Paper 1** systems, networks, databases, computational thinking. **Paper 2** pre-released **case study**. **Paper 3** (HL) chosen option (e.g. OOP, databases). **IA** solution product.',
    markbands: 'Extended answers need precise **technical vocabulary** and unambiguous pseudocode logic.',
    strategy: 'Paper 1 topic checklists; annotate case study on release; Paper 3 option past questions slowly.',
    paperTips: 'Trace tables for algorithms. Case study: justify recommendations with trade-offs.',
    pitfalls: 'Vague answers; ignoring Paper 3 option; feature creep on IA.',
    faqs: [
      { q: 'Paper 3 options?', a: 'HL only — master your school\'s chosen option with past Paper 3s.' },
      { q: 'SL overlap?', a: 'Papers 1–2 overlap — [CS SL course](/ib/courses/computer-science-sl) helps core revision.' },
      { q: 'HL course?', a: '[Computer Science HL](/ib/courses/computer-science-hl) for theory topics.' },
    ],
  },
  {
    slug: 'ib-visual-arts-hl-past-papers-guide',
    title: 'IB Visual Arts HL portfolio & assessment guide',
    description: 'IB Visual Arts HL: comparative study, process portfolio, exhibition — criteria and top-band tips.',
    keywords: ['IB Visual Arts HL', 'IB Visual Arts HL portfolio', 'IB Visual Arts comparative study', 'IB Visual Arts exhibition', 'IB Visual Arts markbands'],
    name: 'Visual Arts', level: 'HL', catalogSlug: 'visual-arts-hl', courseSlug: 'visual-arts-hl',
    assessment: '**Comparative study**, **process portfolio**, and **exhibition** — HL expects greater breadth and investigation depth than SL.',
    markbands: 'Criteria reward formal analysis, cultural context, and coherent curatorial intent.',
    strategy: 'Weekly process documentation; comparative study with genuine formal contrast; rationale before final selection.',
    paperTips: 'Art vocabulary (composition, materiality). Compare technique and meaning, not biography timelines.',
    pitfalls: 'Description without analysis; exhibition unrelated to stated theme.',
    faqs: [
      { q: 'HL vs SL?', a: 'HL expects more investigation breadth — check component weightings.' },
      { q: 'Digital work?', a: 'Allowed if your programme supports submission requirements.' },
      { q: 'Course?', a: '[Visual Arts HL](/ib/courses/visual-arts-hl) and [SL](/ib/courses/visual-arts-sl).' },
    ],
  },
]

POSTS.push(...HL_POSTS)

function courseLinksForIa(b) {
  const links = []
  if (b.courseSlug?.endsWith('-hl')) {
    links.push(`[Free ${b.subject} HL course](${coursePath(b.courseSlug)})`)
    const sl = b.courseSlug.replace(/-hl$/, '-sl')
    links.push(`[Free ${b.subject} SL course](${coursePath(sl)})`)
  } else if (b.courseSlug) {
    links.push(`[Free ${b.subject} course](${coursePath(b.courseSlug)})`)
  }
  return links.join(' · ')
}

function renderIaPost(b) {
  const sub = subjectPath(b.catalogSlug)
  const courseLinks = courseLinksForIa(b)
  const pp = pastPapersPath(b.catalogSlug)
  const faqBlock = b.faqs.map((f) => `### ${f.q}\n${f.a}`).join('\n\n')

  return `---
title: ${b.title}
description: ${b.description}
date: ${DATE}
keywords: ${b.keywords.join(', ')}
category: revision
author: hassan
updated: ${DATE}
informationGain: synthesis
---

The IB ${b.subject} **Internal Assessment** is worth ${b.weight} — often the difference between a 5 and a 7 when exams go wrong. Unlike past papers, the IA is coursework you control months before exams. This guide explains criteria, structure, and the mistakes moderators see every year.

See also: [IB Internal Assessment overview](/blog/ib-internal-assessment-complete-guide) · [${b.subject} past papers](${pp})${courseLinks ? ` · ${courseLinks}` : ''}

## What examiners mark
${b.criteria}

## Recommended structure
${b.structure}

## Workflow for a top-band IA
${b.strategy}

## Common pitfalls
${b.pitfalls}

## Criterion practice on MarkScheme
Draft sections can be checked against IB assessment language — [get feedback on your IA writing](${markPath(b.courseSlug?.replace(/-hl$/, '-sl') ?? b.courseSlug)}) where supported, and use syllabus [lessons](${coursePath(b.courseSlug?.replace(/-hl$/, '-sl') ?? b.courseSlug)}) to strengthen methodology and subject vocabulary.

## Frequently asked questions

${faqBlock}

## Bottom line
Start early, narrow your question, and mark your own draft against the **official criteria** before the supervisor deadline. A strong ${b.subject} IA is free insurance on your final grade — pair it with timed [past paper practice](${pp}) closer to exams.
`
}

function pastPapersPath(slug) {
  return slug ? `/ib/past-papers/${slug}` : '/ib/past-papers'
}

function subjectPath(slug) {
  return slug ? `/ib/subjects/${slug}` : '/ib'
}

function coursePath(slug) {
  return slug ? `/ib/courses/${slug}` : '/ib/courses'
}

function markPath(slug) {
  return slug ? `/mark?subject=ib-${slug}` : '/mark'
}

function ibCourseExists(slug) {
  if (!slug) return false
  const dir = path.join(COURSES_DIR, `ib-${slug}`)
  if (!fs.existsSync(dir)) return false
  return fs.readdirSync(dir).some((f) => f.endsWith('.json'))
}

function siblingCourseSlug(slug) {
  if (!slug) return null
  if (slug.endsWith('-hl')) return slug.replace(/-hl$/, '-sl')
  if (slug.endsWith('-sl')) return slug.replace(/-sl$/, '-hl')
  return null
}

function renderCourseLinkParagraph(b) {
  const levelLabel = b.level ? ` ${b.level}` : ''
  const primarySlug = b.courseSlug ?? b.catalogSlug
  if (!primarySlug) return ''

  const lines = []
  if (ibCourseExists(primarySlug)) {
    lines.push(
      `Our free [${b.name}${levelLabel} course](${coursePath(primarySlug)}) links every syllabus topic to lessons, flashcards, and practice tasks.`
    )
  }

  const sibling = siblingCourseSlug(primarySlug)
  if (sibling && ibCourseExists(sibling)) {
    const siblingLevel = sibling.endsWith('-hl') ? ' HL' : ' SL'
    lines.push(
      `Also see the [${b.name}${siblingLevel} course](${coursePath(sibling)}) if you sit the other level.`
    )
  }

  return lines.join(' ')
}

function renderPost(b) {
  const pp = pastPapersPath(b.catalogSlug)
  const sub = subjectPath(b.catalogSlug)
  const mark = markPath(b.courseSlug ?? b.catalogSlug)
  const levelLabel = b.level ? ` ${b.level}` : ''
  const courseLinks = renderCourseLinkParagraph(b)
  const intro =
    b.intro ??
    `Scoring highly in IB ${b.name}${levelLabel} is not about memorising more — it is about aligning your answers with what examiners reward in the **markbands**. Strategic use of [IB ${b.name} past papers](${pp}) under timed conditions, honest self-marking, and targeted feedback closes the gap between a 5 and a 7.`

  const faqBlock = b.faqs
    .map((f) => `### ${f.q}\n${f.a}`)
    .join('\n\n')

  const markSection = b.catalogSlug
    ? `## Using MarkScheme for targeted feedback\nSelf-marking against band descriptors is essential, but extended responses benefit from a second opinion. After a past paper or IA section, [get criterion-based feedback](${mark}) aligned with IB assessment objectives — the same habits that lift exam scripts also sharpen coursework drafts.\n\n${courseLinks}`
    : `## Using MarkScheme across the diploma\nMarkScheme hosts [free IB courses](${coursePath('')}), [past paper archives](${pp}), and [criterion practice marking](${markPath('')}) for sciences, humanities, languages, maths, arts, and Core components — so you can revise content and exam technique in one place.`

  return `---
title: ${b.title}
description: ${b.description}
date: ${DATE}
keywords: ${b.keywords.join(', ')}
category: revision
author: hassan
updated: ${DATE}
informationGain: synthesis
---

${intro}

## Understanding the IB ${b.name}${levelLabel} assessment
${b.assessment}${b.catalogSlug ? ` Browse the full subject overview at [IB ${b.name}${levelLabel}](${sub}).` : ''}

## Markbands and what examiners reward
${b.markbands}

## A past paper workflow that actually works
${b.strategy}

## Paper-specific tips
${b.paperTips}

## Common pitfalls
${b.pitfalls}

${markSection}

## Frequently asked questions

${faqBlock}

## Bottom line
Treat ${b.catalogSlug ? `[IB ${b.name}${levelLabel} past papers](${pp})` : 'past papers and portfolio criteria'} as training for examiner thinking — not a trivia test. Cycle timed practice, honest band marking, and focused drills on your weakest criteria; that is how top candidates make a 7 predictable rather than lucky.
`
}

let written = 0
let skipped = 0

function shouldWrite(slug) {
  if (ONLY && slug !== ONLY) return false
  if (HL_ONLY && !slug.endsWith('-hl-past-papers-guide')) return false
  if (SL_ONLY) {
    const isSlPast =
      slug.endsWith('-sl-past-papers-guide') ||
      slug === 'ib-environmental-systems-and-societies-past-papers-guide'
    if (!isSlPast) return false
  }
  return true
}

for (const brief of POSTS) {
  if (!shouldWrite(brief.slug)) continue
  const file = path.join(BLOG_DIR, `${brief.slug}.md`)
  if (fs.existsSync(file) && !FORCE) {
    skipped++
    continue
  }
  fs.writeFileSync(file, renderPost(brief), 'utf8')
  written++
  console.log(`✓ ${brief.slug}.md`)
}

for (const brief of IA_POSTS) {
  if (!shouldWrite(brief.slug)) continue
  const file = path.join(BLOG_DIR, `${brief.slug}.md`)
  if (fs.existsSync(file) && !FORCE) {
    skipped++
    continue
  }
  fs.writeFileSync(file, renderIaPost(brief), 'utf8')
  written++
  console.log(`✓ ${brief.slug}.md (IA)`)
}

console.log(`\nDone: ${written} written, ${skipped} skipped (existing).`)
