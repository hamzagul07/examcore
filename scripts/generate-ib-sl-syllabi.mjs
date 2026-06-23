#!/usr/bin/env node
/**
 * Derive IB SL syllabus JSON files from HL sources (or hand-authored ESS).
 * Usage: node scripts/generate-ib-sl-syllabi.mjs
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const SYLLABI_DIR = path.join(ROOT, 'lib', 'syllabi')

/** @param {string} hlKey e.g. ib-economics-hl */
function loadHl(hlKey) {
  return JSON.parse(fs.readFileSync(path.join(SYLLABI_DIR, `${hlKey}.json`), 'utf8'))
}

/** @param {{ code: string; name: string; paper: string; paperName: string }[]} topics */
function remapPaperNames(topics, paperName) {
  return topics.map((t) => ({ ...t, paperName }))
}

/** @param {string} slKey */
function writeSl(slKey, data) {
  const out = path.join(SYLLABI_DIR, `${slKey}.json`)
  fs.writeFileSync(out, `${JSON.stringify(data, null, 2)}\n`)
  console.log(`wrote ${slKey}.json (${data.topics.length} topics)`)
}

function deriveFromHl(slKey, hlKey, { excludeCodes = [], excludePapers = [], note, filter }) {
  const hl = loadHl(hlKey)
  let topics = hl.topics.filter((t) => {
    if (excludeCodes.includes(t.code)) return false
    if (excludePapers.includes(t.paper)) return false
    if (filter && !filter(t)) return false
    return true
  })
  const subjectName = hl.subjectName
  const paperName = `${subjectName} SL`
  topics = remapPaperNames(topics, paperName)
  writeSl(slKey, {
    subjectCode: slKey,
    subjectName,
    level: 'Standard Level',
    syllabusYear: hl.syllabusYear,
    note,
    topics,
  })
}

function main() {
  deriveFromHl('ib-economics-sl', 'ib-economics-hl', {
    excludePapers: ['P3'],
    note: 'IB Diploma Economics SL, first assessment 2022. Units 1–4 shared with HL; no Paper 3 quantitative paper. Lessons are curated concept clusters; codes 1.1–4.8 sort in syllabus order. Factual syllabus structure only.',
  })

  deriveFromHl('ib-business-management-sl', 'ib-business-management-hl', {
    excludeCodes: ['2.5', '2.6', '3.6', '3.9', '4.3', '4.6', '5.3', '5.6', '5.7', '5.8', '5.9'],
    note: 'IB Diploma Business Management SL, first assessment 2024. Five units without HL extension topics (corporate culture, communication, budgets, efficiency ratios, sales forecasting, international marketing, lean/quality, production planning, R&D, crisis management, MIS). No Paper 3. Factual syllabus structure only.',
  })

  deriveFromHl('ib-psychology-sl', 'ib-psychology-hl', {
    excludeCodes: ['1.4', '2.4', '3.4'],
    note: 'IB Diploma Psychology SL (first assessment 2019). Three core approaches and research methods, plus all four option areas (students examine one option in depth). Excludes HL approach extensions and Paper 3 qualitative methodology. Factual syllabus structure only.',
  })

  deriveFromHl('ib-biology-sl', 'ib-biology-hl', {
    excludeCodes: ['A2.3', 'B3.3', 'C3.1', 'D2.3'],
    note: 'IB Diploma Biology SL, first assessment 2025. Themes A–D at SL depth; excludes HL-only topics (Viruses, Muscle and motility, Integration of body systems, Water potential). Factual syllabus structure only.',
  })

  deriveFromHl('ib-chemistry-sl', 'ib-chemistry-hl', {
    excludeCodes: ['R1.4'],
    note: 'IB Diploma Chemistry SL, first assessment 2025. Structure and Reactivity organising concepts; excludes HL Additional Higher Level topic R1.4 (Entropy and spontaneity). Factual syllabus structure only.',
  })

  deriveFromHl('ib-computer-science-sl', 'ib-computer-science-hl', {
    filter: (t) => {
      const unit = Number(t.code.split('.')[0])
      return unit >= 1 && unit <= 4
    },
    note: 'IB Diploma Computer Science SL. Core topics 1–4 (system fundamentals, computer organization, networks, computational thinking & programming). Excludes HL extension topics 5–7 and the OOP option (unit 8). Factual syllabus structure only.',
  })

  deriveFromHl('ib-maths-aa-sl', 'ib-maths-aa-hl', {
    excludeCodes: ['1.5', '1.6', '1.7', '1.8', '3.6', '3.7', '3.8', '3.9', '4.7', '4.8', '5.7', '5.8', '5.9', '5.10'],
    note: 'IB Diploma Mathematics: Analysis and Approaches SL, first assessment 2021. Five syllabus topics without Additional Higher Level content (proof, complex numbers, advanced vectors, Bayes/continuous RV, advanced calculus techniques, Maclaurin series). Factual syllabus structure only.',
  })

  deriveFromHl('ib-maths-ai-sl', 'ib-maths-ai-hl', {
    excludeCodes: ['1.6', '1.7', '1.8', '3.4', '3.7', '3.8', '4.8', '4.9', '4.10', '5.5', '5.6', '5.7', '5.8', '5.9'],
    note: 'IB Diploma Mathematics: Applications and Interpretation SL, first assessment 2021. Modelling and technology focus without HL extensions (eigenvalues, graph theory, advanced hypothesis testing, Markov chains, advanced calculus/ODEs). Factual syllabus structure only.',
  })

  writeSl('ib-environmental-systems-and-societies-sl', {
    subjectCode: 'ib-environmental-systems-and-societies-sl',
    subjectName: 'Environmental Systems and Societies',
    level: 'Standard Level',
    syllabusYear: 2017,
    note: 'IB Diploma ESS (SL only). Eight syllabus themes linking environmental systems and human societies. Paper 1 case study; Paper 2 essays; fieldwork feeds the IA. Curated concept clusters; factual syllabus structure only.',
    topics: [
      { code: '1.1', name: 'Foundations of environmental systems and societies', paper: 'P2', paperName: 'ESS SL' },
      { code: '2.1', name: 'Ecosystems and ecology', paper: 'P2', paperName: 'ESS SL' },
      { code: '3.1', name: 'Biodiversity and conservation', paper: 'P2', paperName: 'ESS SL' },
      { code: '4.1', name: 'Water and aquatic food production systems', paper: 'P2', paperName: 'ESS SL' },
      { code: '5.1', name: 'Soil systems and terrestrial food production', paper: 'P2', paperName: 'ESS SL' },
      { code: '6.1', name: 'Atmospheric systems and climate', paper: 'P2', paperName: 'ESS SL' },
      { code: '7.1', name: 'Climate change, energy production, and human systems', paper: 'P2', paperName: 'ESS SL' },
      { code: '8.1', name: 'Human systems and resource use', paper: 'P1', paperName: 'ESS SL' },
    ],
  })

  console.log('\nDone — register new files in lib/syllabi/ib-syllabi.ts')
}

main()
