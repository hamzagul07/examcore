#!/usr/bin/env node
/**
 * Build published Paper 5 supplementary lesson from pilot + Senpai WAL notes.
 *   node scripts/build-paper5-lesson.mjs
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const PROJECT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const pilotPath = path.join(
  PROJECT,
  'content/courses/9702/paper-5/1-3-errors-and-uncertainties.pilot.json'
)
const dest = path.join(PROJECT, 'content/courses/9702/paper-5-planning-and-analysis.json')

const pilot = JSON.parse(fs.readFileSync(pilotPath, 'utf8'))

const q1Heading = {
  type: 'heading',
  content: 'Paper 5 Question 1 — Planning an experiment',
}
const q1Text = {
  type: 'text',
  content:
    'Question 1 (15 marks) asks you to **plan** a laboratory experiment from scratch. Examiners expect a labelled diagram, clear procedure, controlled variables, data analysis strategy, and safety notes. Structure your answer in short bullet points — not an essay. Always state which quantity is independent and which is dependent, and explain how a graph (often a log–log plot) will yield the constants in the suggested relationship.',
}
const q2Heading = {
  type: 'heading',
  content: 'Paper 5 Question 2 — Analysis with error bars and WAL',
}
const q2Text = {
  type: 'text',
  content:
    'Question 2 is where Senpai Corner’s **Worst Acceptable Line (WAL)** method matters. After calculating derived columns (e.g. $1/I$, $\\lg T$) with uncertainties, you plot the graph with **error bars**, draw the **line of best fit (LOBF)**, then draw one **WAL** — the steepest or shallowest straight line that still passes through every error bar. Gradient uncertainty is $|m_{\\text{LOBF}} - m_{\\text{WAL}}|$. Intercept uncertainty uses the same idea with the WAL intercept. This is stricter than “eyeballing” a spread — every error bar must be touched.',
}
const senpaiRef = {
  type: 'resources',
  items: [
    {
      label: 'Senpai Corner — A Level Physics notes (Paper 5 section)',
      href: 'https://www.senpaicorner.com/cie-a-levels-physics-2025-2027-notes',
    },
    {
      label: 'Mark Paper 5 past papers',
      href: '/mark?subject=9702&paper=9702%2F52',
    },
  ],
}

const sections = [...pilot.sections]
const graphIdx = sections.findIndex(
  (s) => s.type === 'heading' && s.content === 'Uncertainties in Graphical Analysis'
)
if (graphIdx >= 0) {
  sections.splice(graphIdx, 0, q1Heading, q1Text)
}
const keyIdx = sections.findIndex(
  (s) =>
    s.type === 'keyPoints' &&
    s.items?.some((i) => i.includes('worst acceptable line'))
)
if (keyIdx >= 0) {
  sections.splice(keyIdx + 1, 0, q2Heading, q2Text)
}
if (!sections.some((s) => s.type === 'resources')) {
  sections.push(senpaiRef)
}

const lesson = {
  ...pilot,
  slug: 'paper-5-planning-and-analysis',
  topicCode: 'P5',
  title: 'Paper 5 Planning, Analysis & Evaluation',
  paper: 'P5',
  paperName: 'Paper 5 Planning, Analysis and Evaluation',
  paperNumber: '5',
  paperType: 'structured',
  status: 'premium',
  summary:
    'Paper 5 — planning experiments (Q1), error-bar graphs, lines of best fit, and Worst Acceptable Lines (Q2). Senpai Corner techniques with real 9702/52 mark-scheme worked examples.',
  durationMin: 35,
  generatorVersion: 'senpai-published-1',
  updated: new Date().toISOString().slice(0, 10),
  simpleExplanation: {
    title: 'Two halves of Paper 5',
    summary:
      'Question 1 is design: sketch the kit, control variables, and say how your graph extracts constants. Question 2 is analysis: propagate uncertainties, plot error bars, draw LOBF + WAL, then quote gradient and intercept with absolute uncertainty.',
    analogy:
      'Think of LOBF as your best estimate and WAL as the “still acceptable” extreme. The gap between them is your uncertainty budget — examiners reward showing both lines clearly labelled on the graph.',
    steps: [
      'Q1: Diagram → procedure → variables held constant → graph to plot → how constants come from gradient/intercept.',
      'Q2(b): Fill table columns including absolute uncertainties in derived quantities.',
      'Q2(c)(i): Plot points with vertical error bars.',
      'Q2(c)(ii): LOBF + one WAL, both labelled.',
      'Q2(c)(iii–iv): Large triangle for gradient; uncertainty = |best − worst|.',
    ],
  },
  flashcards: [
    {
      front: 'What is a Worst Acceptable Line (WAL)?',
      back: 'The steepest or shallowest straight line that still passes through all error bars on the graph.',
    },
    {
      front: 'How do you find gradient uncertainty from a graph?',
      back: '$\\Delta m = |m_{\\text{LOBF}} - m_{\\text{WAL}}|$ using a large triangle (≥ half the line length).',
    },
    {
      front: 'What must Paper 5 Q1 include?',
      back: 'Labelled diagram, procedure, measurements, control of variables, data analysis, safety.',
    },
    {
      front: 'Uncertainty in $y = 1/x$?',
      back: '$\\Delta y = \\Delta x / x^2$ (same fractional uncertainty as $x$).',
    },
    {
      front: 'Uncertainty in $y = \\lg x$?',
      back: '$\\Delta y = \\lg(x + \\Delta x) - \\lg(x)$ (or equivalent range method).',
    },
  ],
  sections,
}

delete lesson.generatedAt
delete lesson.sourceQuestionId

fs.writeFileSync(dest, `${JSON.stringify(lesson, null, 2)}\n`)
console.log(`Wrote ${dest}`)
