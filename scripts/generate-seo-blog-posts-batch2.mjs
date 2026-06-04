/**
 * Batch 2 — more SEO guides. Run: node scripts/generate-seo-blog-posts-batch2.mjs [--force]
 */
import fs from 'fs'
import path from 'path'

const BLOG_DIR = path.join(process.cwd(), 'content', 'blog')
const force = process.argv.includes('--force')

const POSTS = [
  {
    slug: 'cambridge-past-paper-timing-strategies',
    body: `---
title: Cambridge past paper timing — how to finish without losing easy marks
description: Paper-by-paper timing tactics for Cambridge A-Level and O-Level — when to move on, how to bank marks early, and what to do in the last five minutes.
date: 2026-06-08
category: exam-technique
keywords: past paper timing, Cambridge exam time management, A-Level exam strategy, finish paper on time
---

Running out of time is not bad luck. It is usually **untrained pacing** — and it costs marks you already knew how to earn.

## Who this is for

Students who finish papers in revision but **leave questions blank** in mocks, or who rush the final section every time.

## The timing mindset examiners expect

Cambridge papers are designed so **not every candidate finishes everything**. Your job is to **maximise marks per minute**, not to attempt every line perfectly.

---

## Before the clock starts

- Read the **front page**: total marks, time, component  
- Flip through and mark **Q** numbers with mark tariffs (2, 6, 12, 20…)  
- Identify your **two highest-mark questions** — plan to reach them  

---

## Marks-per-minute rule of thumb

| Tariff | Target minutes (guide) |
|--------|-------------------------|
| 2–4 marks | 3–5 min |
| 6–8 marks | 8–12 min |
| 12–15 marks | 15–20 min |
| 20+ marks | 25–35 min + check |

If you are still on a 6-mark question after 18 minutes, **leave a structured partial answer** and move on.

---

## Three-pass method (full papers)

### Pass 1 — bank marks (40–50% of time)

Answer everything you can do **quickly**: short calculations, definitions, MCQ, familiar templates.

### Pass 2 — heavy questions (35–40%)

Long essays, multi-part maths, data response. Stick to tariffs.

### Pass 3 — salvage + check (10–15%)

Return to blanks with bullet plans. Check units, signs, command words.

---

## Subject-specific timing notes

### Maths / sciences

Show **minimal working** for M marks early — you can return if time allows.

### Essays

**Plan 4 minutes, write 16** on a 20-mark — no plan means mid-band caps.

### MCQ

Circle uncertain ones; never leave blank at the end — return in pass 3.

---

## Last five minutes checklist

- [ ] Every question has *something* relevant  
- [ ] Units on final calculation lines  
- [ ] Essay has conclusion if “evaluate/discuss”  
- [ ] MCQ grid filled  

---

## Train timing with past papers

One paper per fortnight **fully timed** in the last two months. Mark after — see [self-marking guide](/blog/how-to-mark-cambridge-past-papers-yourself).

Upload your worst-timed question to [MarkScheme](/mark) to see which **mark types** you lose when rushing.

---

## FAQ

### Should I start with the hardest question?

Usually no — bank confidence and marks first unless you are practising a specific skill.

### What if our school gives extra time?

Still practise strict timing — extra time is not guaranteed on exam day for everyone.

---

## Bottom line

Timing is a **skill**. Pass structure + honest mock marking beats hoping the clock moves slower in June.
`,
  },
  {
    slug: 'how-to-revise-cambridge-exams-in-4-weeks',
    body: `---
title: How to revise for Cambridge exams in 4 weeks (past-paper sprint)
description: A realistic four-week Cambridge revision sprint — what to cut, what to keep, and how to use mark schemes when time is short.
date: 2026-06-07
category: revision
keywords: 4 week revision plan, Cambridge exam cramming, A-Level revision schedule, last month revision
---

Four weeks is not enough to learn a syllabus from zero. It **is** enough to turn **past-paper performance** around if you are ruthless about priorities.

## Week 0 — setup (one evening)

- List entered **components** per subject  
- Download **last 3 sessions** per component  
- Create a **lost-mark log** notebook  

---

## Week 1 — diagnose

| Day | Task |
|-----|------|
| Mon–Thu | One timed question per subject, marked strict |
| Fri | Rank top 3 error types per subject |
| Weekend | Read examiner reports for those error types only |

No new content videos — **marking only**.

---

## Week 2 — fix patterns

- Morning: topic drill on #1 error type  
- Afternoon: half paper under time  
- Evening: rewrite weakest question  

See [silly mistakes guide](/blog/fixing-silly-mistakes-cambridge-past-papers).

---

## Week 3 — exam conditions

- Two **full components** per subject (alternate days)  
- Mark same evening  
- One [MarkScheme](/mark) upload per subject for second opinion  

---

## Week 4 — polish

- Light topic review — **no new topics**  
- One timed paper mid-week  
- Day before exam: sleep, formulae, command words — **no marathon paper**

---

## What to cut when time is short

- Re-reading the whole textbook  
- Highlighting notes you never use  
- Doing papers without schemes  
- Starting papers from 2010 “for volume”  

---

## FAQ

### Can I skip AS content at A2?

Only if your log shows you never lose AS marks — verify with one AS question first.

### Four subjects?

Rotate heavy papers — one full paper per subject per week maximum in weeks 3–4.

---

## Bottom line

Four weeks rewards **error-type focus + marked papers**, not panic content consumption.
`,
  },
  {
    slug: 'cambridge-igcse-past-papers-guide',
    body: `---
title: Cambridge IGCSE past papers — how they differ from A-Level & O-Level
description: IGCSE past paper labelling, mark scheme habits, and revision focus for students moving between IGCSE, O-Level, and A-Level routes.
date: 2026-06-06
category: revision
keywords: IGCSE past papers, Cambridge IGCSE revision, IGCSE mark scheme, IGCSE vs O-Level
---

IGCSE sits in the same Cambridge universe as O-Level and A-Level — but **paper codes, depth, and wording** differ. Treating them as interchangeable wastes marks.

## IGCSE vs O-Level (practical difference)

| | IGCSE | O-Level |
|---|--------|---------|
| Codes | e.g. 0580, 0625 | e.g. 4024, 5054 |
| Depth | Often broader | Often more structured national route |
| Wording | Syllabus-specific | Syllabus-specific |

Always check **your entered syllabus code** on the front of mocks.

---

## How to label papers correctly

Use **code/session/component** in your folder:

\`\`\`text
0580/2024/may/paper-2
\`\`\`

Wrong code = wrong mark scheme = false confidence.

---

## Mark scheme habits at IGCSE

- Keyword precision in sciences  
- Show working on calculations  
- Command words still matter — see [command words guide](/blog/cambridge-command-words-past-papers-guide)  

---

## Moving from IGCSE to A-Level

Expect:

- Longer questions  
- More chained method marks  
- Less “list and leave”  

Bridge with **one A-Level structured question per week** in the term before A-Level starts.

---

## Using MarkScheme

Select the **exact subject code** you sit (we support many Cambridge routes on [subjects](/subjects)). Use **Past paper** when the session is in library.

---

## FAQ

### Are IGCSE grade boundaries the same as O-Level?

No — compare within the same qualification and series.

---

## Bottom line

IGCSE revision is still **scheme-first past papers** — with the right code on the folder.
`,
  },
  {
    slug: 'understanding-error-carried-forward-ecf',
    body: `---
title: Error carried forward (ECF) — how Cambridge mark schemes rescue your marks
description: What ECF means in Cambridge maths and science marking, when it applies, and how to write working so follow-through marks survive a wrong number.
date: 2026-06-05
category: mark-schemes
keywords: error carried forward, ECF mark scheme, Cambridge maths marking, follow through marks
---

One wrong number does not always kill the whole question — **if** your later method stays consistent and the scheme allows **error carried forward (ECF)**.

## What ECF means

You make an error early (often arithmetic). Later parts use **your wrong value** correctly. Examiners award **follow-through** marks when the scheme says **ecf** or **ft**.

---

## When ECF does NOT apply

- Wrong **method** (not wrong number)  
- Wrong **physics** setup  
- You restart with the correct value mid-question without showing link  
- Scheme says **cao** (correct answer only)  

---

## How to write for ECF

1. Label intermediate results clearly (**r = 0.24**)  
2. If you know step (a) is wrong, continue (b) with **your** r and state it  
3. Do not silently switch to the back-of-book answer  

---

## Self-marking ECF

When marking, ask: *If I accept my wrong value from line 2, is line 5 logically correct?*

If yes, award the ecf marks the scheme lists.

---

## Practice on 9709 / sciences

Pick one multi-part calculation from a recent paper. Deliberately use a wrong (a) and practise marking (b) with ecf — builds exam-day calm.

---

## FAQ

### Does ECF apply to MCQ?

No — MCQ is binary.

### Can MarkScheme show ECF?

Feedback references scheme structure; always verify with the official PDF.

---

## Bottom line

ECF rewards **clear, consistent working** — not hidden corrections.
`,
  },
  {
    slug: 'cambridge-practical-papers-revision-guide',
    body: `---
title: Cambridge practical & alternative-to-practical papers — revision guide
description: How to prepare for Paper 3/5-style practical skills, common vocabulary, and marking your written practical answers against Cambridge schemes.
date: 2026-06-04
category: exam-technique
keywords: Cambridge practical paper, ATP past papers, science practical revision, Paper 3 A-Level
---

Practical papers punish vague vocabulary — **“add water”** vs **“add 25 cm³ of distilled water”** is often the difference between marks.

## What practical papers test

- Apparatus and method  
- Recording and displaying data  
- Graphs, gradients, uncertainties (where applicable)  
- Conclusion linked to data  

---

## Revision that actually helps

| Activity | Why |
|----------|-----|
| Past ATP / practical papers | Exact command words |
| Mark scheme **allow lists** | Wording bank |
| Draw tables from scratch | Layout marks |
| Practise gradients on graphs | Common A2 skill |

---

## Common lost marks

- Missing **units** on axes  
- No **repeat readings** mentioned when required  
- Conclusion not tied to **trend in data**  
- “Human error” as conclusion (examiners dislike this)  

---

## Pair with theory papers

Alternate weeks: one practical-focused session, one theory paper — do not ignore practical until May.

---

## Marking practical answers

Use the scheme’s **specific phrases**. Self-mark strict on labels.

Upload a practical write-up to [MarkScheme](/mark) with the question photo visible.

---

## Bottom line

Practical papers are **language exams in lab clothing** — learn the phrases, not just the ideas.
`,
  },
  {
    slug: 'a-level-essay-planning-past-papers',
    body: `---
title: A-Level essay planning for past papers (5 minutes that save bands)
description: A repeatable essay plan template for Cambridge humanities, economics, and social sciences — before you write under timed conditions.
date: 2026-06-03
category: exam-technique
keywords: A-Level essay plan, Cambridge essay technique, economics essay structure, history essay plan
---

The essay that wins bands is usually planned in **four minutes**, not improvised for twenty.

## The 5-minute plan template

1. **Thesis** (one sentence — answers the question)  
2. **For** — 2 points with named evidence  
3. **Against / limitation** — 1–2 points  
4. **Judgement** — depends on… (stakeholder / time / context)  

---

## Paragraph skeleton (20-mark guide)

| ¶ | Content |
|---|---------|
| 1 | Define + thesis |
| 2 | Argument A + application |
| 3 | Argument B + application |
| 4 | Counter + evaluation |
| 5 | Judgement + conclusion |

---

## Economics / business addition

- Draw **small diagram** only if you will explain it in text  
- Use **data** from the extract when provided  

---

## History / sociology addition

- Name **specific** examples (date, place, study)  
- Link back to question every ¶ — no orphan narratives  

---

## Mark your plan

After the essay, mark the plan against bands: did each bullet earn its band?

---

## Practice habit

One essay plan per week **without** full write — then one full essay fortnightly.

See [economics essay marking](/blog/marking-a-level-economics-essays-at-home).

---

## Bottom line

Plans are cheap time. Band-limited essays are expensive — plan first.
`,
  },
  {
    slug: 'cambridge-study-timetable-past-papers-template',
    body: `---
title: Cambridge study timetable template built around past papers
description: A weekly revision timetable that prioritises marking and rewrites — not passive note-reading — for multi-subject Cambridge students.
date: 2026-06-02
category: revision
keywords: revision timetable, A-Level study schedule, Cambridge revision plan, past paper schedule
---

The best timetable is not colour-coded perfection — it is **repeatable slots** where marking happens while you are still awake.

## Weekly skeleton (4 subjects example)

| Slot | Mon | Tue | Wed | Thu | Fri | Sat | Sun |
|------|-----|-----|-----|-----|-----|-----|-----|
| After school | Subj A Q | Subj B Q | Subj C Q | Subj D Q | Light review | Half paper A | Half paper B |
| 45 min evening | Mark+fix | Mark+fix | Mark+fix | Mark+fix | Off | Mark paper | Mark paper |

**Q** = one structured question timed + marked.

---

## Rules that make it work

- Marking happens **same day** as attempt  
- Only **one** full paper per subject per week in peak season  
- Sunday = planning + log review, not new content  

---

## Sync with school homework

Homework counts if you **mark it with a scheme or model rubric**. Otherwise it fills time without exam skill.

---

## 8-week exam term overlay

Replace one weekday Q slot with **full component** alternating subjects. See [4-week sprint](/blog/how-to-revise-cambridge-exams-in-4-weeks) if time is short.

---

## Bottom line

Timetables should schedule **attempt → mark → rewrite** — everything else is optional.
`,
  },
  {
    slug: 'night-before-cambridge-exam-past-paper-routine',
    body: `---
title: Night before a Cambridge exam — what to do (and what to avoid)
description: A calm pre-exam routine: light recall, packing, sleep, and why a full past paper the night before often backfires.
date: 2026-05-28
category: study-skills
keywords: night before exam, exam preparation, Cambridge exam tips, revision night before
---

The night before is for **readiness**, not **cramming**. One more panicked paper can spike anxiety without raising marks.

## Do

- Pack calculator, ID, timetable, pens — checklist  
- Skim **formula sheet** or **definitions** (20 min max)  
- Read your **lost-mark log** top three items — reminders only  
- Sleep 7–8 hours  

---

## Avoid

- Full timed paper at 11pm  
- New topics on YouTube  
- Comparing with friends’ revision volume  
- Caffeine late if you are already anxious  

---

## Light recall block (optional, 25 min)

| 5 min | Command words |
| 10 min | Five definitions from scheme wording |
| 10 min | One worked example you often miss |

---

## Morning of

- Eat normally  
- Arrive early, not with frantic new notes  
- Trust **practice already marked** in the last months  

---

## Bottom line

Exams reward **sleep + calm recall**, not midnight heroics.
`,
  },
  {
    slug: 'cambridge-mock-exams-vs-past-papers',
    body: `---
title: Mock exams vs past papers — which helps more for Cambridge?
description: When school mocks matter, how to mark them properly, and how to combine mocks with official past papers for faster improvement.
date: 2026-05-25
category: revision
keywords: mock exams Cambridge, school mocks vs past papers, A-Level mock revision, mock exam marking
---

Mocks feel high-stakes. Past papers feel “practice”. **Marking quality** matters more than the label on the front.

## What mocks give you

- Exam hall conditions  
- School timetable pressure  
- Sometimes **unfamiliar question styling**  

## What official past papers give you

- Real **mark schemes** and examiner reports  
- Known **component structure**  
- Comparable difficulty trends  

---

## How to use mocks properly

1. Sit mock under full conditions  
2. Mark with **teacher feedback** where possible  
3. Re-mark yourself with official scheme if parallel paper exists  
4. Log errors in the same notebook as past papers  

---

## When mocks mislead

- Marked only with a grade, no breakdown  
- Papers not from your **syllabus code**  
- No rewrite assigned  

Then treat mock as **timing practice only** — follow with an official paper marked strict.

---

## Combine both (8-week plan)

| Week | Mock / paper |
|------|----------------|
| 1–4 | Past papers (official) |
| 5 | School mock |
| 6–7 | Official papers on weak components |
| 8 | Light recall |

---

## Bottom line

Mocks test nerves; past papers test **scheme literacy**. Use both — mark both.
`,
  },
  {
    slug: 'top-9709-past-paper-topics-to-practise',
    body: `---
title: Top 9709 past paper topics to practise before exams (by component)
description: High-frequency Cambridge A-Level Mathematics (9709) topics across Pure, Mechanics, and Statistics — and how to prioritise past papers.
date: 2026-05-22
category: revision
keywords: 9709 revision topics, A-Level maths past papers, 9709 pure maths, Cambridge maths topics
---

9709 is vast. These topics appear **often enough** that skipping them is a gamble — prioritise by **your component list** first.

## Pure (common across routes)

- Integration (by parts, substitution)  
- Differentiation (chain, product, quotient)  
- Trigonometry (identities, equations)  
- Complex numbers (Argand, loci)  
- Vectors (lines, planes where in syllabus)  

---

## Mechanics

- Forces on inclined planes  
- Connected particles  
- Projectiles (where examined)  

---

## Probability & Statistics

- Discrete / continuous distributions  
- Hypothesis testing basics  
- Linear combinations of RVs  

---

## How to practise (not just list)

1. One **topic test** (textbook or past Q)  
2. Mark with scheme  
3. One **exam-style Q** mixing topics  

Full [9709 guide](/blog/cambridge-9709-a-level-mathematics-past-papers-guide).

---

## Use examiner reports

Search your component in the 9709 report — “candidates found difficult” is your shopping list.

---

## MarkScheme for 9709

Upload integration/mechanics working — B1/M1/A1 feedback: [Mark a paper](/mark).

---

## Bottom line

Topic lists are guides — **your log** decides what you practise this week.
`,
  },
  {
    slug: 'cambridge-data-response-questions-guide',
    body: `---
title: Cambridge data response questions — how to use the extract and score marks
description: Structure for economics, business, and geography-style data response: read the stimulus, plan points, and mark yourself against band language.
date: 2026-05-20
category: exam-technique
keywords: data response questions, Cambridge economics paper, extract questions, business studies case study
---

Data response questions are not essays about the topic — they are **answers about this extract**, with marks for using **their numbers**.

## First 3 minutes on the extract

- Circle **figures** you will cite  
- Note **trend** (up/down/volatile)  
- Who is affected (stakeholders)  

---

## Answer structure

| Step | Do |
|------|-----|
| Define | One line if helpful |
| Point | Make claim |
| Evidence | Quote data from extract |
| Explain | Because → therefore |
| Evaluate | Short judgement if tariff allows |

---

## Common failures

- Generic theory with **no data**  
- Describing the graph without **implication**  
- Ignoring second part of question  

---

## Marking

Scheme often lists **acceptable points** — tick only if your sentence matches intent.

---

## Practice

One extract question per week from 9708 / 9609 / 2281 past papers.

---

## Bottom line

Data response = **application marks** — the extract is half the answer.
`,
  },
  {
    slug: 'build-revision-notes-from-mark-schemes',
    body: `---
title: Build revision notes from mark schemes (not textbooks)
description: Turn Cambridge mark schemes and examiner reports into one-page revision notes — faster recall, exam-accurate wording.
date: 2026-05-15
category: study-skills
keywords: revision notes from mark schemes, Cambridge revision notes, examiner report notes, past paper notes
---

Textbook notes are wide. Mark schemes are **what earns marks**. Build notes from schemes and you revise **exam language**.

## One-page template per topic

### Header

Topic name + syllabus code + date updated

### Must-write phrases (5–8 bullets)

Copied from **allow** lists in schemes

### Never-write / reject (3 bullets)

From **reject** or examiner report

### Worked past-paper Q

One question number you missed — 2-line reminder

### Checklist

Command word + common trap

---

## Workflow (30 min per topic)

1. Open 2 mark schemes on same topic  
2. Highlight repeated phrases  
3. Copy into template — **no paraphrase** on definitions  
4. Close schemes — test recall next day  

---

## Pair with past papers

After sitting a question, **update** the one-page note with your personal miss.

---

## Digital option

Notion/Obsidian linked to paper codes — still one page per topic max.

---

## Bottom line

The scheme is the **answer key to the examiner’s mind** — notes should sound like it.
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

console.log('done —', POSTS.length, 'batch 2 posts')
