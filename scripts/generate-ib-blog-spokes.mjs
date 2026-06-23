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
const DATE = '2026-06-23'
const FORCE = process.argv.includes('--force')

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
    name: 'Economics', level: 'SL', catalogSlug: 'economics-sl', courseSlug: 'economics-hl',
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
    name: 'Business Management', level: 'SL', catalogSlug: 'business-management-sl', courseSlug: 'business-management-hl',
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
    name: 'Psychology', level: 'SL', catalogSlug: 'psychology-sl', courseSlug: 'psychology-hl',
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
    name: 'Geography', level: 'SL', catalogSlug: 'geography-sl', courseSlug: 'geography-hl',
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
    name: 'Computer Science', level: 'SL', catalogSlug: 'computer-science-sl', courseSlug: 'computer-science-hl',
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
    name: 'Environmental Systems and Societies', level: 'SL', catalogSlug: 'environmental-systems-and-societies', courseSlug: 'environmental-systems-and-societies',
    assessment: 'ESS is **SL only**. **Paper 1** uses a resource booklet (case study) with structured questions. **Paper 2** has longer essays on syllabus themes linking environment and society. Fieldwork feeds the **IA**.',
    markbands: 'Answers should show **systems thinking** — stakeholders, flows, feedback, scale, and sustainability trade-offs — with named examples.',
    strategy: 'Build case study banks (pollution, conservation, energy). Practise essay plans that always include human + environmental lens and an evaluated solution.',
    paperTips: 'Paper 1: cite data from the booklet. Paper 2: define key terms (carrying capacity, ecological footprint) precisely before developing.',
    pitfalls: 'Biology-only answers without social dimension; no specific example; ignoring sustainability pillars; weak IA fieldwork design.',
    faqs: [
      { q: 'ESS vs Biology SL?', a: 'ESS is interdisciplinary — less depth in pure bio, more on systems, policy, and ethics. Check university acceptance for your path.' },
      { q: 'Group 3 or 4?', a: 'Counts as one subject in either group depending on your diploma structure — confirm with your coordinator.' },
      { q: 'Where are ESS papers?', a: 'See [IB ESS past papers](/ib/past-papers/environmental-systems-and-societies) on MarkScheme.' },
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

function renderPost(b) {
  const pp = pastPapersPath(b.catalogSlug)
  const sub = subjectPath(b.catalogSlug)
  const course = coursePath(b.courseSlug ?? b.catalogSlug)
  const mark = markPath(b.courseSlug ?? b.catalogSlug)
  const levelLabel = b.level ? ` ${b.level}` : ''
  const intro =
    b.intro ??
    `Scoring highly in IB ${b.name}${levelLabel} is not about memorising more — it is about aligning your answers with what examiners reward in the **markbands**. Strategic use of [IB ${b.name} past papers](${pp}) under timed conditions, honest self-marking, and targeted feedback closes the gap between a 5 and a 7.`

  const faqBlock = b.faqs
    .map((f) => `### ${f.q}\n${f.a}`)
    .join('\n\n')

  const markSection = b.catalogSlug
    ? `## Using MarkScheme for targeted feedback\nSelf-marking against band descriptors is essential, but extended responses benefit from a second opinion. After a past paper or IA section, [get criterion-based feedback](${mark}) aligned with IB assessment objectives — the same habits that lift exam scripts also sharpen coursework drafts.\n\nOur free [${b.name}${levelLabel} course](${course}) links every syllabus topic to lessons, flashcards, and practice tasks.`
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

for (const brief of POSTS) {
  const file = path.join(BLOG_DIR, `${brief.slug}.md`)
  if (fs.existsSync(file) && !FORCE) {
    skipped++
    continue
  }
  fs.writeFileSync(file, renderPost(brief), 'utf8')
  written++
  console.log(`✓ ${brief.slug}.md`)
}

console.log(`\nDone: ${written} written, ${skipped} skipped (existing).`)
