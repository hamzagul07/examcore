#!/usr/bin/env node
/** Verify native diagrams cover topics with placeholder GeoGebra embeds. */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')

async function main() {
  const { INTERACTIVE_EMBED_CATALOG } = await import('../lib/courses/interactive-embeds.ts')
  const { hasLessonLiveDiagram } = await import('../lib/courses/lesson-diagrams.ts')
  const { isPlaceholderInteractiveEmbed } = await import('../lib/courses/placeholder-embeds.ts')
  const { getCatalogInteractiveEmbed } = await import('../lib/courses/interactive-embeds.ts')

  const placeholderSlugs = Object.entries(INTERACTIVE_EMBED_CATALOG)
    .filter(([, embed]) => isPlaceholderInteractiveEmbed(embed))
    .map(([slug]) => slug)

  const missingNative = placeholderSlugs.filter((slug) => !hasLessonLiveDiagram(slug))
  const staleCatalog = Object.entries(INTERACTIVE_EMBED_CATALOG)
    .filter(([, embed]) => embed.provider === 'geogebra')
    .map(([slug]) => slug)
    .filter((slug) => hasLessonLiveDiagram(slug) && getCatalogInteractiveEmbed(slug))

  console.log('\nNative diagram coverage audit')
  console.log('='.repeat(50))
  console.log(`Placeholder embed slugs in catalog: ${placeholderSlugs.length}`)
  console.log(`Missing native diagram:            ${missingNative.length}`)
  console.log(`Stale (native + catalog embed):    ${staleCatalog.length}`)
  console.log('='.repeat(50))

  if (missingNative.length) {
    console.log('\nMissing native diagram:')
    for (const s of missingNative) console.log(`  ${s}`)
  }
  if (staleCatalog.length) {
    console.log('\nStale catalog entries (should prune):')
    for (const s of staleCatalog) console.log(`  ${s}`)
  }

  const reportDir = path.join(ROOT, 'docs', 'content-generation')
  fs.mkdirSync(reportDir, { recursive: true })
  fs.writeFileSync(
    path.join(reportDir, 'native-diagram-coverage.json'),
    JSON.stringify({ placeholderSlugs, missingNative, staleCatalog }, null, 2)
  )

  if (missingNative.length) process.exit(1)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
