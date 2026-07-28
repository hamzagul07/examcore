---
title: "IB Computer Science Extended Essay: Topics & RQs"
description: How to choose an IB Computer Science Extended Essay topic centred on real CS theory, with example research questions, methodology, pitfalls, and marking.
date: 2026-07-16
keywords: IB Computer Science Extended Essay, IB CS EE topics, Computer Science EE research questions, IB CS EE ideas, Computer Science Extended Essay examples, IB EE computer science
category: study-skills
author: hassan
updated: 2026-07-16
informationGain: synthesis
board: IB
subject: computer-science
---

A strong Computer Science Extended Essay research question analyses a **genuine computing problem using CS theory** — algorithms, data structures, complexity, or performance — and compares approaches with methodology and evidence. It is *not* "I built an app." The best questions take the shape *"To what extent does [approach A] outperform [approach B] for [computational problem] under [conditions]?"* — a measurable, computational question you can investigate with benchmarks, complexity analysis, or model evaluation. This post is a topic-selection bank for the CS EE; for the criteria mechanics and word-count strategy it links to the full EE guide rather than repeating them.

## Computer Science EE vs CS IA — what actually differs

Both are original, but they reward opposite instincts. The [Computer Science IA](/blog/ib-computer-science-ia-guide) is a **product** built for a real client — you scope, design, develop, and test a working solution, and functionality is marked directly. Building something that works is the point.

The Extended Essay is the reverse. It is a **4,000-word research essay** that must *analyse* a computing problem, not merely solve it. A polished app with no investigation scores poorly; a modest program that lets you rigorously compare, say, two sorting algorithms or two machine-learning models scores well. The CS EE is marked externally against the generic EE criteria and — with TOK — is worth up to **3 bonus diploma points**. In short: the IA rewards a build, the EE rewards an argument backed by evidence.

## What makes a strong Computer Science EE research question

Every CS EE that scores well shares four features:

- **Computational.** The question is about computing itself — efficiency, accuracy, scalability, complexity — not about a product's features or a user's convenience.
- **Comparative or evaluative.** You compare or evaluate approaches (algorithms, data structures, models, architectures) rather than describing one implementation.
- **Grounded in CS theory.** Big-O complexity, data-structure properties, or model evaluation metrics frame the investigation, so your results mean something.
- **Measurable with evidence.** You can benchmark, profile, or test systematically and report quantitative results — runtime, memory, accuracy, throughput — with controlled conditions.

The trap is a "build write-up" dressed as research: *"How I made a school timetabling app."* Reframed as *"How does a genetic algorithm compare with constraint propagation for solving school timetabling under increasing class counts?"* it becomes a real EE.

## How to narrow a broad interest into a research question

Start from a topic you find interesting, then funnel it until it becomes a computational comparison you can measure:

1. **Broad interest:** machine learning.
2. **Problem domain:** image classification.
3. **Approaches to compare:** a convolutional neural network vs a support-vector machine.
4. **Measurable outcome:** classification accuracy and training time.
5. **Controlled condition:** the same dataset and training-set size.
6. **RQ:** *To what extent does a convolutional neural network outperform a support-vector machine in accuracy and training time on handwritten-digit classification as training-set size increases?*

Run this funnel on two or three interests, then pick the one where you can actually run the comparison with tools and data you have, and where CS theory gives you something to predict and explain.

## Example research questions: too broad to sharpened

The most common examiner complaint is a question that is a product pitch or far too wide. Here is how vague ideas become defensible, computational RQs — notice each sharpened version names approaches to compare, a metric, and a condition.

| Too broad ❌ | Sharpened ✅ |
| --- | --- |
| How do I build a chat app? | To what extent does a WebSocket protocol reduce message latency compared with HTTP polling as concurrent client count increases? |
| Which sorting algorithm is best? | How do quicksort and merge sort compare in runtime and comparison count on nearly-sorted versus random integer arrays of increasing size? |
| Is AI good at recognising images? | To what extent does image resolution affect the classification accuracy and inference time of a convolutional neural network on a fixed dataset? |
| How does a database work? | How does a B-tree index compare with a hash index for range-query response time as table row count increases? |
| How can I make my game faster? | To what extent does a quadtree reduce collision-detection time compared with brute-force pairwise checking as the number of on-screen objects grows? |
| Which language is fastest? | How do an iterative and a memoised recursive implementation compare in runtime and memory when computing Fibonacci numbers of increasing size? |

Each sharpened RQ gives you a clear metric to benchmark, a variable to scale, and a complexity result from theory to compare your measurements against.

## Methodology and pitfalls

A CS EE is judged on how rigorously you gather and interpret evidence. Whether you benchmark algorithms or evaluate models, plan these before you start:

- **A controlled test harness.** Same hardware, same inputs, same warm-up, repeated runs averaged. One inconsistent variable and your comparison is meaningless.
- **Meaningful metrics.** Choose metrics that fit the question — wall-clock time, operation counts, memory, accuracy, precision/recall — and justify why.
- **Scaling the input.** Vary input size or load across a wide range so trends emerge, then compare the observed curve with the theoretical complexity (e.g. does your quicksort really trend O(n log n)?).
- **Theory as the backbone.** Frame predictions with Big-O analysis or model theory, then explain where measurements match or diverge — that gap is your critical-thinking material.

The pitfalls examiners see repeatedly:

- **A pure product build with no analysis** — the single most common failure. If the essay is a development log, it is an IA, not an EE.
- **Comparing nothing** — describing one algorithm or one model without a benchmark or alternative to weigh it against.
- **Uncontrolled benchmarks** — a single run, background processes uncontrolled, or inputs that differ between approaches.
- **Theory-free results** — numbers with no complexity analysis or model reasoning to explain them.

Secondary-data and modelling studies count fully, as long as you do original computational analysis rather than summarising other people's benchmarks.

## How the Extended Essay is marked

The EE is marked externally against **five criteria** totalling roughly **34 marks**, converted to a letter grade from **A to E**:

- **A — Focus and method:** a sharp, computational research question and a sound, controlled methodology.
- **B — Knowledge and understanding:** accurate CS theory — complexity, data structures, model concepts — grounded in real sources.
- **C — Critical thinking:** analysis, comparison, and evaluation of your results against theory.
- **D — Presentation:** structure, citation, figures and tables, and staying within the 4,000-word limit.
- **E — Engagement:** your reflections in the RPPF (Reflections on Planning and Progress Form).

Your EE grade combines with TOK to award **up to 3 bonus diploma points**. You will work with a **subject-qualified supervisor**, so choosing Computer Science means a CS teacher supervises you. For the band-by-band detail and RPPF strategy, read the [complete Extended Essay guide](/blog/ib-extended-essay-complete-guide) and cross-check the assessment language in [IB markbands explained](/blog/ib-markbands-explained).

## How MarkScheme helps

Draft your research question, methodology, and analysis, then check the wording against IB assessment language rather than guessing what "sufficient" means. [Get a draft section marked](/mark?subject=ib-computer-science-hl) for criterion-style feedback, and shore up the underlying theory with the free [IB Computer Science HL course](/ib/courses/computer-science-hl) or [Computer Science SL course](/ib/courses/computer-science-sl). If you are aiming for the top band, pair this with [how to get a 7 in IB Computer Science](/blog/ib-computer-science-how-to-get-a-7), and browse the wider [IB guides hub](/guides/ib) for related subjects. Considering a different subject? See the sibling [Physics EE topics](/blog/ib-extended-essay-physics-topics) and [Biology EE topics](/blog/ib-extended-essay-biology-topics) posts.

## Frequently asked questions

### Can my Computer Science EE be about an app I built?

Only if the app is the vehicle for analysis, not the point of it. A build with no comparison or evaluation reads as an IA. Reframe it around a computational question — comparing algorithms, data structures, or models with evidence — and the same code can support a strong EE.

### What counts as "CS theory" for the EE?

Algorithms and their complexity (Big-O), data structures and their trade-offs, computability, and machine-learning or model-evaluation concepts. The theory should frame your predictions so your benchmarks and results mean something beyond raw numbers.

### Do I need to write a lot of code?

Not necessarily. You need enough code to run a controlled, repeatable comparison and gather evidence. A short, well-instrumented benchmark harness often beats a large application, because the marks come from analysis, not lines written.

### How do I keep my benchmarks fair?

Fix everything except the variable under study: same hardware, same inputs, same warm-up, and average repeated runs. Then scale the input across a wide range so trends appear and can be compared with the theoretical complexity.

### Should my EE topic match my HL subject?

It is recommended but not required — you need a subject-qualified supervisor. Choosing Computer Science while taking it at HL means a CS teacher can supervise and your deeper theory shows in Criterion B.

## Bottom line

Pick a computing problem you find genuinely interesting, funnel it into a comparison or evaluation you can measure, and anchor it in CS theory so your results mean something. Control your benchmarks, scale your inputs, and let the gap between prediction and measurement drive your analysis — that is where the marks are. When your question is ready, work through the [complete Extended Essay guide](/blog/ib-extended-essay-complete-guide) for criteria and structure, then [get a draft marked](/mark?subject=ib-computer-science-hl) before your supervisor deadline.
