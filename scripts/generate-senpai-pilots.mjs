#!/usr/bin/env node
/**
 * Generate Senpai Corner pilot lessons from chapter PDFs + existing premium JSON.
 *
 *   pnpm senpai:as-pilots
 *   pnpm senpai:al-pilots
 *   node scripts/generate-senpai-pilots.mjs --level as --topic 4.2 --force
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { createCanvas } from '@napi-rs/canvas'

const ROOT = path.dirname(fileURLToPath(import.meta.url))
const PROJECT = path.join(ROOT, '..')

const LEVEL_CONFIG = {
  as: {
    label: 'AS',
    paperNumber: '2',
    paperName: 'Paper 2 AS Level Structured Questions',
    paperType: 'structured',
    senpaiPage: 'https://www.senpaicorner.com/cie-as-physics-2025-2027-notes',
    pdfs: [
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
    ],
    filterTopic: (t) => t.paper === 'P1/P2' || t.paper.includes('P1'),
  },
  al: {
    label: 'A Level',
    paperNumber: '4',
    paperName: 'Paper 4 A Level Structured Questions',
    paperType: 'structured',
    senpaiPage: 'https://www.senpaicorner.com/cie-a-levels-physics-2025-2027-notes',
    pdfs: [
      'https://www.senpaicorner.com/_files/ugd/1a1fe2_4b752ac806ce4579ba0f3ec6b5a8e4ca.pdf',
      'https://www.senpaicorner.com/_files/ugd/1a1fe2_fa131d99b1fa46e38605ed153562716f.pdf',
      'https://www.senpaicorner.com/_files/ugd/1a1fe2_b32439b240e34e91ac576260a136f1f2.pdf',
      'https://www.senpaicorner.com/_files/ugd/1a1fe2_ea2c4a391e1a4b3d9b99205e34940d24.pdf',
      'https://www.senpaicorner.com/_files/ugd/1a1fe2_b0891762223b49b69d5df3a450fd09b9.pdf',
      'https://www.senpaicorner.com/_files/ugd/1a1fe2_3f4c3da8860542ac8326876cdb5c920c.pdf',
      'https://www.senpaicorner.com/_files/ugd/1a1fe2_0e7809134a3f47e7927e8063c704d71c.pdf',
      'https://www.senpaicorner.com/_files/ugd/1a1fe2_827c9b3f732346bd84ef68f722322581.pdf',
      'https://www.senpaicorner.com/_files/ugd/1a1fe2_dab741207d734081a880f7975f1d9188.pdf',
      'https://www.senpaicorner.com/_files/ugd/1a1fe2_f01939a5db014f9896ddbdab532f2ed8.pdf',
      'https://www.senpaicorner.com/_files/ugd/1a1fe2_0e639be782b04a3baf4a8d3e6ec2ff85.pdf',
      'https://www.senpaicorner.com/_files/ugd/1a1fe2_c452753c0eaa4ae5814f1d80d7e24950.pdf',
      'https://www.senpaicorner.com/_files/ugd/1a1fe2_91150f0f9ac04529a3293887a695a739.pdf',
      'https://www.senpaicorner.com/_files/ugd/1a1fe2_c38e0e8d14b245269aed779ebab8ce77.pdf',
    ],
    filterTopic: (t) => t.paper === 'P4',
  },
}

const args = process.argv.slice(2)
const getArg = (name) => {
  const i = args.indexOf(`--${name}`)
  return i === -1 ? null : args[i + 1]
}
const dryRun = args.includes('--dry-run')
const force = args.includes('--force')
const noTrim = args.includes('--no-trim')
const singleTopic = getArg('topic')
const level = getArg('level') ?? 'as'
const config = LEVEL_CONFIG[level]
if (!config) {
  console.error('Use --level as or --level al')
  process.exit(1)
}

/** Hand-crafted pilots — never overwrite unless --topic targets them explicitly. */
const PRESERVE_SLUGS = new Set(['4-2-equilibrium-of-forces'])

function topicToSlug(topicCode, topicName) {
  const namePart = topicName
    .toLowerCase()
    .replace(/['']/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
  return `${topicCode.replace(/\./g, '-')}-${namePart}`
}

function loadTopics() {
  const data = JSON.parse(fs.readFileSync(path.join(PROJECT, 'lib/syllabi/9702.json'), 'utf8'))
  return data.topics.filter(config.filterTopic)
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
  fs.writeFileSync(dest, Buffer.from(await res.arrayBuffer()))
  return dest
}

function parsePageTopicSegments(text, topicCodes, carryTopic) {
  const segments = []
  const hits = [...text.matchAll(/\b(\d+\.\d+)\s+/g)].filter((m) => topicCodes.has(m[1]))
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

function trimCanvasWhitespace(canvas, threshold = 248) {
  const ctx = canvas.getContext('2d')
  const { width, height } = canvas
  const { data } = ctx.getImageData(0, 0, width, height)
  let top = height
  let left = width
  let bottom = 0
  let right = 0

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4
      const r = data[i]
      const g = data[i + 1]
      const b = data[i + 2]
      if (r < threshold || g < threshold || b < threshold) {
        if (x < left) left = x
        if (x > right) right = x
        if (y < top) top = y
        if (y > bottom) bottom = y
      }
    }
  }

  if (right <= left || bottom <= top) return canvas

  const pad = 12
  const x0 = Math.max(0, left - pad)
  const y0 = Math.max(0, top - pad)
  const w = Math.min(width - x0, right - left + 1 + pad * 2)
  const h = Math.min(height - y0, bottom - top + 1 + pad * 2)
  const trimmed = createCanvas(w, h)
  trimmed.getContext('2d').drawImage(canvas, x0, y0, w, h, 0, 0, w, h)
  return trimmed
}

function buildPilotFromBase(base, topic, senpai, cfg) {
  const pilot = structuredClone(base)
  pilot.slug = topicToSlug(topic.code, topic.name)
  pilot.topicCode = topic.code
  pilot.title = topic.name
  pilot.paper = topic.paper
  pilot.paperName = cfg.paperName
  pilot.paperNumber = cfg.paperNumber
  pilot.paperType = cfg.paperType
  pilot.level = 'A-Level'
  pilot.status = 'pilot'
  pilot.generatorVersion = 'senpai-pilot-2'
  pilot.generatedAt = new Date().toISOString()
  pilot.sections = (pilot.sections ?? []).filter((s) => s.type !== 'pastPaperPractice')

  if (senpai?.text) {
    const objectives = parseCandidateObjectives(senpai.text)
    if (objectives.length) pilot.learningObjectives = objectives
    const bullets = parseSenpaiBullets(senpai.text)
    if (bullets.length >= 2) {
      const idx = pilot.sections.findIndex((s) => s.type === 'keyPoints')
      const items = bullets.slice(0, 6).map((b) => (b.endsWith('.') ? b : `${b}.`))
      if (idx >= 0) pilot.sections[idx] = { type: 'keyPoints', items }
      else {
        const introIdx = pilot.sections.findIndex((s) => s.type === 'intro')
        pilot.sections.splice(introIdx + 1, 0, { type: 'keyPoints', items })
      }
    }
    const intro = pilot.sections.find((s) => s.type === 'intro')
    if (intro?.type === 'intro') {
      intro.content = `${intro.content} This pilot aligns with **Senpai Corner** ${cfg.label} notes (2025–2027) for topic **${topic.code}**.`
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
    if (!resources.items.some((i) => i.href.includes('senpaicorner'))) {
      resources.items.unshift({
        label: `Senpai Corner ${cfg.label} Physics notes (source)`,
        href: cfg.senpaiPage,
      })
    }
  }

  pilot.summary = `Cambridge 9702 Paper ${cfg.paperNumber} — ${topic.name} (${topic.code}). Senpai Corner diagram-backed pilot with premium structure and live visuals.`
  return pilot
}

async function extractSenpaiByTopic(pdfjs, topics, cfg) {
  const topicCodes = new Set(topics.map((t) => t.code))
  const importDir = path.join(PROJECT, `content/source-notes/9702/_senpai-import/${level}`)
  const diagramDir = path.join(PROJECT, 'public/courses/diagrams/9702/senpai')
  fs.mkdirSync(importDir, { recursive: true })
  fs.mkdirSync(diagramDir, { recursive: true })

  /** @type {Record<string, { text: string, diagramPath?: string, chapter: number, diagramScore: number }>} */
  const byTopic = {}

  for (let ci = 0; ci < cfg.pdfs.length; ci++) {
    const url = cfg.pdfs[ci]
    const localPath = path.join(importDir, `chapter-${String(ci + 1).padStart(2, '0')}.pdf`)
    await downloadPdf(url, localPath)
    const doc = await pdfjs.getDocument({ data: new Uint8Array(fs.readFileSync(localPath)), useSystemFonts: true }).promise

    let carryTopic = null
    for (let p = 1; p <= doc.numPages; p++) {
      const page = await doc.getPage(p)
      const text = (await page.getTextContent()).items.map((i) => i.str).join(' ')
      const { segments, carryTopic: nextCarry } = parsePageTopicSegments(text, topicCodes, carryTopic)
      carryTopic = nextCarry
      if (!segments.length) continue

      const viewport = page.getViewport({ scale: 2 })
      let canvas = createCanvas(viewport.width, viewport.height)
      await page.render({ canvas, canvasContext: canvas.getContext('2d'), viewport }).promise
      if (!noTrim) canvas = trimCanvasWhitespace(canvas)

      for (const seg of segments) {
        const topicCode = seg.code
        if (!byTopic[topicCode]) {
          byTopic[topicCode] = { text: '', chapter: ci + 1, diagramScore: 0 }
        }
        byTopic[topicCode].text += `\n${seg.text}`

        const score = seg.text.length
        if (score >= byTopic[topicCode].diagramScore) {
          const slug = topicToSlug(topicCode, topics.find((t) => t.code === topicCode)?.name ?? topicCode)
          const rel = `/courses/diagrams/9702/senpai/${slug}.png`
          fs.writeFileSync(path.join(PROJECT, 'public', rel.replace(/^\//, '')), canvas.toBuffer('image/png'))
          byTopic[topicCode].diagramPath = rel
          byTopic[topicCode].diagramScore = score
        }
      }
    }
  }

  return byTopic
}

async function main() {
  const topics = loadTopics()
  const queue = singleTopic ? topics.filter((t) => t.code === singleTopic) : topics
  if (!queue.length) {
    console.error('No matching topics')
    process.exit(1)
  }

  console.log(`Senpai ${config.label} pilot generation — ${queue.length} topic(s)`)
  const senpaiByTopic = await extractSenpaiByTopic(await loadPdfJs(), topics, config)
  const outDir = path.join(PROJECT, `content/courses/9702/paper-${config.paperNumber}`)
  fs.mkdirSync(outDir, { recursive: true })

  let ok = 0
  let skip = 0
  let missing = 0

  for (const topic of queue) {
    const slug = topicToSlug(topic.code, topic.name)
    const outPath = path.join(outDir, `${slug}.pilot.json`)
    const basePath = path.join(PROJECT, 'content/courses/9702', `${slug}.json`)

    if (PRESERVE_SLUGS.has(slug) && singleTopic !== topic.code) {
      console.log(`  skip ${topic.code} (hand-crafted pilot preserved)`)
      skip++
      continue
    }

    if (fs.existsSync(outPath) && !force) {
      const existing = JSON.parse(fs.readFileSync(outPath, 'utf8'))
      if (existing.generatorVersion?.startsWith('senpai-pilot')) {
        console.log(`  skip ${topic.code} (senpai pilot exists, use --force)`)
        skip++
        continue
      }
    }

    if (!fs.existsSync(basePath)) {
      console.log(`  ○ ${topic.code} — no published base`)
      missing++
      continue
    }

    const senpai = senpaiByTopic[topic.code]
    if (!senpai?.text) {
      console.log(`  ○ ${topic.code} — no Senpai PDF match`)
      missing++
      continue
    }

    if (dryRun) {
      console.log(`  → ${topic.code} ${topic.name}`)
      ok++
      continue
    }

    const pilot = buildPilotFromBase(JSON.parse(fs.readFileSync(basePath, 'utf8')), topic, senpai, config)
    fs.writeFileSync(outPath, `${JSON.stringify(pilot, null, 2)}\n`)
    console.log(`  ✓ ${topic.code} ${topic.name}`)
    ok++
  }

  console.log(`\nDone: ${ok} ready, ${skip} skipped, ${missing} missing`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
