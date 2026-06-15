#!/usr/bin/env node
/**
 * Remove native-primary entries from INTERACTIVE_EMBED_CATALOG_RAW.
 *
 *   npx tsx scripts/prune-embed-catalog.mjs
 *   npx tsx scripts/prune-embed-catalog.mjs --dry-run
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const CATALOG_FILE = path.join(ROOT, 'lib/courses/interactive-embeds.ts')
const dryRun = process.argv.includes('--dry-run')

const CATALOG_START = 'const INTERACTIVE_EMBED_CATALOG_RAW: Record<string, LessonInteractiveEmbed> = {'
const CATALOG_END = '}\r\n\r\nfunction retainCatalogSlug(slug: string)'

function extractEntries(catalogBody) {
  const entries = []
  let rest = catalogBody

  while (rest.length) {
    rest = rest.replace(/^\s+/, '')
    if (!rest) break

    let comments = ''
    const cm = rest.match(/^(\/\/[^\r\n]*(?:\r\n|\n)(?:\s*(?:\r\n|\n))?)+/)
    if (cm) {
      comments = cm[0]
      rest = rest.slice(cm[0].length).replace(/^\s+/, '')
    }

    const km = rest.match(/^'([^']+)':\s*(phetEntry|geogebraEntry)\(/)
    if (!km) break

    const slug = km[1]
    let depth = 0
    let j = km[0].length - 1
    for (; j < rest.length; j++) {
      const c = rest[j]
      if (c === '(') depth++
      else if (c === ')') {
        depth--
        if (depth === 0) {
          j++
          while (j < rest.length && /[\s,]/.test(rest[j])) j++
          break
        }
      }
    }

    entries.push({
      slug,
      comments,
      entryText: rest.slice(0, j).trimEnd().replace(/,\s*$/, ''),
    })
    rest = rest.slice(j)
  }

  return entries
}

function rebuildCatalogBody(entries) {
  const lines = []
  let lastComments = null

  for (let i = 0; i < entries.length; i++) {
    const { comments, entryText } = entries[i]
    if (comments && comments !== lastComments) {
      const indented = comments
        .trimEnd()
        .split(/\r?\n/)
        .map((line) => (line.trim() ? `  ${line.trim()}` : ''))
        .filter(Boolean)
        .join('\r\n')
      lines.push(indented)
      lastComments = comments
    } else if (!comments) {
      lastComments = null
    }
    lines.push(`  ${entryText},`)
  }

  return `\r\n${lines.join('\r\n')}\r\n`
}

async function main() {
  const { hasLessonLiveDiagram } = await import('../lib/courses/lesson-diagrams.ts')
  const { PHET_RETAIN_WITH_NATIVE } = await import('../lib/courses/placeholder-embeds.ts')
  const { resolveVisualCatalogSlug } = await import('../lib/courses/visual-slug-aliases.ts')

  function retainSlug(slug) {
    if (!hasLessonLiveDiagram(slug)) return true
    if (PHET_RETAIN_WITH_NATIVE.has(slug)) return true
    const alias = resolveVisualCatalogSlug(slug)
    return alias !== slug && PHET_RETAIN_WITH_NATIVE.has(alias)
  }

  const source = fs.readFileSync(CATALOG_FILE, 'utf8')
  const startIdx = source.indexOf(CATALOG_START)
  const endIdx = source.indexOf(CATALOG_END, startIdx)
  if (startIdx < 0 || endIdx < 0) throw new Error('Could not locate catalog block')

  const catalogBody = source.slice(startIdx + CATALOG_START.length, endIdx)
  const entries = extractEntries(catalogBody)
  const kept = entries.filter((e) => retainSlug(e.slug))
  const removed = entries.length - kept.length

  console.log(`Parsed entries: ${entries.length}`)
  console.log(`Keeping:        ${kept.length}`)
  console.log(`Pruning:        ${removed}`)

  if (!removed) {
    console.log('Nothing to prune.')
    return
  }

  const newSource =
    source.slice(0, startIdx + CATALOG_START.length) +
    rebuildCatalogBody(kept) +
    source.slice(endIdx)

  if (dryRun) {
    console.log('Dry run — file not written.')
    return
  }

  fs.writeFileSync(CATALOG_FILE, newSource)
  console.log(`Wrote ${path.relative(ROOT, CATALOG_FILE)}`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
