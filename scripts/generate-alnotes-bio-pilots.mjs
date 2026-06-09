#!/usr/bin/env node
/**
 * Generate A-Level Notes (alevel-notes.weebly.com) biology pilots from chapter PDFs.
 *
 *   pnpm alnotes:bio-pilots
 *   node scripts/generate-alnotes-bio-pilots.mjs --topic 1.2 --force
 *   node scripts/generate-alnotes-bio-pilots.mjs --chapter 1 --dry-run
 */
import fs from 'fs'
import path from 'path'
import { spawnSync } from 'child_process'
import { fileURLToPath } from 'url'
import { createCanvas } from '@napi-rs/canvas'

const ROOT = path.dirname(fileURLToPath(import.meta.url))
const PROJECT = path.join(ROOT, '..')
const SUBJECT = '9700'
const SOURCE_PAGE = 'https://alevel-notes.weebly.com/biology.html'
const PDF_BASE = 'https://alevel-notes.weebly.com/uploads/1/2/2/8/122820312'

const CHAPTER_PDFS = [
  `${PDF_BASE}/1_cell_structure.pdf`,
  `${PDF_BASE}/2_biomolecules.pdf`,
  `${PDF_BASE}/3_enzymes.pdf`,
  `${PDF_BASE}/4_cell_membranes_and_transport.pdf`,
  `${PDF_BASE}/5_mitotic_cell_cycle.pdf`,
  `${PDF_BASE}/6_nucleic_acids.pdf`,
  `${PDF_BASE}/7_transport_in_plants.pdf`,
  `${PDF_BASE}/8_transport_in_mammals.pdf`,
  `${PDF_BASE}/9_gas_exchange_and_smoking.pdf`,
  `${PDF_BASE}/10_infectious_diseases.pdf`,
  `${PDF_BASE}/11_immunity.pdf`,
  `${PDF_BASE}/12_energy_and_respiration.pdf`,
  `${PDF_BASE}/13_photosynthesis.pdf`,
  `${PDF_BASE}/14_homeostasis.pdf`,
  `${PDF_BASE}/15_control_and_co-ordination.pdf`,
  `${PDF_BASE}/16_inherited_change_handwritten.pdf`,
  `${PDF_BASE}/17_selection_handwritten.pdf`,
  `${PDF_BASE}/18_biodiversity.pdf`,
  `${PDF_BASE}/19_genetic_technology.pdf`,
]

const args = process.argv.slice(2)
const getArg = (name) => {
  const i = args.indexOf(`--${name}`)
  return i === -1 ? null : args[i + 1]
}
const dryRun = args.includes('--dry-run')
const force = args.includes('--force')
const noTrim = args.includes('--no-trim')
const singleTopic = getArg('topic')
const singleChapter = getArg('chapter') ? Number(getArg('chapter')) : null

function topicToSlug(topicCode, topicName) {
  const namePart = topicName
    .toLowerCase()
    .replace(/['']/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
  return `${topicCode.replace(/\./g, '-')}-${namePart}`
}

function paperMeta(topic) {
  const isAl = topic.paper === 'P4'
  return {
    paperNumber: isAl ? '4' : '2',
    paperName: topic.paperName,
    paperType: 'structured',
    levelLabel: isAl ? 'A Level' : 'AS',
  }
}

function loadTopics() {
  const data = JSON.parse(fs.readFileSync(path.join(PROJECT, `lib/syllabi/${SUBJECT}.json`), 'utf8'))
  return data.topics
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

  let lastErr
  for (let attempt = 1; attempt <= 4; attempt++) {
    try {
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'ExamCore/1.0 (educational content integration)',
          Accept: 'application/pdf,*/*',
        },
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const buf = Buffer.from(await res.arrayBuffer())
      if (buf.length < 1000) throw new Error(`PDF too small (${buf.length} bytes)`)
      fs.writeFileSync(dest, buf)
      return dest
    } catch (err) {
      lastErr = err
      if (fs.existsSync(dest)) fs.unlinkSync(dest)
      await new Promise((r) => setTimeout(r, attempt * 1500))
    }
  }
  const curl = spawnSync('curl', ['-L', '-sS', '-o', dest, url], { encoding: 'utf8' })
  if (curl.status === 0 && fs.existsSync(dest) && fs.statSync(dest).size > 1000) return dest

  throw new Error(`Download failed ${url}: ${lastErr?.message ?? lastErr}`)
}

function parsePageTopicSegments(text, topicCodes, carryTopic) {
  const segments = []
  const hits = [
    ...text.matchAll(/\b(\d+\.\d+)\b/g),
    ...text.matchAll(/\btopic\s*(\d+\.\d+)\b/gi),
    ...text.matchAll(/\b(\d+)\s*[\).:-]\s*(\d+)\b/g).map((m) => ({
      0: m[0],
      1: `${m[1]}.${m[2]}`,
      index: m.index,
    })),
  ]
    .filter((m) => topicCodes.has(m[1]))
    .sort((a, b) => (a.index ?? 0) - (b.index ?? 0))
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

function parseNoteBullets(text) {
  const bullets = []
  for (const line of text.split(/[•\n]/)) {
    const t = line.replace(/\s+/g, ' ').trim()
    if (t.length < 12 || t.length > 240) continue
    if (/^chapter \d/i.test(t)) continue
    if (/^9700/i.test(t)) continue
    if (/candidates should/i.test(t)) continue
    bullets.push(t)
  }
  return [...new Set(bullets)].slice(0, 8)
}

function parseLearningObjectives(text) {
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

function buildPilotFromBase(base, topic, alnotes, meta) {
  const pilot = structuredClone(base)
  pilot.slug = topicToSlug(topic.code, topic.name)
  pilot.topicCode = topic.code
  pilot.title = topic.name
  pilot.paper = topic.paper
  pilot.paperName = meta.paperName
  pilot.paperNumber = meta.paperNumber
  pilot.paperType = meta.paperType
  pilot.level = 'A-Level'
  pilot.status = 'pilot'
  pilot.generatorVersion = 'alnotes-pilot-1'
  pilot.generatedAt = new Date().toISOString()
  pilot.sections = (pilot.sections ?? []).filter((s) => s.type !== 'pastPaperPractice')

  if (alnotes?.text) {
    const objectives = parseLearningObjectives(alnotes.text)
    if (objectives.length) pilot.learningObjectives = objectives
    const bullets = parseNoteBullets(alnotes.text)
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
      intro.content = `${intro.content} Key points align with **[A-Level Notes](${SOURCE_PAGE})** 9700 Biology chapter **${topic.parent}** (topic **${topic.code}**).`
    }
  }

  if (alnotes?.diagramPath) {
    pilot.diagram = {
      src: alnotes.diagramPath,
      alt: `A-Level Notes reference diagram for ${topic.code} ${topic.name}`,
    }
  }

  const resources = pilot.sections.find((s) => s.type === 'resources')
  if (resources?.type === 'resources') {
    if (!resources.items.some((i) => i.href.includes('alevel-notes'))) {
      resources.items.unshift({
        label: 'A-Level Notes 9700 Biology (source)',
        href: SOURCE_PAGE,
      })
    }
  }

  pilot.summary = `Cambridge 9700 Paper ${meta.paperNumber} — ${topic.name} (${topic.code}). A-Level Notes diagram-backed lesson with premium structure and live visuals.`
  return pilot
}

async function extractAlnotesByTopic(pdfjs, topics, chapterFilter) {
  const topicCodes = new Set(topics.map((t) => t.code))
  const topicByCode = new Map(topics.map((t) => [t.code, t]))
  const importDir = path.join(PROJECT, `content/source-notes/${SUBJECT}/_alnotes-import`)
  const diagramDir = path.join(PROJECT, `public/courses/diagrams/${SUBJECT}/alnotes`)
  fs.mkdirSync(importDir, { recursive: true })
  fs.mkdirSync(diagramDir, { recursive: true })

  /** @type {Record<string, { text: string, diagramPath?: string, chapter: number, diagramScore: number }>} */
  const byTopic = {}

  const chapters = chapterFilter
    ? [{ index: chapterFilter - 1, url: CHAPTER_PDFS[chapterFilter - 1] }]
    : CHAPTER_PDFS.map((url, index) => ({ index, url }))

  for (const { index: ci, url } of chapters) {
    if (!url) continue
    const chapterNum = ci + 1
    const chapterTopics = topics.filter((t) => t.parent === String(chapterNum))
    const localPath = path.join(importDir, `chapter-${String(chapterNum).padStart(2, '0')}.pdf`)
    await downloadPdf(url, localPath)
    const doc = await pdfjs.getDocument({ data: new Uint8Array(fs.readFileSync(localPath)), useSystemFonts: true }).promise

    let carryTopic = null
    let chapterText = ''
    /** @type {{ page: number, canvas: import('@napi-rs/canvas').Canvas, score: number }[]} */
    const chapterPages = []

    for (let p = 1; p <= doc.numPages; p++) {
      const page = await doc.getPage(p)
      const text = (await page.getTextContent()).items.map((i) => i.str).join(' ')
      chapterText += `\n${text}`
      const { segments, carryTopic: nextCarry } = parsePageTopicSegments(text, topicCodes, carryTopic)
      carryTopic = nextCarry

      const viewport = page.getViewport({ scale: 2 })
      let canvas = createCanvas(viewport.width, viewport.height)
      await page.render({ canvas, canvasContext: canvas.getContext('2d'), viewport }).promise
      if (!noTrim) canvas = trimCanvasWhitespace(canvas)
      chapterPages.push({ page: p, canvas, score: text.trim().length })

      if (!segments.length) continue

      for (const seg of segments) {
        const topicCode = seg.code
        if (!byTopic[topicCode]) {
          byTopic[topicCode] = { text: '', chapter: ci + 1, diagramScore: 0 }
        }
        byTopic[topicCode].text += `\n${seg.text}`

        const score = seg.text.length
        if (score >= byTopic[topicCode].diagramScore) {
          const topic = topicByCode.get(topicCode)
          const slug = topicToSlug(topicCode, topic?.name ?? topicCode)
          const rel = `/courses/diagrams/${SUBJECT}/alnotes/${slug}.png`
          fs.writeFileSync(path.join(PROJECT, 'public', rel.replace(/^\//, '')), canvas.toBuffer('image/png'))
          byTopic[topicCode].diagramPath = rel
          byTopic[topicCode].diagramScore = score
        }
      }
    }

    const bestPage = [...chapterPages].sort((a, b) => b.score - a.score)[0]
    for (const topic of chapterTopics) {
      if (byTopic[topic.code]?.text) continue
      const slug = topicToSlug(topic.code, topic.name)
      const rel = `/courses/diagrams/${SUBJECT}/alnotes/${slug}.png`
      if (bestPage) {
        fs.writeFileSync(
          path.join(PROJECT, 'public', rel.replace(/^\//, '')),
          bestPage.canvas.toBuffer('image/png')
        )
      }
      byTopic[topic.code] = {
        text: chapterText,
        chapter: chapterNum,
        diagramPath: bestPage ? rel : undefined,
        diagramScore: chapterText.length,
      }
    }
  }

  return byTopic
}

async function main() {
  const topics = loadTopics()
  const queue = singleTopic
    ? topics.filter((t) => t.code === singleTopic)
    : singleChapter
      ? topics.filter((t) => t.parent === String(singleChapter))
      : topics

  if (!queue.length) {
    console.error('No matching topics')
    process.exit(1)
  }

  console.log(`A-Level Notes 9700 pilot generation — ${queue.length} topic(s)`)
  const alnotesByTopic = await extractAlnotesByTopic(
    await loadPdfJs(),
    topics,
    singleChapter
  )

  const outDir = path.join(PROJECT, `content/courses/${SUBJECT}/alnotes-pilots`)
  fs.mkdirSync(outDir, { recursive: true })

  let ok = 0
  let skip = 0
  let missing = 0

  for (const topic of queue) {
    const slug = topicToSlug(topic.code, topic.name)
    const outPath = path.join(outDir, `${slug}.pilot.json`)
    const basePath = path.join(PROJECT, `content/courses/${SUBJECT}`, `${slug}.json`)

    if (fs.existsSync(outPath) && !force) {
      const existing = JSON.parse(fs.readFileSync(outPath, 'utf8'))
      if (existing.generatorVersion?.startsWith('alnotes-pilot')) {
        console.log(`  skip ${topic.code} (alnotes pilot exists, use --force)`)
        skip++
        continue
      }
    }

    if (!fs.existsSync(basePath)) {
      console.log(`  ○ ${topic.code} — no published base`)
      missing++
      continue
    }

    const alnotes = alnotesByTopic[topic.code]
    if (!alnotes?.text) {
      console.log(`  ○ ${topic.code} — no A-Level Notes PDF match`)
      missing++
      continue
    }

    if (dryRun) {
      console.log(`  → ${topic.code} ${topic.name} (ch ${alnotes.chapter}, diagram: ${!!alnotes.diagramPath})`)
      ok++
      continue
    }

    const pilot = buildPilotFromBase(
      JSON.parse(fs.readFileSync(basePath, 'utf8')),
      topic,
      alnotes,
      paperMeta(topic)
    )
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
