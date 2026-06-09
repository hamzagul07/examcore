#!/usr/bin/env node
/**
 * Generate Paper 2 AS pilot lessons from Senpai Corner chapter PDFs + existing premium JSON.
 *
 *   pnpm senpai:as-pilots
 *   pnpm senpai:as-pilots -- --topic 4.2 --force
 *   pnpm senpai:as-pilots -- --dry-run
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { createCanvas } from '@napi-rs/canvas'

const ROOT = path.dirname(fileURLToPath(import.meta.url))
const PROJECT = path.join(ROOT, '..')

const SENPAI_PAGE = 'https://www.senpaicorner.com/cie-as-physics-2025-2027-notes'
const CHAPTER_PDFS = [
  'https://www.senpaicorner.com/_files/ugd/1a1fe2_5721001c6a52428f93b5705f0aace5fb.pdf',
  'https://www.senpaicorner.com/_files/ugd/1a1fe2_0bb0ea9c020740508186fb716186a742.pdf',
  'https://www.senpaicorner.com/_files/ugd/1a1fe2_9287f41101944866a4ccde697075e28c.pdf',
  'https://www.senpaicorner.com/_files/ugd/1a1fe2_da29d0c290154788bda45c18d3429ce7.pdf',
  'https://www.senpaicorner.com/_files/ugd/1a1fe2_1dd7f4cbca334aebb83652da3fae4dce.pdf',
  'https://www.senpaicorner.com/_files/ugd/1a1fe2_df34c3e9eec94c39ba284ca431dca47a.pdf',
  'https://www.senpaicorner.com/_files/ugd/1a1fe2_a4341004e31b47b48cd32522ff31ecda.pdf',
  'https://www.senpaicorner.com/_files/ugd/1a1fe2_0f1e84359fa94f6298bb8a4c70465ff8.pdf',
  'https://www.senpaicorner.com/_files/ugd/1a1fe2_e543cf44d546480fac4f058174d82db9.pdf',
  'https://www.senpaicorner.com/_files/ugd/1a1fe2_edb16127b602445d9ec212b19f1a3dbd.pdf',
  'https://www.senpaicorner.com/_files/ugd/1a1fe2_145d5d9efe3142bfb9db9ab1bf7d6aa1.pdf',
]

const args = process.argv.slice(2)
const getArg = (name) => {
  const i = args.indexOf(`--${name}`)
  return i === -1 ? null : args[i + 1]
}
const dryRun = args.includes('--dry-run')
const force = args.includes('--force')
const singleTopic = getArg('topic')

function topicToSlug(topicCode, topicName) {
  const namePart = topicName
    .toLowerCase()
    .replace(/['']/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
  return `${topicCode.replace(/\./g, '-')}-${namePart}`
}

function loadAsTopics() {
  const data = JSON.parse(fs.readFileSync(path.join(PROJECT, 'lib/syllabi/9702.json'), 'utf8'))
  return data.topics.filter((t) => t.paper === 'P1/P2' || t.paper.includes('P1'))
}

async function loadPdfJs() {
  const worker = await import('pdfjs-dist/legacy/build/pdf.worker.mjs')
  globalThis.pdfjsWorker = worker
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs')
  pdfjs.GlobalWorkerOptions.workerSrc = 'pdfjs-dist/legacy/build/pdf.worker.mjs'
  return pdfjs
}

async function downloadPdf(url, dest) {
  if (fs.existsSync(dest) && fs.statSync(dest).size > 1000) return dest
  fs.mkdirSync(path.dirname(dest), { recursive: true })
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Download failed ${url}: ${res.status}`)
  const buf = Buffer.from(await res.arrayBuffer())
  fs.writeFileSync(dest, buf)
  return dest
}

function parsePageTopicSegments(text, asCodes, carryTopic) {
  const segments = []
  const hits = [...text.matchAll(/\b(\d+\.\d+)\s+/g)].filter((m) => asCodes.has(m[1]))

  if (!hits.length) {
    if (carryTopic) segments.push({ code: carryTopic, text })
    return { segments, carryTopic }
  }

  for (let i = 0; i < hits.length; i++) {
    const code = hits[i][1]
    const start = hits[i].index ?? 0
    const end = i + 1 < hits.length ? hits[i + 1].index : text.length
    segments.push({ code, text: text.slice(start, end) })
  }

  return { segments, carryTopic: hits[hits.length - 1][1] }
}

function parseSenpaiBullets(text) {
  const bullets = []
  for (const line of text.split(/[•\n]/)) {
    const t = line.replace(/\s+/g, ' ').trim()
    if (t.length < 12 || t.length > 220) continue
    if (/^chapter \d/i.test(t)) continue
    if (/candidates should/i.test(t)) continue
    if (/^hint \d/i.test(t)) continue
    bullets.push(t)
  }
  return [...new Set(bullets)].slice(0, 8)
}

function parseCandidateObjectives(text) {
  const box = text.match(/candidates should be able to:([\s\S]*?)(?:•|chapter|\d+\.\d+|$)/i)
  if (!box) return []
  const items = []
  for (const line of box[1].split(/\n|\d+\./)) {
    const t = line.replace(/\s+/g, ' ').trim()
    if (t.length > 15 && t.length < 200) items.push(t)
  }
  return items.slice(0, 4)
}

function stripPastPaperPractice(sections) {
  return sections.filter((s) => s.type !== 'pastPaperPractice')
}

function buildPilotFromBase(base, topic, senpai) {
  const slug = topicToSlug(topic.code, topic.name)
  const pilot = structuredClone(base)

  pilot.slug = slug
  pilot.topicCode = topic.code
  pilot.title = topic.name
  pilot.paper = topic.paper
  pilot.paperName = 'Paper 2 AS Level Structured Questions'
  pilot.paperNumber = '2'
  pilot.paperType = 'structured'
  pilot.level = 'A-Level'
  pilot.status = 'pilot'
  pilot.generatorVersion = 'senpai-pilot-1'
  pilot.generatedAt = new Date().toISOString()

  pilot.sections = stripPastPaperPractice(pilot.sections ?? [])

  if (senpai?.text) {
    const objectives = parseCandidateObjectives(senpai.text)
    if (objectives.length) pilot.learningObjectives = objectives

    const bullets = parseSenpaiBullets(senpai.text)
    if (bullets.length >= 2) {
      const idx = pilot.sections.findIndex((s) => s.type === 'keyPoints')
      if (idx >= 0) {
        pilot.sections[idx] = {
          type: 'keyPoints',
          items: bullets.slice(0, 6).map((b) => (b.endsWith('.') ? b : `${b}.`)),
        }
      } else {
        const introIdx = pilot.sections.findIndex((s) => s.type === 'intro')
        pilot.sections.splice(introIdx + 1, 0, {
          type: 'keyPoints',
          items: bullets.slice(0, 6).map((b) => (b.endsWith('.') ? b : `${b}.`)),
        })
      }
    }

    const intro = pilot.sections.find((s) => s.type === 'intro')
    if (intro?.type === 'intro') {
      intro.content = `${intro.content} This pilot lesson aligns with **Senpai Corner** AS notes (2025–2027) for topic **${topic.code}**.`
    }
  }

  if (senpai?.diagramPath) {
    pilot.diagram = {
      src: senpai.diagramPath,
      alt: `Senpai Corner reference diagram for ${topic.code} ${topic.name}`,
    }
  }

  const resources = pilot.sections.find((s) => s.type === 'resources')
  if (resources?.type === 'resources') {
    const hasSenpai = resources.items.some((i) => i.href.includes('senpaicorner'))
    if (!hasSenpai) {
      resources.items.unshift({
        label: 'Senpai Corner AS Physics notes (source)',
        href: SENPAI_PAGE,
      })
    }
  }

  pilot.summary = `Cambridge 9702 Paper 2 — ${topic.name} (${topic.code}). Senpai Corner diagram-backed pilot with premium lesson structure and live visual learning.`

  return pilot
}

async function extractSenpaiByTopic(pdfjs, asTopics) {
  const asCodes = new Set(asTopics.map((t) => t.code))
  const importDir = path.join(PROJECT, 'content/source-notes/9702/_senpai-import')
  const diagramDir = path.join(PROJECT, 'public/courses/diagrams/9702/senpai')
  fs.mkdirSync(importDir, { recursive: true })
  fs.mkdirSync(diagramDir, { recursive: true })

  /** @type {Record<string, { text: string, diagramPath?: string, chapter: number }>} */
  const byTopic = {}

  for (let ci = 0; ci < CHAPTER_PDFS.length; ci++) {
    const url = CHAPTER_PDFS[ci]
    const localPath = path.join(importDir, `chapter-${String(ci + 1).padStart(2, '0')}.pdf`)
    await downloadPdf(url, localPath)

    const data = new Uint8Array(fs.readFileSync(localPath))
    const doc = await pdfjs.getDocument({ data, useSystemFonts: true }).promise

    let carryTopic = null

    for (let p = 1; p <= doc.numPages; p++) {
      const page = await doc.getPage(p)
      const textContent = await page.getTextContent()
      const text = textContent.items.map((i) => i.str).join(' ')
      const { segments, carryTopic: nextCarry } = parsePageTopicSegments(text, asCodes, carryTopic)
      carryTopic = nextCarry

      if (!segments.length) continue

      const viewport = page.getViewport({ scale: 2 })
      const canvas = createCanvas(viewport.width, viewport.height)
      const ctx = canvas.getContext('2d')
      await page.render({ canvas, canvasContext: ctx, viewport }).promise
      const png = canvas.toBuffer('image/png')

      for (const seg of segments) {
        const topicCode = seg.code
        if (!byTopic[topicCode]) byTopic[topicCode] = { text: '', chapter: ci + 1 }
        byTopic[topicCode].text += `\n${seg.text}`

        const slug = topicToSlug(
          topicCode,
          asTopics.find((t) => t.code === topicCode)?.name ?? topicCode
        )
        const rel = `/courses/diagrams/9702/senpai/${slug}.png`
        const abs = path.join(PROJECT, 'public', rel.replace(/^\//, ''))
        fs.writeFileSync(abs, png)
        byTopic[topicCode].diagramPath = rel
      }
    }
  }

  return byTopic
}

async function main() {
  const asTopics = loadAsTopics()
  const queue = singleTopic
    ? asTopics.filter((t) => t.code === singleTopic)
    : asTopics

  if (!queue.length) {
    console.error('No matching AS topics')
    process.exit(1)
  }

  console.log(`Senpai AS pilot generation — ${queue.length} topic(s)`)
  const pdfjs = await loadPdfJs()
  const senpaiByTopic = await extractSenpaiByTopic(pdfjs, asTopics)

  const outDir = path.join(PROJECT, 'content/courses/9702/paper-2')
  fs.mkdirSync(outDir, { recursive: true })

  let ok = 0
  let skip = 0
  let missing = 0

  for (const topic of queue) {
    const slug = topicToSlug(topic.code, topic.name)
    const outPath = path.join(outDir, `${slug}.pilot.json`)
    const basePath = path.join(PROJECT, 'content/courses/9702', `${slug}.json`)

    if (fs.existsSync(outPath) && !force) {
      const existing = JSON.parse(fs.readFileSync(outPath, 'utf8'))
      if (existing.generatorVersion === 'senpai-pilot-1') {
        console.log(`  skip ${topic.code} (senpai pilot exists)`)
        skip++
        continue
      }
    }

    if (!fs.existsSync(basePath)) {
      console.log(`  ○ ${topic.code} — no published base lesson`)
      missing++
      continue
    }

    const senpai = senpaiByTopic[topic.code]
    if (!senpai?.text) {
      console.log(`  ○ ${topic.code} — no Senpai PDF pages matched`)
      missing++
      continue
    }

    if (dryRun) {
      console.log(`  → ${topic.code} ${topic.name} (ch ${senpai.chapter}, diagram: ${!!senpai.diagramPath})`)
      ok++
      continue
    }

    const base = JSON.parse(fs.readFileSync(basePath, 'utf8'))
    const pilot = buildPilotFromBase(base, topic, senpai)
    fs.writeFileSync(outPath, `${JSON.stringify(pilot, null, 2)}\n`)
    console.log(`  ✓ ${topic.code} ${topic.name}`)
    ok++
  }

  console.log(`\nDone: ${ok} ready, ${skip} skipped, ${missing} without Senpai/base`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
