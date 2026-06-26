#!/usr/bin/env node
/**
 * Port premium A-Level lessons to O-Level equivalents (2281 ← 9708, 7115 ← 9609).
 * Reuses curated diagrams/embeds via visual-slug-aliases.
 *
 *   npx tsx scripts/port-olevel-premium-lessons.mjs
 *   npx tsx scripts/port-olevel-premium-lessons.mjs --dry-run
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const dryRun = process.argv.includes('--dry-run')

/** targetCode, targetTopic code, sourceCode, source lesson filename (no .json) */
const PORTS = [
  // 2281 Economics ← 9708
  ['2281', '2.3', '9708', '2-1-demand-and-supply-curves'],
  ['2281', '2.5', '9708', '2-4-the-interaction-of-demand-and-supply'],
  ['2281', '2.7', '9708', '2-2-price-elasticity-income-elasticity-and-cross-elasticity-of-demand'],
  ['2281', '2.8', '9708', '2-3-price-elasticity-of-supply'],
  ['2281', '1.4', '9708', '1-5-production-possibility-curves'],
  ['2281', '2.10', '9708', '3-1-reasons-for-government-intervention-in-markets'],
  ['2281', '4.3', '9708', '5-2-fiscal-policy'],
  ['2281', '4.8', '9708', '4-6-price-stability'],
  ['2281', '1.1', '9708', '1-1-scarcity-choice-and-opportunity-cost'],
  ['2281', '1.3', '9708', '1-1-scarcity-choice-and-opportunity-cost'],
  ['2281', '2.4', '9708', '2-1-demand-and-supply-curves'],
  ['2281', '2.11', '9708', '1-4-resource-allocation-in-different-economic-systems'],
  ['2281', '4.6', '9708', '4-4-economic-growth'],
  ['2281', '4.7', '9708', '4-5-unemployment'],
  ['2281', '5.4', '9708', '11-4-characteristics-of-countries-at-different-levels-of-development'],
  ['2281', '1.2', '9708', '1-3-factors-of-production'],
  ['2281', '2.1', '9708', '1-4-resource-allocation-in-different-economic-systems'],
  ['2281', '2.2', '9708', '2-4-the-interaction-of-demand-and-supply'],
  ['2281', '2.6', '9708', '2-4-the-interaction-of-demand-and-supply'],
  ['2281', '2.9', '9708', '1-4-resource-allocation-in-different-economic-systems'],
  ['2281', '3.1', '9708', '9-4-money-and-banking'],
  ['2281', '3.2', '9708', '7-1-utility'],
  ['2281', '3.3', '9708', '8-3-labour-market-forces-and-government-intervention'],
  ['2281', '3.4', '9708', '8-3-labour-market-forces-and-government-intervention'],
  ['2281', '3.5', '9708', '7-7-growth-and-survival-of-firms'],
  ['2281', '3.6', '9708', '7-5-types-of-cost-revenue-and-profit-short-run-and-long-run-production'],
  ['2281', '3.7', '9708', '7-8-differing-objectives-and-policies-of-firms'],
  ['2281', '3.8', '9708', '7-6-different-market-structures'],
  ['2281', '3.9', '9708', '7-6-different-market-structures'],
  ['2281', '4.1', '9708', '5-1-government-macroeconomic-policy-objectives'],
  ['2281', '4.2', '9708', '10-1-government-macroeconomic-policy-objectives'],
  ['2281', '4.4', '9708', '5-3-monetary-policy'],
  ['2281', '4.5', '9708', '5-4-supply-side-policy'],
  ['2281', '5.1', '9708', '11-3-economic-development'],
  ['2281', '5.2', '9708', '8-2-equity-and-redistribution-of-income-and-wealth'],
  ['2281', '5.3', '9708', '11-3-economic-development'],
  // 7115 Business ← 9609
  ['7115', '3.3', '9609', '3-3-1-the-elements-of-the-marketing-mix-the-4ps'],
  ['7115', '4.2', '9609', '5-4-4-break-even-analysis'],
  ['7115', '2.1', '9609', '2-2-1-motivation-as-a-tool-of-management-and-leadership'],
  ['7115', '5.3', '9609', '10-1-1-statement-of-profit-or-loss'],
  ['7115', '1.5', '9609', '1-5-1-business-stakeholders'],
  ['7115', '3.1', '9609', '3-1-1-the-role-of-marketing-and-its-relationship-with-other-business-activities'],
  ['7115', '1.3', '9609', '1-3-3-business-growth'],
  ['7115', '4.1', '9609', '4-1-1-the-transformational-process'],
  ['7115', '5.2', '9609', '5-3-1-cash-flow-forecasts'],
  ['7115', '5.4', '9609', '10-1-2-statement-of-financial-position'],
  ['7115', '2.3', '9609', '2-1-3-recruitment-and-selection'],
  ['7115', '6.3', '9609', '8-2-3-strategies-for-international-marketing'],
  ['7115', '1.1', '9609', '1-1-1-the-nature-of-business-activity'],
  ['7115', '1.2', '9609', '1-2-1-economic-sectors'],
  ['7115', '1.4', '9609', '1-2-2-business-ownership'],
  ['7115', '2.2', '9609', '7-1-2-types-of-structure-functional-hierarchical-flat-and-narrow-matrix'],
  ['7115', '2.4', '9609', '7-2-1-purposes-of-communication'],
  ['7115', '3.2', '9609', '3-2-1-the-purposes-of-market-research'],
  ['7115', '3.4', '9609', '8-2-2-approaches-to-marketing-strategy'],
  ['7115', '4.3', '9609', '9-2-1-quality-control-and-quality-assurance'],
  ['7115', '4.4', '9609', '9-1-1-location'],
  ['7115', '5.1', '9609', '5-1-1-the-need-for-business-finance'],
  ['7115', '5.5', '9609', '10-2-1-liquidity-ratios'],
  ['7115', '6.1', '9609', '6-1-2-economic'],
  ['7115', '6.2', '9609', '6-1-7-environmental'],
]

function loadSyllabusTopic(code, topicCode) {
  const file = path.join(ROOT, 'lib', 'syllabi', `${code}.json`)
  const data = JSON.parse(fs.readFileSync(file, 'utf8'))
  const topic = data.topics.find((t) => t.code === topicCode)
  if (!topic) throw new Error(`Topic ${topicCode} not in ${code} syllabus`)
  return topic
}

function adaptText(text, targetCode, sourceCode) {
  if (typeof text !== 'string') return text
  return text
    .replaceAll(sourceCode, targetCode)
    .replaceAll('Cambridge International AS Level', 'Cambridge O-Level')
    .replaceAll('Cambridge International A Level', 'Cambridge O-Level')
    .replaceAll('AS Level', 'O-Level')
    .replaceAll('A Level', 'O-Level')
    .replaceAll('AS & A Level', 'O-Level')
    .replace(/\b9708\b/g, '2281')
    .replace(/\b9609\b/g, '7115')
}

function adaptLesson(lesson, topic, targetCode, sourceCode, sourceSlug) {
  const out = structuredClone(lesson)
  out.slug = topic.slug ?? lesson.slug
  out.topicCode = topic.code
  out.title = topic.name
  out.paper = topic.paper
  out.paperName = topic.paperName
  out.status = 'premium'
  const levelLabel = targetCode === '2281' ? '2281 O-Level Economics' : targetCode === '7115' ? '7115 O-Level Business' : `${targetCode} O-Level`
  out.summary = adaptText(lesson.summary ?? '', targetCode, sourceCode)
    .replace(/AS microeconomics/gi, 'O-Level Economics')
    .replace(/AS —/g, 'O-Level —')
    .replace(/A-Level —/g, 'O-Level —')
  if (!out.summary || out.summary === lesson.summary) {
    out.summary = `Free ${levelLabel} lesson on ${topic.name} — diagrams, exam tips, and past-paper practice.`
  }
  out.updated = new Date().toISOString().slice(0, 10)
  out.portedFrom = { subjectCode: sourceCode, slug: sourceSlug, level: 'A-Level' }

  if (out.simpleExplanation) {
    out.simpleExplanation.title = adaptText(out.simpleExplanation.title ?? topic.name, targetCode, sourceCode)
    out.simpleExplanation.summary = adaptText(out.simpleExplanation.summary ?? '', targetCode, sourceCode)
    out.simpleExplanation.steps = (out.simpleExplanation.steps ?? []).map((s) =>
      adaptText(s, targetCode, sourceCode)
    )
  }

  out.learningObjectives = (out.learningObjectives ?? []).map((s) =>
    adaptText(s, targetCode, sourceCode)
  )

  out.sections = (out.sections ?? []).map((section) => {
    const s = { ...section }
    if (typeof s.content === 'string') s.content = adaptText(s.content, targetCode, sourceCode)
    if (s.type === 'keyPoints' && Array.isArray(s.items)) {
      s.items = s.items.map((i) => adaptText(i, targetCode, sourceCode))
    }
    if (s.type === 'workedExample') {
      if (typeof s.question === 'string') s.question = adaptText(s.question, targetCode, sourceCode)
      if (typeof s.solution === 'string') s.solution = adaptText(s.solution, targetCode, sourceCode)
    }
    if (s.type === 'practice' && s.href) {
      s.href = `/mark?subject=${targetCode}&topic=${encodeURIComponent(topic.code)}`
    }
    if (s.type === 'resources' && Array.isArray(s.items)) {
      s.items = s.items.map((item) => ({
        ...item,
        label: adaptText(item.label ?? '', targetCode, sourceCode),
        href: item.href?.includes(`/subjects/${sourceCode}`)
          ? `/subjects/${targetCode}`
          : item.href,
      }))
    }
    return s
  })

  out.faq = (out.faq ?? []).map((f) => ({
    q: adaptText(f.q, targetCode, sourceCode),
    a: adaptText(f.a, targetCode, sourceCode),
  }))

  return out
}

async function main() {
  if (process.argv.includes('--status')) {
    for (const code of ['2281', '7115']) {
      const dir = path.join(ROOT, 'content', 'courses', code)
      const files = fs.readdirSync(dir).filter((f) => f.endsWith('.json'))
      let premium = 0
      let outline = 0
      for (const f of files) {
        const lesson = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'))
        if (lesson.status === 'premium' || lesson.status === 'published') premium++
        else outline++
      }
      console.log(`${code}: ${premium} premium, ${outline} outline (${files.length} total)`)
    }
    return
  }

  const { topicToLessonSlug } = await import('../lib/courses/slug.ts')
  const { hydrateLessonCatalogVisuals } = await import('../lib/courses/attach-lesson-visuals.ts')
  const { clearCourseCatalogCache } = await import('../lib/courses/catalog-cache.ts')

  let written = 0
  for (const [targetCode, topicCode, sourceCode, sourceSlug] of PORTS) {
    const topic = loadSyllabusTopic(targetCode, topicCode)
    const slug = topicToLessonSlug(topic.code, topic.name)
    topic.slug = slug

    const sourcePath = path.join(ROOT, 'content', 'courses', sourceCode, `${sourceSlug}.json`)
    if (!fs.existsSync(sourcePath)) {
      console.warn(`Skip: missing source ${sourcePath}`)
      continue
    }
    const source = JSON.parse(fs.readFileSync(sourcePath, 'utf8'))
    if (source.status !== 'premium' && source.status !== 'pilot') {
      console.warn(`Skip: ${sourceSlug} is not premium/pilot`)
      continue
    }

    let lesson = adaptLesson(source, topic, targetCode, sourceCode, sourceSlug)
    lesson = hydrateLessonCatalogVisuals(lesson)

    const outPath = path.join(ROOT, 'content', 'courses', targetCode, `${slug}.json`)
    if (dryRun) {
      console.log(`[dry-run] ${targetCode}/${slug} ← ${sourceCode}/${sourceSlug}`)
      continue
    }
    fs.writeFileSync(outPath, JSON.stringify(lesson, null, 2) + '\n')
    console.log(`Ported ${targetCode}/${slug} ← ${sourceCode}/${sourceSlug}`)
    written++
  }

  if (!dryRun && written) clearCourseCatalogCache()
  console.log(`\nDone. ${written} premium O-Level lesson(s).`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
