/**
 * Instagram post content for @markscheme.
 *
 * Voice rule: we speak as the examiner, never as a peer. No motivation, no
 * "you've got this" — only marks, and exactly where they went.
 *
 * Difficulty rule: every question here must be one a GOOD student gets wrong.
 * A2 and HL, not AS. If a competent candidate would score full marks without
 * thinking, it is not worth a post — the whole authority of this account rests
 * on picking questions that humble people.
 *
 * Anything asserting a *published fact* (a real grade boundary, a real examiner
 * report quote) is left as a VERIFY slot. Fill those from your own data before
 * posting. Everything else is subject content, safe to post as-is.
 */

export const VERIFY = 'VERIFY_ME' as const

/** Examiner mark in the right margin of the script. */
export type Annotation = {
  text: string
  /** Degrees of tilt — a real pen is never level. */
  rotate?: number
  /** Ticks render green, everything else oxblood. */
  tone?: 'ink' | 'tick'
}

type Base = {
  slug: string
  /** Instagram caption, ready to paste. */
  caption: string
  /** Set when the post contains a fact you must confirm before publishing. */
  verify?: string
}

export type AutopsyPost = Base & {
  kind: 'autopsy'
  code: string
  qualification: string
  paper: string
  question: string
  marks: number
  scored: number
  /** The student's script, one array entry per written line. */
  answer: string[]
  annotations: Annotation[]
  /** Six words or fewer — this is the hook under the score. */
  verdict: string
  /** What the scheme actually rewarded. */
  fix: string[]
}

export type ComparePost = Base & {
  kind: 'compare'
  code: string
  qualification: string
  question: string
  marks: number
  left: { label: string; answer: string[]; scored: number }
  right: { label: string; answer: string[]; scored: number }
  /** The one behaviour that separates them. */
  difference: string
}

export type DecoderPost = Base & {
  kind: 'decoder'
  qualification: string
  title: string
  columns: { word: string; wants: string; trap: string }[]
}

export type BoundaryPost = Base & {
  kind: 'boundary'
  code: string
  qualification: string
  paper: string
  session: string
  grade: string
  mark: number | typeof VERIFY
  total: number | typeof VERIFY
  note: string
}

export type QuotePost = Base & {
  kind: 'quote'
  source: string
  quote: string
  takeaway: string
}

export type ManifestoPost = Base & {
  kind: 'manifesto'
  headline: string
  body: string
  lines: { k: string; v: string }[]
}

/**
 * Community discussion prompt. The headline is the hook, `context` is the fact
 * that earns the post its place (never just "come chat"), and `prompts` tell
 * people exactly what to type — an open invitation gets no replies.
 */
export type ThreadPost = Base & {
  kind: 'thread'
  when: string
  eyebrow: string
  headline: string
  context: string
  prompts: string[]
  cta: string
}

export type InvitePost = Base & {
  kind: 'invite'
  headline: string
  sub: string
  steps: string[]
}

export type Post =
  | AutopsyPost
  | ComparePost
  | DecoderPost
  | BoundaryPost
  | QuotePost
  | ManifestoPost
  | ThreadPost
  | InvitePost

/* ------------------------------------------------------------------ */
/* The opening grid — post in this order. Pin 00.                      */
/* ------------------------------------------------------------------ */

export const POSTS: Post[] = [
  {
    kind: 'manifesto',
    slug: '00-manifesto',
    headline: 'Every mark you lost had a reason.',
    body:
      'Nobody ever tells you what it was. Your paper comes back with a number on it and the reasoning stays inside the examiner’s head.',
    // Keys stay short — they sit in a fixed column and must not wrap.
    lines: [
      { k: 'Daily', v: 'One real answer, marked against the real scheme' },
      { k: 'Never', v: 'Revision tips, aesthetics, motivation' },
      { k: 'Audience', v: 'A2 and HL students who are already good' },
    ],
    caption: `Every mark you lost had a reason.

Nobody ever tells you what it was. The paper comes back with a number on it, and the reasoning — the actual sentence the examiner was waiting for — stays inside their head.

This account opens the head.

One real answer a day. Marked against the real scheme. Every missed mark named, in the examiner's language, with the exact words that would have earned it.

No revision tips. No study aesthetics. No motivation. If you want someone to tell you that you can do it, there are four thousand accounts for that.

If you want to know why you got 14 and not 18, stay.

#alevel #ib #caie #edexcel #alevels #ibdp #examtips #markscheme`,
  },
  {
    kind: 'autopsy',
    slug: '01-maths-lost-roots',
    code: '9709',
    qualification: 'A Level Mathematics',
    paper: 'Pure 3',
    question: 'Solve sin 2x = sin x for 0 ≤ x ≤ 2π, giving answers in terms of π.',
    marks: 5,
    scored: 3,
    answer: [
      'sin 2x = sin x',
      'Using the double angle formula,',
      '2 sin x cos x = sin x',
      'Divide both sides by sin x :',
      '2 cos x = 1',
      'cos x = ½',
      'x = π/3',
      'cos is also positive in the 4th quadrant,',
      'so x = 2π − π/3 = 5π/3',
      'x = π/3 , 5π/3',
    ],
    annotations: [
      { text: 'identity ✓', rotate: -3, tone: 'tick' },
      { text: 'you divided by sin x', rotate: -1 },
      { text: 'that deletes 3 roots', rotate: 2 },
    ],
    verdict: 'Three roots deleted in one line.',
    fix: [
      'Never divide by a variable expression — factorise',
      'sin x (2 cos x − 1) = 0',
      'sin x = 0 gives x = 0, π, 2π',
      'Full set: 0, π/3, π, 5π/3, 2π',
    ],
    caption: `3 out of 5, and every line is algebraically correct.

Line 3 is where it dies. Dividing both sides by sin x is legal arithmetic and illegal mathematics — because sin x can be zero, and the moment you divide by it you erase every root where it is.

x = 0, x = π and x = 2π were all solutions. They were deleted silently, in one step, by a student who was doing everything else right.

Factorise. Never divide. sin x (2 cos x − 1) = 0 keeps both families alive.

This one line costs more marks in P3 than most whole chapters.

#alevel #maths #9709 #puremaths #caie #alevelmaths #trigonometry`,
  },
  {
    kind: 'autopsy',
    slug: '02-ib-induction',
    code: 'Maths AA HL',
    qualification: 'IB Diploma',
    paper: 'Paper 1 · Proof',
    question:
      'Prove by mathematical induction that 7ⁿ − 1 is divisible by 6 for all n ∈ ℤ⁺.',
    marks: 7,
    scored: 5,
    answer: [
      'n = 1 :  7¹ − 1 = 6, which is divisible by 6.',
      'So the statement is true for n = 1.',
      'Assume true for n = k :',
      '7ᵏ − 1 = 6m,  where m is an integer',
      'so  7ᵏ = 6m + 1',
      'Consider n = k + 1 :',
      '7ᵏ⁺¹ − 1 = 7 · 7ᵏ − 1',
      '= 7(6m + 1) − 1',
      '= 42m + 7 − 1',
      '= 42m + 6',
      '= 6(7m + 1)',
      '7m + 1 is an integer, so this is',
      'divisible by 6.',
      'So it works for n = k + 1.',
      'Proved.',
    ],
    annotations: [
      { text: 'base case ✓', rotate: -3, tone: 'tick' },
      { text: 'algebra ✓', rotate: -1, tone: 'tick' },
      { text: '“Proved” is not a conclusion', rotate: 2 },
    ],
    verdict: 'Perfect proof. Missing final sentence.',
    fix: [
      'The final R1 is a sentence, not a result',
      'True for n = 1, and true for k ⟹ true for k + 1',
      'Therefore by mathematical induction, true for all n ∈ ℤ⁺',
      'Write it every time — it is a free mark',
    ],
    caption: `5 out of 7. The mathematics is flawless.

IB does not award the last marks for the algebra. It awards them for the logic — and the logic lives in a sentence most candidates never write.

"So it works for n = k+1. Proved." is where strong students stop. The examiner is holding an R1 for this instead:

"Since the statement is true for n = 1, and truth for n = k implies truth for n = k+1, by the principle of mathematical induction it is true for all n ∈ ℤ⁺."

You already did the hard part. The mark is in the sentence. Write the sentence.

#ibdp #ib #mathsaa #hl #ibmaths #proofbyinduction #ibexams`,
  },
  {
    kind: 'autopsy',
    slug: '03-chem-kc-value',
    code: '9701',
    qualification: 'A Level Chemistry',
    paper: 'A2 · Equilibria',
    question:
      'The forward reaction is exothermic. State and explain the effect of increasing temperature on the value of Kc.',
    marks: 3,
    scored: 1,
    answer: [
      'Increasing the temperature will shift the',
      'position of equilibrium in the endothermic',
      'direction, which is the backward reaction,',
      'because the forward reaction is exothermic.',
      'This means that less product will be formed',
      'and there will be more reactant present at',
      'equilibrium, so the yield of the product',
      'decreases when the temperature is raised.',
    ],
    annotations: [
      { text: 'direction ✓', rotate: -3, tone: 'tick' },
      { text: 'the VALUE of Kc?', rotate: -1 },
      { text: 'question not answered', rotate: 2 },
    ],
    verdict: 'Answered position. Was asked value.',
    fix: [
      'State it: Kc decreases',
      'Heating favours the endothermic reverse reaction',
      '[products] fall and [reactants] rise',
      'Kc = [products]/[reactants], so Kc falls',
    ],
    caption: `1 out of 3, for an answer that is completely true.

The candidate explained the shift in the position of equilibrium. Beautifully. The question asked about the value of Kc.

Those are different objects, and A2 chemistry separates them on purpose. Position moves with concentration, pressure and temperature. The value of Kc moves with temperature and nothing else — not pressure, not concentration, not a catalyst.

So the first three words of the answer had to be "Kc decreases." Everything after that is the explanation.

If a question names a quantity, your first sentence names that quantity.

#alevel #chemistry #9701 #caie #alevelchemistry #equilibrium #a2chemistry`,
  },
  {
    kind: 'autopsy',
    slug: '04-physics-grav-potential',
    code: '9702',
    qualification: 'A Level Physics',
    paper: 'A2 · Gravitation',
    question: 'Explain why gravitational potential is always negative.',
    marks: 3,
    scored: 1,
    answer: [
      'Gravitational potential is always negative',
      'because the gravitational force is always',
      'an attractive force and never a repulsive',
      'one. As a mass moves closer to another mass',
      'the potential becomes more and more',
      'negative, and it can never become positive',
      'because gravity can never push two masses',
      'apart from each other.',
    ],
    annotations: [
      { text: 'attractive ✓', rotate: -3, tone: 'tick' },
      { text: 'negative relative to what?', rotate: -1 },
      { text: 'no work-done argument', rotate: 2 },
    ],
    verdict: 'No zero defined. No work done.',
    fix: [
      'Potential is defined as zero at infinity',
      'The field is attractive, so it does work on a mass moving in',
      'Energy is released, so the mass ends below the zero point',
      'Therefore potential at any finite distance is negative',
    ],
    caption: `1 out of 3. This is the question that separates an A from an A*.

"Gravity is attractive" is a fact, not an explanation. Negative means below zero — so the examiner's first question is: zero where?

The answer has three moving parts and you need all three.

Potential is defined as zero at infinity. The field is attractive, so as a mass moves in from infinity the field does work on it and energy is released. Ending below the point you called zero means the potential there is negative.

Every negative quantity in physics is negative relative to a defined zero. Name the zero, and the explanation writes itself.

#alevel #physics #9702 #caie #alevelphysics #gravitation #a2physics`,
  },
  {
    kind: 'autopsy',
    slug: '05-bio-chi-squared',
    code: '9700',
    qualification: 'A Level Biology',
    paper: 'A2 · Statistics',
    question:
      'χ² was calculated as 7.82 with 3 degrees of freedom. State the conclusion that should be drawn.',
    marks: 3,
    scored: 1,
    answer: [
      'The calculated chi-squared value of 7.82 is',
      'a high value, which shows that there is a',
      'big difference between the observed results',
      'and the expected results. This difference is',
      'therefore significant and it is not due to',
      'chance, and so the null hypothesis should be',
      'rejected.',
    ],
    annotations: [
      { text: 'rejects null ✓', rotate: -3, tone: 'tick' },
      { text: '“high” compared to what?', rotate: -1 },
      { text: 'no critical value, no p', rotate: 2 },
    ],
    verdict: 'Right conclusion. No evidence for it.',
    fix: [
      'At 3 degrees of freedom, critical value at p = 0.05 is 7.81',
      '7.82 exceeds 7.81',
      'So the difference is significant at the 5% level',
      'Reject the null hypothesis — difference is not due to chance',
    ],
    caption: `1 out of 3, and the conclusion is correct.

"High" is not a statistical statement. High compared to what? A χ² of 7.82 is enormous at 1 degree of freedom and not quite significant at 4. The number alone means nothing until you pair it with the degrees of freedom.

At 3 df, the critical value at p = 0.05 is 7.81. The calculated value is 7.82. It clears it — by one hundredth.

That is the whole answer: quote the critical value, quote the probability level, make the comparison, then reject.

Statistics marks are never for the number. They are for the comparison.

#alevel #biology #9700 #caie #alevelbiology #chisquared #statistics`,
  },
  {
    kind: 'compare',
    slug: '06-econ-depreciation',
    code: '9708',
    qualification: 'A Level Economics · A2',
    question:
      'Discuss whether a depreciation of a country’s currency will improve its current account.',
    marks: 12,
    // Both essays were near-identical until here. Showing only the closing
    // paragraph is honest, fits legibly, and is exactly where the marks split.
    left: {
      label: 'A · final paragraph',
      scored: 7,
      // Narrow column — keep lines to roughly 34 characters.
      answer: [
        'In conclusion, a depreciation',
        'can improve the current account',
        'because exports become cheaper',
        'and imports become more',
        'expensive, so more is exported',
        'and less imported. However it',
        'also depends on the elasticity',
        'of demand for exports and',
        'imports, and on other factors',
        'in the economy. Therefore it',
        'may or may not improve the',
        'current account, depending on',
        'the situation.',
      ],
    },
    right: {
      label: 'B · final paragraph',
      scored: 11,
      answer: [
        'In conclusion, the current',
        'account improves only if the',
        'Marshall-Lerner condition holds,',
        'that is if PEDx + PEDm > 1. In',
        'the short run demand for both',
        'is inelastic, so the deficit',
        'first widens before it narrows',
        '— the J-curve effect. Therefore',
        'a depreciation improves the',
        'current account only after a',
        'time lag, and only where demand',
        'is elastic enough to satisfy',
        'the condition.',
      ],
    },
    difference:
      'A says “it depends on elasticities”. B names the condition, names the time path, and commits.',
    caption: `Same economics. Four marks apart.

Both answers know that a depreciation cheapens exports. Both know elasticity matters. Only one is worth Level 4.

Answer A stops at "it depends on the elasticities of demand." That is awareness. It is not analysis, and the examiner cannot reward it.

Answer B names the actual condition — Marshall-Lerner, PEDx + PEDm > 1 — and then names the time path, the J-curve, where the deficit gets worse before it gets better because short-run demand is inelastic.

That is the difference between knowing that something depends on a variable and knowing the threshold it depends on.

Vague evaluation is the most expensive habit in A2 Economics.

#alevel #economics #9708 #a2economics #caie #marshalllerner #jcurve`,
  },
  {
    kind: 'decoder',
    slug: '07-ib-command-terms',
    qualification: 'IB command terms',
    title: 'Three verbs. Three different answers.',
    columns: [
      {
        word: 'Compare',
        wants: 'Similarities only.',
        trap: 'Listing differences earns nothing here. You are writing for free.',
      },
      {
        word: 'Compare and contrast',
        wants: 'Similarities and differences.',
        trap: 'Doing only one half caps you at roughly half the marks.',
      },
      {
        word: 'Distinguish',
        wants: 'Differences only, side by side.',
        trap: 'Describing each thing separately is not distinguishing them.',
      },
    ],
    caption: `Three IB command terms that look interchangeable and are not.

Compare wants similarities. Compare and contrast wants both. Distinguish wants differences, stated against each other rather than described one after the other.

Answer the wrong verb and you can write something completely correct, completely relevant, and completely unrewarded. The examiner is not being cruel — they are marking against a scheme that only lists one kind of point.

Before you write a single line, underline the verb and say out loud what it is asking for. It takes four seconds and it is worth more than an hour of revision.

#ibdp #ib #ibexams #commandterms #hl #sl #ibtips`,
  },
  {
    kind: 'boundary',
    slug: '08-boundary-reality',
    code: '9709',
    qualification: 'A Level Mathematics',
    paper: 'Paper 3 — Pure 3',
    session: VERIFY,
    grade: 'A',
    mark: VERIFY,
    total: VERIFY,
    note: 'An A has never meant getting everything right.',
    verify:
      'Pull the real session, boundary mark and paper total from your own grade-boundary data before rendering. Do not guess these.',
    caption: `You have never needed full marks. Not once.

[FILL IN: grade boundary]

That is how many marks you are allowed to lose and still take the A.

Most candidates revise as though every mark is compulsory. Then they meet one question they cannot start, panic, and lose four more marks to the panic than they ever lost to the question.

The boundary is permission. It is the examiner telling you, in advance, exactly how much you are allowed to not know.

Find your number before you sit down.

#alevel #maths #9709 #gradeboundaries #caie #alevels #examtips`,
  },
  {
    kind: 'quote',
    slug: '09-examiner-says',
    source: VERIFY,
    quote: VERIFY,
    takeaway: 'They publish what lost the marks. Almost nobody reads it.',
    verify:
      'Paste a real sentence from a published CAIE examiner report, plus the syllabus code and session as the source. Keep it to one or two sentences and attribute it — short attributed quotes are far safer than reproducing scheme text.',
    caption: `Every year the examiners write down exactly why candidates lost marks. Then they publish it. For free. And almost nobody opens it.

[FILL IN: examiner report quote]

That is not a tip from a student account. That is the person who will mark your paper, telling you in writing, in advance, what they are looking for.

Examiner reports sit on the same page as the past papers you have already downloaded a hundred times. You have scrolled past them every single time.

#caie #alevel #examinerreport #alevels #ibdp #examtips #revision`,
  },
  /* ---------------------------------------------------------------- */
  /* Results Day 2026 — community drive. Post 11–13 Aug, in this order. */
  /* Links use the results-2026 UTM set from docs/RESULTS_DAY_2026_OPS.md. */
  /* ---------------------------------------------------------------- */
  {
    kind: 'thread',
    slug: 'rd1-limbo',
    when: '11 August · results morning',
    eyebrow: 'Community · open thread',
    headline: 'Your grade is out. The boundaries are not.',
    context:
      'Cambridge threshold tables usually land around 13 August. Until they do, nobody knows how close you actually were — including the people telling you on Telegram.',
    prompts: [
      'Post your subject code and your raw marks',
      'We work out what the boundary would have to do',
      'Thread updates the morning the PDFs drop',
    ],
    cta: 'markscheme.app/community',
    caption: `Grades are out. Thresholds are not.

Cambridge component threshold tables usually follow around 13 August. So right now every "the boundary is 62 this year" you are reading is a guess, and the people posting them are as blind as you are.

Here is something you can actually do in the meantime.

Post your subject code and your raw marks in the thread. We will work out what the boundary would have to do for your grade to move, so when the real PDF drops on the 13th you already know whether to celebrate or to act.

The thread stays open all week and gets updated the morning the tables land.

→ markscheme.app/community?utm_source=instagram&utm_medium=organic&utm_campaign=results-2026

#resultsday #alevelresults #cambridge #caie #gradeboundaries #alevels #9709`,
  },
  {
    kind: 'thread',
    slug: 'rd2-remark',
    when: '11 August · afternoon',
    eyebrow: 'Community · decision thread',
    headline: 'One mark off. Is a remark worth it?',
    context:
      'EAR deadlines are short, the fee is only refunded if the grade changes, and marks can go down as well as up. This is a decision, not a coin flip.',
    prompts: [
      'Post the component and how far off you were',
      'Say what your school has advised so far',
      'People who have actually done an EAR are replying',
    ],
    cta: 'markscheme.app/community',
    caption: `One mark off a grade is the worst place to be today.

Before you request a remark, three things people keep getting wrong:

The fee is only refunded if your grade actually changes. Marks can move down, not just up — an EAR is a full re-mark, not an appeal for extra credit. And the deadline is far shorter than most students assume, so "I'll decide next week" is often the same as deciding no.

None of that means don't do it. It means decide with evidence instead of Discord theories.

Post your component and the gap in the thread. Students who have actually been through an EAR are answering — including the ones whose grade went down.

→ markscheme.app/community?utm_source=instagram&utm_medium=organic&utm_campaign=results-2026

#resultsday #alevelresults #remark #EAR #cambridge #caie #alevels`,
  },
  {
    kind: 'thread',
    slug: 'rd3-which-paper',
    when: '12 August',
    eyebrow: 'Community · name it',
    headline: 'Which paper are people still angry about?',
    context:
      'Every session has one. The paper where the room went quiet, everyone walked out saying the same thing, and the boundary is about to tell us whether it was really that bad.',
    prompts: [
      '9709 Pure 3 · 9702 Paper 4 · 9701 Paper 4',
      '9700 Paper 4 · 9708 Paper 3 · name your own',
      'Say which question did it, not just the code',
    ],
    cta: 'markscheme.app/community',
    caption: `Every session has one paper the whole cohort walks out of in silence.

This June it might be 9709 P3. It might be 9702 P4. Half the internet says one thing and half says the other, and in two days the threshold table will settle it — because a genuinely brutal paper shows up as a lower boundary, and nothing else does.

So before the numbers land: name the paper, and name the question that did it.

If enough people name the same one, that is not a vibe. That is data, and it is worth knowing whether your grade is about to be rescued by it.

→ markscheme.app/community?utm_source=instagram&utm_medium=organic&utm_campaign=results-2026

#resultsday #alevels #caie #cambridge #9709 #9702 #alevelresults`,
  },
  {
    kind: 'thread',
    slug: 'rd4-missed-offer',
    when: '11–12 August',
    eyebrow: 'Community · if it went wrong',
    headline: 'You missed the offer. What actually happens now.',
    context:
      'There are four real routes, they have different deadlines, and the worst thing you can do today is spend it reading opinions from people who have never used any of them.',
    prompts: [
      'Talk to the university before you assume it is gone',
      'EAR, adjustment, resit in October — different clocks',
      'People who took each route are in the thread',
    ],
    cta: 'markscheme.app/community',
    caption: `If today went badly, read this before you make any decision.

Missing an offer is not the same as losing a place. Universities hold places for students who come in slightly under far more often than students believe, and the phone call is free.

There are four real routes and they run on different clocks: talking to the university directly, an EAR on a component you were close on, adjustment, and a resit in the October–November series. Each one closes at a different time, and picking the wrong one because you did not know the others existed is the actual risk today.

The thread has students who took each of those routes last year. Not opinions — outcomes.

→ markscheme.app/community?utm_source=instagram&utm_medium=organic&utm_campaign=results-2026

#resultsday #alevelresults #clearing #ucas #alevels #caie #cambridge`,
  },
  {
    kind: 'thread',
    slug: 'rd5-roll-call',
    when: '11 August · all day',
    eyebrow: 'Community · roll call',
    headline: 'Post your results.',
    context:
      'Good day or bad day, it is the same thread. Nobody here is going to make it weird, and nobody is going to ask what you got if you do not want to say.',
    prompts: [
      'Subject and grade, or just the subject',
      'The one that surprised you, up or down',
      'What you are deciding this week',
    ],
    cta: 'markscheme.app/community',
    caption: `Results thread is open. Post yours.

Good day or bad day, same thread. You do not have to put a grade next to your name if you do not want to — plenty of people are just saying which subject went differently from how they expected, and that is a real conversation on its own.

If today went well, say so. Somebody scrolling this at 3am who thinks they are the only one who did fine will be glad you did.

If it did not, there is a version of this week that still works out, and there are people in here who have been through exactly that.

→ markscheme.app/community?utm_source=instagram&utm_medium=organic&utm_campaign=results-2026

#resultsday #alevelresults #alevels #caie #cambridge #edexcel`,
  },
  {
    kind: 'thread',
    slug: 'rd6-statement-codes',
    when: '11–12 August',
    eyebrow: 'Community · bring your statement',
    headline: 'Do you know what the codes on your statement actually mean?',
    context:
      'Most people cannot map the component codes on the page to the papers they sat. Until you can, you cannot make a single decision about a remark — you would be guessing which paper to spend the money on.',
    prompts: [
      'Post your component codes, cover the personal details',
      'We map each one to the paper you actually sat',
      'Then you know which one is worth appealing',
    ],
    cta: 'markscheme.app/community',
    caption: `Your statement has a row of codes on it. Do you know which paper each one was?

Most people do not, and it matters more than it sounds. A remark costs money per component. If you cannot tell which code was the paper you walked out of feeling sick about, you are picking blind — and quite a lot of students end up paying to re-mark the paper they actually did well on.

Post your codes in the thread and we will map them to the papers you sat. Cover your name and candidate number first, obviously.

Then you can decide which one, if any, is worth it.

→ markscheme.app/community?utm_source=instagram&utm_medium=organic&utm_campaign=results-2026

#resultsday #alevelresults #cambridge #caie #remark #alevels`,
  },
  {
    kind: 'thread',
    slug: 'rd7-edexcel-ums',
    when: '11–12 August',
    eyebrow: 'Community · Edexcel IAL',
    headline: 'Edexcel students: your marks do not work like theirs.',
    context:
      'IAL runs on UMS and unit cash-in, not Cambridge raw component thresholds. So a good half of the advice flying around today is for a different board and will quietly mislead you.',
    prompts: [
      'Post your unit code — WMA11, WCH12, whichever',
      'Give UMS, not the raw mark, if you have it',
      'People re-sitting single units are in the thread',
    ],
    cta: 'markscheme.app/community',
    caption: `If you are Edexcel IAL, most of today's advice is not for you.

Cambridge students are talking about raw component thresholds. IAL does not work that way — your grade comes from UMS across units and the cash-in, which is why you can resit one unit and move your overall grade without touching the rest.

It also means every "the boundary was 62" post you are reading is answering a question you did not ask.

Post your unit code and your UMS in the thread. There are people in there who have resat single units and can tell you what actually moved.

→ markscheme.app/community?utm_source=instagram&utm_medium=organic&utm_campaign=results-2026

#edexcel #ial #alevelresults #resultsday #ums #alevels`,
  },
  {
    kind: 'thread',
    slug: 'rd8-thresholds-live',
    when: '~13 August · tables drop',
    eyebrow: 'Community · thresholds live',
    headline: 'The threshold tables are out. Now you can stop guessing.',
    context:
      'Official numbers, not predictions, not a spreadsheet somebody screenshotted. This is the first moment today that you can actually tell whether you were one mark away or twenty.',
    prompts: [
      'Post your component and your raw mark',
      'We work out the exact gap, both directions',
      'One mark off changes what you should do next',
    ],
    cta: 'markscheme.app/community',
    caption: `The threshold tables are live. Everything before this was guessing.

Now the only number that matters is the gap: how far were you from the grade above, and how far from the one below. Those two distances decide completely different weeks.

One mark off is an entirely different conversation from fifteen. The first is worth a serious look at a remark. The second is worth putting your energy into the October series or the university phone call instead — and knowing which you are in is worth ten minutes.

Post your component and raw mark in the thread and we will work out both gaps.

→ markscheme.app/community?utm_source=instagram&utm_medium=organic&utm_campaign=results-2026

#gradeboundaries #resultsday #alevelresults #caie #cambridge #alevels`,
  },
  {
    kind: 'thread',
    slug: 'rd9-october-series',
    when: '13–20 August',
    eyebrow: 'Community · resit thread',
    headline: 'Thinking about the October series?',
    context:
      'Entries close well before the exams do, and schools do not always chase you about it. The people who miss out mostly miss on the paperwork, not on the decision.',
    prompts: [
      'Post the paper you are thinking of retaking',
      'Check your entry deadline with your centre this week',
      'People who resat in October last year are replying',
    ],
    cta: 'markscheme.app/community',
    caption: `If October is on your mind, the deadline will arrive before you feel ready to decide.

Entries for the Oct–Nov series close weeks before the papers, and how it gets handled depends entirely on your centre — some chase you, plenty do not. Most people who end up missing the window did not decide against it. They just ran out of days while thinking.

So: check your entry deadline with your school this week, even if you are only 50/50.

Post the paper you are considering in the thread. There are people in there who resat one component last October and can tell you honestly whether it was worth the term.

→ markscheme.app/community?utm_source=instagram&utm_medium=organic&utm_campaign=results-2026

#resit #octobernovember #alevelresults #resultsday #caie #alevels`,
  },
  {
    kind: 'thread',
    slug: 'rd10-igcse',
    when: '18 August · IGCSE day',
    eyebrow: 'Community · second wave',
    headline: 'IGCSE and O Level results land on the 18th.',
    context:
      'Same limbo as the A Level cohort had: grades first, threshold tables a couple of days later. If you are going into Year 12, these are the grades your subject choices get argued about with.',
    prompts: [
      'Post your subjects and what you are taking on',
      'Ask the people who already made that jump',
      'A Level is not just harder IGCSE — ask why',
    ],
    cta: 'markscheme.app/community',
    caption: `IGCSE and O Level results are on the 18th.

Same pattern as last week: grades first, threshold tables a couple of days behind. So if your grade is not what you wanted, wait for the numbers before you decide anything.

The more useful thread though is the next bit. These grades are about to be used to argue about your A Level subject choices, usually by people who have not sat those A Levels.

Post what you got and what you are planning to take. There are students in there one and two years ahead of you who can tell you what the actual jump is like — and it is genuinely not "IGCSE but harder" for every subject.

→ markscheme.app/community?utm_source=instagram&utm_medium=organic&utm_campaign=results-2026

#igcse #olevel #resultsday #caie #cambridge #alevels #year12`,
  },
  {
    kind: 'invite',
    slug: '10-send-it-in',
    headline: 'Send me your answer.',
    sub: 'Marked against the real scheme. Every missed mark named.',
    steps: [
      'Photograph your answer',
      'DM it with the syllabus code',
      'Get it back marked, in full',
    ],
    caption: `I mark one real answer a day, properly, against the actual scheme.

Not "looks good, add more detail." Mark by mark: what you earned, what you missed, and the exact words the scheme was waiting for.

Photograph your answer. DM it with your syllabus code. That is the whole process.

A2 and HL preferred — the harder the question, the better the post.

Best one each week goes up on the grid. Always anonymous. Never without asking you first.

#alevel #ib #ibdp #caie #edexcel #markmywork #alevels #examtips`,
  },
]
