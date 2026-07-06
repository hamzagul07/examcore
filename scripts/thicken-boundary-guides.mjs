#!/usr/bin/env node
/** Thicken fan-out H2 sections (40+ words) on boundary guides. */
import { readFileSync, writeFileSync, readdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const BLOG = join(dirname(fileURLToPath(import.meta.url)), '..', 'content/blog')
const HUB = ' See the [grade boundaries hub](/guides/grade-boundaries) for every syllabus calculator.'

/** @type {Record<string, { label: string; level: 'A-Level' | 'O-Level' | 'IGCSE'; gradesDay: string; markTip: string; estimateExtra?: string }>} */
const META = {
  '9709': { label: 'Mathematics', level: 'A-Level', gradesDay: '11 August', markTip: 'Award **M** and **A** marks separately on every route — method marks survive wrong finals when working is valid.' },
  '9231': { label: 'Further Mathematics', level: 'A-Level', gradesDay: '11 August', markTip: 'Separate aggregate thresholds exist for **Pure+Mechanics** vs **Pure+Statistics** — never mix routes when reading the PDF.' },
  '9700': { label: 'Biology', level: 'A-Level', gradesDay: '11 August', markTip: 'Keyword-accurate definitions on structured papers drive raw marks more than boundary guesses ([insights](/insights)).' },
  '9701': { label: 'Chemistry', level: 'A-Level', gradesDay: '11 August', markTip: 'State symbols, mole ratios, and balanced equations must match the mark scheme wording on every calculation chain.' },
  '9702': { label: 'Physics', level: 'A-Level', gradesDay: '11 August', markTip: 'Units, significant figures, and shown working on graph and calculation questions determine most lost marks.' },
  '9708': { label: 'Economics', level: 'A-Level', gradesDay: '11 August', markTip: 'Essay and data-response marks need **quoted evidence** and both sides for evaluation — band descriptors, not gut feel.' },
  '9706': { label: 'Accounting', level: 'A-Level', gradesDay: '11 August', markTip: 'Ledger labels, narrative working, and ratio layouts must match the scheme — one mislabel can cascade through a question.' },
  '9084': { label: 'Law', level: 'A-Level', gradesDay: '11 August', markTip: 'Level-of-response scripts need **case authority + application** on every essay — description alone caps the band.' },
  '9489': { label: 'History', level: 'A-Level', gradesDay: '11 August', markTip: 'Source utility and essay arguments need dated evidence and judgement — mark to band descriptors, not story recall.' },
  '9699': { label: 'Sociology', level: 'A-Level', gradesDay: '11 August', markTip: 'Name the theory, apply it to the stimulus, and evaluate — generic "society" paragraphs rarely score top bands.' },
  '9990': { label: 'Psychology', level: 'A-Level', gradesDay: '11 August', markTip: 'Core studies questions need **named study + method + finding** — paraphrasing loses application marks.' },
  '9609': { label: 'Business', level: 'A-Level', gradesDay: '11 August', markTip: 'Case-study papers reward **data quotes** and balanced advantages/disadvantages tied to the business named in the stimulus.' },
  '9618': { label: 'Computer Science', level: 'A-Level', gradesDay: '11 August', markTip: 'Trace tables, logic diagrams, and precise pseudocode wording must match the scheme — partial algorithms rarely earn full marks.' },
  '9607': { label: 'Media Studies', level: 'A-Level', gradesDay: '11 August', markTip: 'Close analysis needs **media terminology** applied to specific examples — generic commentary sits in low bands.' },
  '9488': { label: 'Islamic Studies', level: 'A-Level', gradesDay: '11 August', markTip: 'Set-text answers need citation, schools-of-thought comparison, and modern-world evaluation against band descriptors.' },
  '9695': { label: 'Literature in English', level: 'A-Level', gradesDay: '11 August', markTip: 'Essays need **textual quotation** woven into argument — thematic summaries without evidence cap the band.' },
  '4024': { label: 'Mathematics', level: 'O-Level', gradesDay: '18 August', markTip: 'Calculator and non-calculator papers both reward **shown method** — skipping steps loses M marks on structured questions.' },
  '4037': { label: 'Additional Mathematics', level: 'O-Level', gradesDay: '18 August', markTip: 'Calculus and coordinate geometry chains need every differentiation/integration step shown for method credit.' },
  '5090': { label: 'Biology', level: 'O-Level', gradesDay: '18 August', markTip: 'Use exact mark-scheme vocabulary on structured answers — paraphrased definitions often score zero.' },
  '5070': { label: 'Chemistry', level: 'O-Level', gradesDay: '18 August', markTip: 'Mark equations, state symbols, and mole working strictly before estimating any grade from raw marks.' },
  '5054': { label: 'Physics', level: 'O-Level', gradesDay: '18 August', markTip: 'Award marks only when **units and working** are present on every calculation and graph question.' },
  '2281': { label: 'Economics', level: 'O-Level', gradesDay: '18 August', markTip: 'Data-response and essay marks need labelled diagrams and **both sides** when the command word asks for evaluation.' },
  '7115': { label: 'Business Studies', level: 'O-Level', gradesDay: '18 August', markTip: 'Paper 2 case questions need the **business name**, quoted stimulus figures, and balanced pros/cons.' },
  '7707': { label: 'Accounting', level: 'O-Level', gradesDay: '18 August', markTip: 'Ledger formats, labels, and ratio layouts must match Cambridge scheme wording — not textbook shortcuts.' },
  '2210': { label: 'Computer Science', level: 'O-Level', gradesDay: '18 August', markTip: 'Trace tables and logic circuits need precise terminology — half-correct algorithms rarely earn follow-through.' },
}

function replaceSection(body, heading, newContent) {
  const esc = heading.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const re = new RegExp(`(## ${esc}\\n\\n)([\\s\\S]*?)(\\n\\n## )`, 'm')
  if (re.test(body)) return body.replace(re, `$1${newContent}$3`)
  const reEnd = new RegExp(`(## ${esc}\\n\\n)([\\s\\S]*?)$`, 'm')
  return body.replace(reEnd, `$1${newContent}\n`)
}

function replaceByPrefix(body, prefix, newContent) {
  const re = new RegExp(`(## ${prefix}[\\s\\S]*?\\n\\n)([\\s\\S]*?)(\\n\\n## )`, 'm')
  if (re.test(body)) {
    const heading = body.match(new RegExp(`## ${prefix}[^\\n]*`))?.[0]?.slice(3)
    if (heading) return replaceSection(body, heading, newContent)
  }
  return body
}

function patchRelated(body, lead) {
  const bullets = body.match(/## Related subjects[\s\S]*?\n((?:- \[.*\n)+)/)?.[1]?.trim()
  if (!bullets) return body
  return body.replace(
    /## Related subjects[\s\S]*?\n\n## Bottom line/,
    `## Related subjects\n\n${lead}\n\n${bullets}\n\n## Bottom line`
  )
}

function buildCopy(code, meta) {
  const { label, level, gradesDay, markTip } = meta
  const thresholdDay = gradesDay === '11 August' ? '~13 August' : '~13 August'
  const calc = `/tools/grade-boundary-calculator/${code}`

  const what = `Grade boundaries are the minimum **raw marks** Cambridge requires for each letter grade on each component of **${code} ${label}**. They are not fixed percentages — your **overall** ${level} grade uses a weighted aggregate across the papers you entered, and each paper variant has its own row in the official PDF. Match your exact component codes from the statement of entry before comparing marks to any past session.`

  const how = `Cambridge sets **${code}** thresholds **after** all scripts are marked so each grade means the same standard every year. ${markTip} When a paper is harder than the previous June series, raw cut-offs usually **fall** — comparable outcomes, not fixed quotas. Compare only to verified **${code}** sessions ([wrong-session estimates](/insights)).`

  const estimate = `1. Complete a recent ${level} paper under timed conditions for your exact entry route.  
2. Mark strictly to the official scheme — log every lost mark before convincing yourself an answer "basically counts".  
3. Compare component raw marks to June 2024/2023 in the [${code} calculator](${calc}) until the verified June 2026 PDF loads.`

  const relatedLead =
    level === 'A-Level'
      ? `A-Level boundaries publish with **${gradesDay}** grades and **${thresholdDay}** threshold PDFs — each syllabus code is separate.${HUB}`
      : `O-Level and IGCSE grades release **${gradesDay}**; component thresholds usually drop **${thresholdDay}**. Never copy numbers between syllabus codes.${HUB}`

  const bottom = `**${code} grade boundaries 2026** publish in August — **${gradesDay}** for grades on your statement, **${thresholdDay}** for component threshold PDFs. Until then, marked past papers plus the [${code} calculator](${calc}) using June 2024/2023 beat rumour spreadsheets. Save your component codes when Cambridge publishes the official row. Your exams officer confirms entries on the statement.`

  return { what, how, estimate, relatedLead, bottom }
}

const files = readdirSync(BLOG).filter(
  (f) => f.match(/^cambridge-\d+-.*-grade-boundaries-2026\.md$/) && META[f.match(/cambridge-(\d+)/)[1]]
)

for (const file of files) {
  const code = file.match(/cambridge-(\d+)/)[1]
  const meta = META[code]
  const copy = buildCopy(code, meta)
  const path = join(BLOG, file)
  let body = readFileSync(path, 'utf8')
  body = body.replace(/updated: 2026-07-\d\d/, 'updated: 2026-07-07')

  body = replaceSection(body, 'What are grade boundaries?', copy.what)
  const howHeading = body.match(/## How Cambridge sets \d+ boundaries/)?.[0]?.slice(3)
  if (howHeading) body = replaceSection(body, howHeading, copy.how)
  body = replaceByPrefix(body, 'How to estimate your grade', copy.estimate)
  body = patchRelated(body, copy.relatedLead)
  body = replaceSection(body, 'Bottom line', copy.bottom)

  writeFileSync(path, body)
  console.log('ok', file)
}
