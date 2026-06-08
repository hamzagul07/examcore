#!/usr/bin/env node
/**
 * Map Physics & Maths Tutor (PMT) topic pages → external resource links.
 *
 * Does NOT download or republish PMT notes, flashcards, or PDF text.
 * Only records public URLs so lessons can link out ("Further reading on PMT").
 *
 *   pnpm course:pmt-links -- --code 9702
 *   pnpm course:pmt-links -- --code 9702 --apply
 *   pnpm course:pmt-links -- --code 9702 --dry-run
 *
 * Output: lib/courses/external/pmt-{code}.json
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const ROOT = path.dirname(fileURLToPath(import.meta.url))
const PROJECT = path.join(ROOT, '..')

const PMT_INDEX = {
  '9702': 'https://www.physicsandmathstutor.com/physics-revision/a-level-caie/',
}

const USER_AGENT = 'MarkScheme-LinkMapper/1.0 (+https://markscheme.app; external-links-only)'

const args = process.argv.slice(2)
function getArg(name) {
  const i = args.indexOf(`--${name}`)
  return i === -1 ? null : args[i + 1]
}

const subjectCode = getArg('code') || '9702'
const apply = args.includes('--apply')
const dryRun = args.includes('--dry-run')

if (!PMT_INDEX[subjectCode]) {
  console.error(`Only supported: ${Object.keys(PMT_INDEX).join(', ')}`)
  process.exit(1)
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

async function fetchHtml(url) {
  const res = await fetch(url, {
    headers: { 'User-Agent': USER_AGENT, Accept: 'text/html' },
  })
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`)
  return res.text()
}

function resolvePmtUrl(href, baseUrl) {
  const clean = decodeHtml(href).trim()
  if (clean.startsWith('http://') || clean.startsWith('https://')) return clean
  const base = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`
  return new URL(clean.replace(/^\//, ''), base).href
}

function decodeHtml(s) {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&#038;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
}

function normalizeName(s) {
  return s
    .toLowerCase()
    .replace(/['']/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

function extractTopicPagesFromIndex(html, baseUrl) {
  const topics = []
  const re =
    /<a href="([^"]+)"[^>]*>\s*Topic\s*(\d+)\s*<br\s*\/?>\s*<strong>([^<]*)<\/strong>\s*<\/a>/gi
  let m
  while ((m = re.exec(html))) {
    const href = decodeHtml(m[1])
    const url = resolvePmtUrl(href, baseUrl).replace(/\/$/, '') + '/'
    const num = m[2]
    const name = decodeHtml(m[3]).trim()
    const label = `Topic ${num} ${name}`
    if (!topics.some((t) => t.url === url)) {
      topics.push({ parentCode: num, label, url })
    }
  }
  return topics
}

function extractPdfLinks(html) {
  const links = []
  const re = /<a[^>]+href="(https:\/\/pmt\.physicsandmathstutor\.com\/download\/[^"]+\.pdf)"[^>]*>([^<]*)<\/a>/gi
  let m
  while ((m = re.exec(html))) {
    const href = decodeHtml(m[1]).replace(/ /g, '%20')
    const label = decodeHtml(m[2]).trim() || 'PMT PDF'
    if (!links.some((l) => l.href === href)) {
      links.push({ label, href })
    }
  }
  return links
}

function loadSyllabusTopics(code) {
  const file = path.join(PROJECT, 'lib', 'syllabi', `${code}.json`)
  const data = JSON.parse(fs.readFileSync(file, 'utf8'))
  return data.topics
}

function topicToSlug(topicCode, topicName) {
  const namePart = topicName
    .toLowerCase()
    .replace(/['']/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
  return `${topicCode.replace(/\./g, '-')}-${namePart}`
}

function buildExternalResources(topicPage, pdfs) {
  const items = [
    {
      label: 'PMT topic page (notes & flashcards — external)',
      href: topicPage.url,
    },
  ]
  for (const pdf of pdfs) {
    items.push({
      label: `PMT: ${pdf.label} (PDF, external)`,
      href: pdf.href,
    })
  }
  return items
}

function mergeResourcesSection(lesson, externalItems) {
  const sections = [...lesson.sections]
  const idx = sections.findIndex((s) => s.type === 'resources')
  const pmtOnly = externalItems.filter((i) => i.label.includes('PMT'))
  if (idx === -1) {
    sections.push({ type: 'resources', items: pmtOnly })
  } else {
    const existing = sections[idx]
    const kept = existing.items.filter((i) => !i.label.includes('PMT'))
    sections[idx] = { type: 'resources', items: [...kept, ...pmtOnly] }
  }
  return { ...lesson, sections }
}

async function main() {
  const indexUrl = PMT_INDEX[subjectCode]
  console.log(`Fetching PMT index: ${indexUrl}`)
  const indexHtml = await fetchHtml(indexUrl)
  const topicPages = extractTopicPagesFromIndex(indexHtml, indexUrl)
  console.log(`Found ${topicPages.length} topic pages on index\n`)

  const syllabusTopics = loadSyllabusTopics(subjectCode)
  const byParent = Object.fromEntries(
    topicPages.filter((t) => t.parentCode).map((t) => [t.parentCode, t])
  )

  const manifest = {
    subjectCode,
    source: indexUrl,
    disclaimer:
      'External links only. PMT content is copyrighted — do not scrape or republish.',
    mappedAt: new Date().toISOString(),
    parents: {},
  }

  for (const [parentCode, topicPage] of Object.entries(byParent)) {
    console.log(`  Topic ${parentCode}: ${topicPage.url}`)
    await sleep(800)
    let pdfs = []
    try {
      const html = await fetchHtml(topicPage.url)
      pdfs = extractPdfLinks(html)
      console.log(`    ${pdfs.length} PDF link(s)`)
    } catch (err) {
      console.warn(`    skip detail fetch: ${err.message}`)
    }

    manifest.parents[parentCode] = {
      label: topicPage.label,
      topicPage: topicPage.url,
      pdfs,
      externalResources: buildExternalResources(topicPage, pdfs),
      leafTopicCodes: syllabusTopics
        .filter((t) => t.parent === parentCode || t.code.startsWith(`${parentCode}.`))
        .map((t) => t.code),
    }
  }

  const outDir = path.join(PROJECT, 'lib', 'courses', 'external')
  fs.mkdirSync(outDir, { recursive: true })
  const manifestPath = path.join(outDir, `pmt-${subjectCode}.json`)

  if (!dryRun) {
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n')
    console.log(`\nWrote ${path.relative(PROJECT, manifestPath)}`)
  }

  if (apply) {
    const courseDir = path.join(PROJECT, 'content', 'courses', subjectCode)
    let updated = 0
    for (const topic of syllabusTopics) {
      const parent = topic.parent || topic.code.split('.')[0]
      const parentEntry = manifest.parents[parent]
      if (!parentEntry) continue

      const slug = topicToSlug(topic.code, topic.name)
      const lessonPath = path.join(courseDir, `${slug}.json`)
      if (!fs.existsSync(lessonPath)) continue

      const lesson = JSON.parse(fs.readFileSync(lessonPath, 'utf8'))
      const merged = mergeResourcesSection(lesson, parentEntry.externalResources)
      if (!dryRun) {
        fs.writeFileSync(lessonPath, JSON.stringify(merged, null, 2) + '\n')
      }
      updated++
    }
    console.log(`${dryRun ? 'Would update' : 'Updated'} ${updated} lesson JSON files`)
  } else {
    console.log('\nRun with --apply to add PMT external links to lesson resources sections.')
  }

  console.log(`
IMPORTANT: This script does NOT extract PMT notes or flashcards for your course pages.
To build original lessons + flashcards from YOUR material:
  1. Save your own summaries → content/source-notes/${subjectCode}/
  2. pnpm course:from-notes -- --code ${subjectCode} --diagrams
`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
