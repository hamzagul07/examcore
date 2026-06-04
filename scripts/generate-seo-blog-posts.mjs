/**
 * Additional SEO-focused blog posts (general guides).
 * Run: node scripts/generate-seo-blog-posts.mjs [--force]
 */
import fs from 'fs'
import path from 'path'

const BLOG_DIR = path.join(process.cwd(), 'content', 'blog')
const force = process.argv.includes('--force')

/** @type {Array<{slug:string, body:string}>} */
const POSTS = [
  {
    slug: 'how-many-cambridge-past-papers-before-exams',
    body: `---
title: How many Cambridge past papers should you do before exams?
description: A realistic past-paper count for A-Level and O-Level — by weeks to exams, subject type, and what “done” actually means (marking included).
date: 2026-05-18
keywords: how many past papers, Cambridge revision, A-Level past papers, exam preparation, past paper schedule
---

“How many past papers do I need?” is the wrong question. **How many past papers have you marked honestly?** is the one that predicts grades.

## The short answer

| Weeks to exam | Rough target (per subject) |
|---------------|----------------------------|
| 12+ | 1–2 questions marked per week + topic drills |
| 8–12 | 4–6 full papers **marked**, not just attempted |
| 4–8 | 6–10 papers, heavy on weak components |
| 2–4 | Quality over quantity — full papers under time + rewrite |

Doing **fifteen** papers without scheme marking is revision theatre. Doing **six** with line-by-line marking often moves marks more.

## What counts as “one past paper”

A past paper only counts toward your total when you:

1. Sat it under realistic timing (or a deliberate half-paper)
2. Marked with the **official mark scheme** for that session
3. Logged **why** each mark was lost
4. Rewrote **one** weak part — not the whole paper again immediately

If you skip step 2, you are practising stamina, not exam performance.

## By subject type

### Maths & sciences (9709, 9702, 9701…)

- Prioritise **recent sessions** for your exact component list
- One long question marked per study night beats skimming twelve papers
- Track **M marks** lost separately from **A marks**

### Essay subjects (9708, 9489, 9699…)

- Full essays are slow — plan **half the essays** you think you need, but mark every paragraph against **bands**
- Build a bank of **evaluative sentences** from examiner reports

### MCQ-heavy routes

- Speed comes from pattern recognition — mark **wrong options** with a one-line reason, not just “B”

## A simple 8-week counter (one subject)

| Week | Papers / questions |
|------|-------------------|
| 1–2 | 4 structured questions, fully marked |
| 3–4 | 2 half papers |
| 5–6 | 2 full papers |
| 7 | 1 full paper + 1 weak-component redo |
| 8 | 1 timed paper + light topic review only |

Adjust up if you have more than eight weeks; adjust down if you are balancing four subjects — **per-subject** targets matter.

## When to stop adding new papers

Stop increasing volume when:

- The same mistake type appears **three times** in your log
- You are marking generously because you are tired
- You have not read an **examiner report** for your syllabus in a month

Switch to **fixing** logged errors instead of downloading another PDF.

## Use a second marking pass

Self-marking drifts generous. After your own pass, upload one question per session to [MarkScheme](/mark) for feedback tied to the real scheme — especially on questions you “thought were fine”.

## Frequently asked questions

### Is it bad if I only do papers from 2018?

Use recent sessions first — command style and emphasis shift. Older papers are fine for **topic** drill once you know current conventions.

### Should I redo the same paper?

Yes, but only **after** marking and only the questions you lost marks on. Blind redo without marking teaches memory, not technique.

### How do I fit four subjects?

Rotate: one “heavy mark” night per subject per week beats one subject bingeing all papers in March.

## What to read next

- [Cambridge past paper revision schedule](/blog/cambridge-past-paper-revision-schedule)
- [When to start past papers](/blog/when-to-start-past-papers-cambridge-a-level)
- [How to mark past papers yourself](/blog/how-to-mark-cambridge-past-papers-yourself)

## Bottom line

There is no magic number of PDFs. There **is** a magic number of **honest marking cycles** — aim for depth on fewer papers, not a trophy shelf of unmarked scripts.
`,
  },
  {
    slug: 'cambridge-examiner-report-how-to-use',
    body: `---
title: How to use Cambridge examiner reports (and why mark schemes are not enough)
description: Turn examiner reports into a revision list — what they contain, how to read them fast, and how to pair them with past-paper marking.
date: 2026-05-12
keywords: Cambridge examiner report, past paper revision, A-Level examiner feedback, mark scheme guide
---

Mark schemes tell you **what** earns a mark. Examiner reports tell you **what everyone else lost** — which is often where your marks are hiding.

## What an examiner report actually is

After each series, Cambridge publishes feedback on how candidates performed: common errors, misunderstood commands, and topics that separated grades. It is not a story — it is a **diagnostic**.

You will usually find them:

- Next to past papers on Cambridge International’s site  
- Bundled in school revision packs  
- Linked from teacher portals  

Always match **syllabus code + series** (e.g. 9709 June 2024, not a random year).

## How to read one in 30 minutes

1. **Skim the introduction** — overall difficulty and themes  
2. **Highlight three bullets** that sound like your mistakes  
3. **Jump to your weakest paper component** (P4, essay, MCQ…)  
4. **Write one line per insight** in a notebook — not paragraphs  

If you finish reading without a list, you read it like a novel. Start again.

## Turn reports into actions

| Report says… | You do… |
|-------------|---------|
| “Many lost M marks for no working shown” | Next five questions: box working before answer |
| “Evaluation was descriptive” | Essay plan must include *because / however* |
| “Units omitted” | Checklist on every physics calculation |
| “Misread the command word” | Circle command word before writing |

## Pair with mark schemes on the same question

Workflow that works:

1. Attempt a past-paper question  
2. Mark with the **mark scheme**  
3. Read the **report** section for that question type  
4. Rewrite **one paragraph or step**  

Reports explain *patterns*; schemes award *this* attempt.

## Subject-specific tips

### Sciences & maths

Look for **significant figures**, **units**, and **shown method** — boring words, expensive marks.

### Humanities & social sciences

Look for **structure**, **evaluation depth**, and **misapplied theory** — examiners repeat the same band-limiting habits every year.

### Business & economics

Look for **application to case** failures — generic theory dumps are report favourites.

## Frequently asked questions

### Are examiner reports worth it for O-Level?

Yes — especially 4024, 5070, 5090 where wording precision dominates.

### What if my series has no report yet?

Use the previous year’s report for the **same component** — patterns repeat more than questions do.

### Can MarkScheme replace examiner reports?

No — reports are syllabus-wide insight. [MarkScheme](/mark) marks **your** script against the scheme; use both.

## What to read next

- [How to read a Cambridge mark scheme](/blog/how-to-read-a-cambridge-mark-scheme)
- [Common self-marking mistakes](/blog/common-mistakes-self-marking-past-papers)
- [AI marking guide](/blog/ai-marking-cambridge-past-papers-guide)

## Bottom line

Treat examiner reports as a **free coach** published every year. Three insights per report, applied on the next question you mark — that compounding beats another passive read-through.
`,
  },
  {
    slug: 'cambridge-grade-boundaries-past-papers',
    body: `---
title: Cambridge grade boundaries explained for past-paper students
description: What grade boundaries mean, why they change each series, and how to use past-paper scores without fooling yourself.
date: 2026-05-08
keywords: Cambridge grade boundaries, A-Level grades, past paper score, UMS marks, exam results
---

You finished a 2023 paper, added marks generously, got 78%, and feel ready for an A. **Grade boundaries exist precisely because that feeling is unreliable.**

## What grade boundaries are

After marking, Cambridge sets minimum marks (or points) for each grade **for that exam series**. A strong paper in June might need more raw marks than a harder paper in November — boundaries adjust so grades stay comparable across time.

Boundaries are **not** printed inside your past paper PDF. They are published after exams — use them as context, not prophecy.

## Raw marks vs what you think you scored

When you self-mark:

- You might award **method marks** you would not get under pressure  
- Essay **bands** drift generous at midnight  
- MCQ is binary — but your “silly mistake” rate changes under time  

So: past-paper percentages are **trend lines**, not certificates.

## How to use boundaries without anxiety

| Do | Don’t |
|----|--------|
| Track **same-component** papers over weeks | Compare 9709 P1 to 9709 P4 raw % |
| Note **which mark types** you lose | Panic over one hard paper |
| Improve **one error type** per fortnight | Chase last year’s boundary line exactly |

## A healthier tracking sheet

For each marked paper log:

- Syllabus code + paper component + session  
- Marks scored / available  
- Top **three** lost-mark reasons (words from the scheme)  
- One rewrite completed? (yes/no)  

Graph those reasons — not just percentages.

## When boundaries help motivation

If you are far below a typical A boundary on **marked** papers eight weeks out, that is useful — you still have time to fix **repeatable** errors. If you are close on honest marking, boundaries remind you that **exam technique** (timing, checking) still matters.

## Frequently asked questions

### Do boundaries matter for O-Level?

Yes — same principle, different numbers. Track by component.

### Should I only practise “easy” series?

No — difficulty varies. Honest marking matters more than picking soft papers.

### How does MarkScheme fit in?

Upload marked questions to [MarkScheme](/mark) when you want a **second pass** on scheme language — especially before you trust a percentage.

## What to read next

- [How many past papers before exams](/blog/how-many-cambridge-past-papers-before-exams)
- [Revision schedule](/blog/cambridge-past-paper-revision-schedule)
- [Self-marking guide](/blog/how-to-mark-cambridge-past-papers-yourself)

## Bottom line

Grade boundaries answer “how did the cohort do this series?” — your job in revision is “what do **I** lose marks for every week?” Track the second question and boundaries become useful, not scary.
`,
  },
  {
    slug: 'study-cambridge-past-papers-without-teacher-feedback',
    body: `---
title: How to study Cambridge past papers when you do not have a teacher to mark them
description: Self-study workflows for homeschooled, international, and evening students — marking rigour, accountability, and tools that help.
date: 2026-05-05
keywords: self study A-Level, mark past papers at home, Cambridge homeschool, no teacher feedback, past paper marking
---

No teacher in the room does not mean no feedback loop. It means **you** build the loop — and most students build a generous one.

## The self-study disadvantage (and how to fix it)

Without a teacher you lose:

- Someone who marks **strictly** on the first pass  
- Pressure to fix **wording** not just maths  
- Accountability to redo weak parts  

You keep:

- Unlimited past papers  
- Mark schemes and examiner reports  
- Tools that mark against the same scheme language  

Fix the disadvantage deliberately — do not pretend motivation replaces rigour.

## Build a “virtual teacher” routine

### Monday — attempt

One question or half paper, timed, no scheme open.

### Tuesday — mark (strict)

Scheme first, answer covered. Tick only what you would defend aloud.

### Wednesday — evidence

One paragraph or calculation **rewritten cleanly** in a new notebook page.

### Weekend — second opinion

One upload to [MarkScheme](/mark) or swap with a study partner using the **same** scheme.

## Accountability without a school

| Method | Why it works |
|--------|----------------|
| Study partner mark-swap | Social cost of being generous |
| Public revision log (Notion) | Streak of “marked yes/no” |
| Parent asks “what mark type did you lose?” | Forces vocabulary, not vibes |
| Fixed weekly slot | Marking happens when energy is high |

## What not to do alone

- Mark at midnight — generosity spikes  
- Read model answers before marking — you will over-credit  
- Do a new paper before fixing last week’s error  
- Assume YouTube explanations = scheme marks  

## Tools that help (honestly)

- **Official mark scheme PDF** — non-negotiable  
- **Examiner report** — pattern library  
- **[MarkScheme](/mark)** — second pass on handwriting, especially maths/sciences  
- **Voice notes** — explain aloud why you lost each mark (catches hand-waving)  

## Frequently asked questions

### Is self-marking enough for essays?

It can be if you mark **bands**, not feelings. Many essay students add one external pass per week.

### Homeschool candidates — any difference?

Exam day is the same. Your prep must be **more** scheme-literate, not less.

### How do I know I am improving?

Your **lost-mark log** should change — fewer “no working shown”, fewer “evaluation descriptive”. Percentages follow.

## What to read next

- [How to mark past papers yourself](/blog/how-to-mark-cambridge-past-papers-yourself)
- [Examiner reports](/blog/cambridge-examiner-report-how-to-use)
- [Photographing handwritten answers](/blog/photograph-handwritten-past-paper-answers)

## Bottom line

Self-study works when you replicate what good teachers do: **strict marking, logged errors, forced rewrites.** Build that system and “no teacher” stops being an excuse.
`,
  },
  {
    slug: 'cambridge-as-level-vs-a2-past-paper-strategy',
    body: `---
title: AS Level vs A2 past papers — different jobs, different marking habits
description: When to use AS papers, when to switch to A2, and how to mark each stage without mixing up components or expectations.
date: 2026-04-28
keywords: AS Level past papers, A2 past papers, Cambridge A-Level revision, 9709 AS, exam strategy
---

AS and A2 are not “easier and harder versions of the same PDF.” They are **different exam contracts** — and your past-paper plan should treat them that way.

## What AS papers are for

- Building **foundation** fluency (definitions, core methods, shorter essays)  
- Learning **mark scheme vocabulary** with lower time pressure on some routes  
- Discovering which **components** you will carry forward  

Use AS papers heavily in Year 12 and early Year 13 — not as nostalgia once A2 starts.

## What A2 papers are for

- **Integration** across topics — multi-step thinking under time  
- **Higher tariff** questions (longer essays, heavier calculations)  
- Exam-day **stamina** and pacing  

When A2 prep begins, AS full papers should shrink — replaced by targeted AS **questions** only where you are weak.

## Marking differences that trip students up

| Trap | Fix |
|------|-----|
| Marking AS essays with A2 band expectations | Use the scheme for **that** paper’s tariff |
| Practising wrong component numbers | Write your entered components on your wall |
| Ignoring AS remission topics still examined at A2 | Cross-check syllabus updates yearly |

## Suggested timeline (linear A-Level)

### Year 12 (Terms 1–2)

- Topic questions + selected AS structured items  
- Start full AS components in Term 3  

### Year 13 (from September)

- Mostly A2 components  
- One AS question per week only on weak foundations  

### 8 weeks to exams

- **Zero** new AS full papers unless a teacher identifies a gap  
- A2 papers marked in full, one component rotated per weekend  

## Combining with MarkScheme

- AS practice: shorter uploads, focus on **method marks**  
- A2 practice: full questions, **Past paper** mode when the session is in library  

## Frequently asked questions

### I retook AS — which papers?

Mark retake sessions separately in your log — do not blend with first-sit scripts.

### O-Level vs AS?

Different qualifications — do not mix 4024 habits with 9709 notation without checking.

## What to read next

- [When to start past papers](/blog/when-to-start-past-papers-cambridge-a-level)
- [9709 maths guide](/blog/cambridge-9709-a-level-mathematics-past-papers-guide)
- [Revision schedule](/blog/cambridge-past-paper-revision-schedule)

## Bottom line

AS builds tools. A2 tests combinations. Mark each stage with its own scheme, then spend the final months living in **A2 timing** — that is what exam day will feel like.
`,
  },
  {
    slug: 'best-cambridge-past-paper-revision-resources-2026',
    body: `---
title: Best Cambridge past paper resources in 2026 (free and paid)
description: Where to download papers, mark schemes, examiner reports, and marking tools — plus what to avoid when revising.
date: 2026-04-22
keywords: Cambridge past papers download, mark scheme PDF, A-Level resources 2026, revision tools
---

The internet is full of half-uploaded papers and “model answers” that are not Cambridge. Here is a **clean stack** that actually supports marking discipline.

## Tier 1 — non-negotiable (free)

1. **Cambridge International past papers** — official PDFs for your syllabus code  
2. **Mark schemes** — same session, same component  
3. **Examiner reports** — same series when available  

If those three do not match, stop and find the right session.

## Tier 2 — high value

| Resource | Use for |
|----------|---------|
| Syllabus document | Checking topic still examined |
| Specimen papers | Early familiarisation only |
| Formula booklet (maths/sciences) | Exam-day layout practice |
| Your school’s topic tests | Gap finding before full papers |

## Tier 3 — tools (including MarkScheme)

- **[MarkScheme](/mark)** — photograph handwritten answers, get mark-by-mark feedback against real schemes (9709, sciences, essays, MCQ…)  
- **Spreadsheet or Notion** — lost-mark log by type  
- **Study partner** — swap marked scripts weekly  

## What to avoid

- Random “solutions” blogs with no mark breakdown  
- Papers from unknown years with no scheme  
- Marking only with model answers  
- Doing papers without timing **ever** — add time in the last third of prep  

## Free vs paid — honest take

Paid tutors help when they mark **strictly** and assign **rewrites**. Paid tools help when they expose **scheme language**, not just a final grade.

MarkScheme’s free tier exists so you can test whether a **second marking pass** catches what self-marking misses — especially on handwriting.

## Build your folder structure

\`\`\`text
9709/
  2024-june/
    9709-12-paper.pdf
    9709-12-ms.pdf
    9709-12-er.pdf
    my-marked-12.pdf  (your scans + notes)
\`\`\`

Messy downloads = you practise wrong components.

## Frequently asked questions

### Are third-party past paper sites safe?

Use official or school sources first — mislabeled components waste weeks.

### Do I need every year back to 2010?

Recent five sessions per component first, then older for topic drill only.

## What to read next

- [Examiner reports](/blog/cambridge-examiner-report-how-to-use)
- [Photographing answers](/blog/photograph-handwritten-past-paper-answers)
- [Subject guides](/blog) — per syllabus codes

## Bottom line

Resources do not replace **marking habits**. Official PDFs + honest self-mark + occasional second pass = the stack that moves grades in 2026.
`,
  },
  {
    slug: 'cambridge-command-words-past-papers-guide',
    body: `---
title: Cambridge command words for past papers — explain, evaluate, assess (with examples)
description: What exam command words actually require in Cambridge A-Level and O-Level answers — and how to mark yourself against them.
date: 2026-04-15
keywords: Cambridge command words, evaluate A-Level, explain exam answer, assess discuss, past paper technique
---

You can know the syllabus and still lose marks because you answered a **discuss** question with a **describe** essay. Command words are the exam’s contract — break them and the mark scheme cannot save you.

## Why command words matter more than topic knowledge

Examiners mark **what you were asked to do**, not everything you know. The scheme’s bands often reference:

- Depth of **explanation**  
- Presence of **evaluation**  
- Use of **data** from a stimulus  

Wrong command → right facts → mid-band at best.

## Core command words (quick reference)

| Word | You must… |
|------|-----------|
| **State / Name** | Short, precise — often one mark per point |
| **Describe** | Say what happens — trends, steps, features — no deep why |
| **Explain** | Give reasons / mechanisms — because… therefore… |
| **Suggest** | Apply knowledge to a novel scenario — not memorised paragraphs |
| **Compare** | Similarities **and** differences — structured, not two lists |
| **Discuss** | Balanced argument — often both sides + judgement |
| **Evaluate / Assess** | Judgement with evidence — not one vague “overall” line |
| **Calculate** | Working + unit + sensible figures — scheme will specify |

Always circle the command word **before** you write.

## Worked habit (any subject)

1. Underline command word  
2. Write a **one-line plan**: “This needs three because-chains + judgement”  
3. Check each paragraph serves that plan  
4. Mark yourself: did I do the command, not just the topic?  

## Subject nuances

### Sciences

“Explain” needs mechanism vocabulary from the syllabus — not storytelling.

### Economics / business

“Evaluate” needs **stakeholder / time horizon** — not “however” once at the end.

### History / sociology

“Discuss” needs thesis + counter + conclusion — narrative alone caps your band.

### Maths

Commands are often implicit in “show that” / “hence” — read the line after those words carefully.

## Marking yourself on command words

When self-marking, ask:

> If I cover the name and only read my answer, could I guess the command word?

If not, you likely described when you should have explained.

## Frequently asked questions

### Do command words change between O-Level and A-Level?

Wording is similar; **mark tariffs** and depth expectations rise — use the scheme for your level.

### Can MarkScheme check command words?

Feedback references scheme expectations for your question type — upload with the **full question stem** visible.

## What to read next

- [How to read mark schemes](/blog/how-to-read-a-cambridge-mark-scheme)
- [Economics essay marking](/blog/marking-a-level-economics-essays-at-home)
- [Self-marking mistakes](/blog/common-mistakes-self-marking-past-papers)

## Bottom line

Command words are free marks for students who **plan before they write**. Train that habit on every past-paper question you mark this week.
`,
  },
  {
    slug: 'fixing-silly-mistakes-cambridge-past-papers',
    body: `---
title: Fixing “silly mistakes” on Cambridge past papers (they are usually patterns)
description: Why careless errors repeat, how to classify them in a mark log, and drills that cut lost marks without more content revision.
date: 2026-04-10
keywords: silly mistakes A-Level, exam careless errors, past paper mistakes, lose marks maths, revision mistakes
---

“Silly mistake” is what we call an error we do not want to fix properly. Examiners call it **lost marks** — and they add up.

## Silly mistakes are usually one of these

| Type | Example | Fix |
|------|---------|-----|
| **Reading** | Misread “not” / wrong graph axis | Highlight command + values before working |
| **Process** | Skipped working, no M marks | Box working habit |
| **Transfer** | Correct in rough, wrong on answer line | 10-second line check |
| **Time** | Rushed final part | Paper timing drills |
| **Concept gap** | You call it silly — scheme calls it wrong physics | Honest relabelling → topic drill |

Only the last row needs new teaching. The rest need **systems**.

## The mark log that kills sillies

After every marked question, one line:

\`\`\`text
Q3(b) −2 — read graph as % not absolute (reading)
\`\`\`

Review weekly. If “reading” appears five times, your fix is not “be careful” — it is a **pre-flight checklist**.

## Pre-flight checklist (stick on desk)

- Command word circled?  
- Units / axes labelled?  
- Any “not”, “except”, “minimum”?  
- Working shown for M marks?  
- Final line matches rough?  

Use it on **every** calculation and data question for two weeks — sillies drop or you discover they were concept gaps.

## Timing drill (20 minutes)

- One past-paper section, hard stop at time  
- Mark immediately  
- Only redo questions where error type = reading/process/transfer  

No new content that session — behaviour only.

## When MarkScheme helps

Upload the question you labelled “silly” — if feedback cites **scheme wording** you missed, it was never silly. Fix the vocabulary.

## Frequently asked questions

### Do silly mistakes mean I do not need more revision?

They mean you need **both** — systems now, content where the log says concept gap.

### Parents say I am careless — are they right?

Sometimes — often the log shows **repeatable** fixable habits. Show them the log.

## What to read next

- [Self-marking guide](/blog/how-to-mark-cambridge-past-papers-yourself)
- [Grade boundaries](/blog/cambridge-grade-boundaries-past-papers)
- [Command words](/blog/cambridge-command-words-past-papers-guide)

## Bottom line

Stop saying “silly.” Start naming the **error type** and running the checklist until the log goes quiet — that is how past-paper marks come back.
`,
  },
]

for (const { slug, body } of POSTS) {
  const file = path.join(BLOG_DIR, `${slug}.md`)
  if (fs.existsSync(file) && !force) {
    console.log('skip:', slug)
    continue
  }
  fs.writeFileSync(file, body.trim() + '\n', 'utf8')
  console.log('wrote:', slug)
}

console.log('done —', POSTS.length, 'SEO posts')
