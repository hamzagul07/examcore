#!/usr/bin/env python3
"""Build the Binomial-distribution Study-Loop pilot.

Takes the existing authored HL lesson and layers on the two new capabilities:
  - subtopics[]  : official IB (SL 4.8) sub-topic granularity
  - questionBank[]: original practice questions, each with a mark-by-mark
                    scheme + worked model answer (feeds the marking loop)

All questions/answers are ORIGINAL, authored from standard IB Math AA content
(mathematical facts are free). Writes <slug>.pilot.json alongside the source.
"""
import json, os

SRC = "/Users/hamzagul/Documents/examcore/content/courses/ib-maths-aa-hl/4-5-the-binomial-distribution.json"
OUT = SRC.replace(".json", ".pilot.json")

lesson = json.load(open(SRC))

# --- Official-granularity sub-topics (SL 4.8) ------------------------------
lesson["subtopics"] = [
    {
        "code": "SL 4.8",
        "title": "The binomial distribution as the model for n independent Bernoulli trials",
        "detail": "Recognise the conditions: a fixed number of trials n, exactly two outcomes, a constant probability of success p, and independent trials.",
    },
    {
        "code": "SL 4.8",
        "title": "Calculating $P(X=x)$, $P(X\\le x)$ and $P(X\\ge x)$",
        "detail": "Use $P(X=x)=\\binom{n}{x}p^{x}(1-p)^{\\,n-x}$ and technology for cumulative cases; convert 'at least / at most / more than' to the correct cumulative form.",
    },
    {
        "code": "SL 4.8",
        "title": "Mean and variance of the binomial distribution",
        "detail": "For $X\\sim B(n,p)$: $\\mathrm{E}(X)=np$ and $\\mathrm{Var}(X)=np(1-p)$.",
    },
    {
        "code": "SL 4.8",
        "title": "Modelling and inverse problems",
        "detail": "Set up and solve for an unknown n or p, e.g. the least n with $P(X\\ge 1)>k$.",
    },
]

# --- Original practice question bank ---------------------------------------
lesson["questionBank"] = [
    {
        "id": "sl-4-8-q1",
        "prompt": "A fair six-sided die is rolled $8$ times. Find the probability of obtaining exactly $3$ sixes.",
        "marks": 2,
        "commandTerm": "Find",
        "difficulty": "foundation",
        "syllabusRef": "SL 4.8",
        "paper": "P2",
        "calculator": True,
        "markScheme": [
            {"text": "(M1) Recognises $X\\sim B\\!\\left(8,\\tfrac{1}{6}\\right)$ and writes $\\binom{8}{3}\\left(\\tfrac{1}{6}\\right)^{3}\\left(\\tfrac{5}{6}\\right)^{5}$", "marks": 1},
            {"text": "(A1) $=0.104$ (3 s.f.)", "marks": 1},
        ],
        "modelAnswer": "Let $X$ be the number of sixes, so $X\\sim B\\!\\left(8,\\tfrac{1}{6}\\right)$.\n\n$P(X=3)=\\binom{8}{3}\\left(\\tfrac{1}{6}\\right)^{3}\\left(\\tfrac{5}{6}\\right)^{5}=56\\cdot\\tfrac{1}{216}\\cdot\\tfrac{3125}{7776}=0.104$ (3 s.f.).",
    },
    {
        "id": "sl-4-8-q2",
        "prompt": "The random variable $X$ follows a binomial distribution with $X\\sim B(10,\\,0.35)$.\n(a) Find $P(X=4)$.\n(b) Find $P(X\\ge 2)$.\n(c) Write down $\\mathrm{E}(X)$ and $\\mathrm{Var}(X)$.",
        "marks": 6,
        "commandTerm": "Find",
        "difficulty": "standard",
        "syllabusRef": "SL 4.8",
        "paper": "P2",
        "calculator": True,
        "markScheme": [
            {"text": "(a) (M1) $\\binom{10}{4}(0.35)^4(0.65)^6$", "marks": 1},
            {"text": "(a) (A1) $=0.238$ (3 s.f.)", "marks": 1},
            {"text": "(b) (M1) Uses $P(X\\ge 2)=1-P(X\\le 1)$", "marks": 1},
            {"text": "(b) (A1) $=0.914$ (3 s.f.)", "marks": 1},
            {"text": "(c) (A1) $\\mathrm{E}(X)=np=3.5$", "marks": 1},
            {"text": "(c) (A1) $\\mathrm{Var}(X)=np(1-p)=2.275$", "marks": 1},
        ],
        "modelAnswer": "(a) $P(X=4)=\\binom{10}{4}(0.35)^4(0.65)^6=0.238$ (3 s.f.).\n\n(b) $P(X\\ge 2)=1-P(X\\le 1)=1-\\big(P(X=0)+P(X=1)\\big)=1-0.0860=0.914$ (3 s.f.).\n\n(c) $\\mathrm{E}(X)=np=10\\times0.35=3.5$;  $\\mathrm{Var}(X)=np(1-p)=10\\times0.35\\times0.65=2.275$.",
    },
    {
        "id": "sl-4-8-q3",
        "prompt": "A biased coin has probability $p$ of landing heads. It is tossed $5$ times; let $X$ be the number of heads.\n(a) State two conditions needed for $X$ to follow a binomial distribution.\n(b) Given $p=\\tfrac{1}{3}$, show that $P(X=2)=\\dfrac{80}{243}$.",
        "marks": 4,
        "commandTerm": "Show that",
        "difficulty": "standard",
        "syllabusRef": "SL 4.8",
        "paper": "P1",
        "calculator": False,
        "markScheme": [
            {"text": "(a) (A1) Any valid condition (e.g. fixed number of trials $n=5$; two outcomes per trial)", "marks": 1},
            {"text": "(a) (A1) A second valid condition (constant $p$; trials independent)", "marks": 1},
            {"text": "(b) (M1) $\\binom{5}{2}\\left(\\tfrac{1}{3}\\right)^{2}\\left(\\tfrac{2}{3}\\right)^{3}$", "marks": 1},
            {"text": "(b) (A1) $=10\\cdot\\tfrac{1}{9}\\cdot\\tfrac{8}{27}=\\tfrac{80}{243}$ (AG)", "marks": 1},
        ],
        "modelAnswer": "(a) Any two of: there is a fixed number of trials ($n=5$); each trial has two outcomes (head/tail); the probability of heads $p$ is constant; the trials are independent.\n\n(b) $P(X=2)=\\binom{5}{2}\\left(\\tfrac{1}{3}\\right)^{2}\\left(\\tfrac{2}{3}\\right)^{3}=10\\cdot\\tfrac{1}{9}\\cdot\\tfrac{8}{27}=\\dfrac{80}{243}$, as required.",
    },
    {
        "id": "sl-4-8-q4",
        "prompt": "Each component produced by a machine is faulty with probability $0.08$, independently of every other component. A batch contains $n$ components. Find the least value of $n$ for which the probability that the batch contains at least one faulty component exceeds $0.95$.",
        "marks": 4,
        "commandTerm": "Find",
        "difficulty": "challenge",
        "syllabusRef": "SL 4.8",
        "paper": "P2",
        "calculator": True,
        "markScheme": [
            {"text": "(M1) Forms $1-(0.92)^{n}>0.95$", "marks": 1},
            {"text": "(M1) Rearranges to $(0.92)^{n}<0.05$", "marks": 1},
            {"text": "(A1) $n>\\dfrac{\\ln 0.05}{\\ln 0.92}=35.9\\ldots$", "marks": 1},
            {"text": "(A1) Least $n=36$", "marks": 1},
        ],
        "modelAnswer": "Let $X\\sim B(n,0.08)$ be the number of faulty components.\n\n$P(X\\ge 1)=1-(0.92)^{n}>0.95\\;\\Rightarrow\\;(0.92)^{n}<0.05$.\n\nTaking logs: $n\\ln 0.92<\\ln 0.05\\;\\Rightarrow\\;n>\\dfrac{\\ln 0.05}{\\ln 0.92}=35.9\\ldots$\n\nSince $n$ is a positive integer, the least value is $n=36$.",
    },
]

# --- Pilot bookkeeping -----------------------------------------------------
lesson["status"] = "pilot"
lesson["generatorVersion"] = "study-loop-pilot-v1"

json.dump(lesson, open(OUT, "w"), ensure_ascii=False, indent=2)

# Validate marks add up
for q in lesson["questionBank"]:
    s = sum(m["marks"] for m in q["markScheme"])
    flag = "" if s == q["marks"] else f"  <-- MISMATCH (scheme={s})"
    print(f'{q["id"]}: {q["marks"]} marks, {len(q["markScheme"])} scheme points{flag}')
print(f"\nWrote {OUT}")
print(f"subtopics={len(lesson['subtopics'])}  questionBank={len(lesson['questionBank'])}")
