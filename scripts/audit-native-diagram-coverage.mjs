#!/usr/bin/env node
/** Verify native diagrams cover topics with placeholder GeoGebra embeds. */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')

async function main() {
  const { INTERACTIVE_EMBED_CATALOG, INTERACTIVE_EMBED_CATALOG_ALL } = await import(
    '../lib/courses/interactive-embeds.ts'
  )
  const { hasLessonLiveDiagram } = await import('../lib/courses/lesson-diagrams.ts')
  const { isPlaceholderInteractiveEmbed, PHET_RETAIN_WITH_NATIVE } = await import(
    '../lib/courses/placeholder-embeds.ts'
  )
  const { resolveVisualCatalogSlug } = await import('../lib/courses/visual-slug-aliases.ts')

  const placeholderSlugs = Object.entries(INTERACTIVE_EMBED_CATALOG_ALL)
    .filter(([, embed]) => isPlaceholderInteractiveEmbed(embed))
    .map(([slug]) => slug)

  const missingNative = placeholderSlugs.filter((slug) => !hasLessonLiveDiagram(slug))

  const staleRaw = Object.entries(INTERACTIVE_EMBED_CATALOG_ALL)
    .filter(([, embed]) => embed.provider === 'geogebra' || embed.provider === 'phet')
    .map(([slug]) => slug)
    .filter((slug) => {
      if (!hasLessonLiveDiagram(slug)) return false
      if (PHET_RETAIN_WITH_NATIVE.has(slug)) return false
      const alias = resolveVisualCatalogSlug(slug)
      if (alias !== slug && PHET_RETAIN_WITH_NATIVE.has(alias)) return false
      return true
    })

  console.log('\nNative diagram coverage audit')
  console.log('='.repeat(50))
  console.log(`Raw catalog entries:               ${Object.keys(INTERACTIVE_EMBED_CATALOG_ALL).length}`)
  console.log(`Runtime catalog entries:           ${Object.keys(INTERACTIVE_EMBED_CATALOG).length}`)
  console.log(`Filtered (native-primary):         ${staleRaw.length}`)
  console.log(`Placeholder embed slugs in catalog: ${placeholderSlugs.length}`)
  console.log(`Missing native diagram:            ${missingNative.length}`)
  console.log('='.repeat(50))

  if (missingNative.length) {
    console.log('\nMissing native diagram:')
    for (const s of missingNative) console.log(`  ${s}`)
  }

  const reportDir = path.join(ROOT, 'docs', 'content-generation')
  fs.mkdirSync(reportDir, { recursive: true })
  fs.writeFileSync(
    path.join(reportDir, 'native-diagram-coverage.json'),
    JSON.stringify(
      {
        rawCatalog: Object.keys(INTERACTIVE_EMBED_CATALOG_ALL).length,
        runtimeCatalog: Object.keys(INTERACTIVE_EMBED_CATALOG).length,
        filteredByNative: staleRaw,
        placeholderSlugs,
        missingNative,
      },
      null,
      2
    )
  )

  if (missingNative.length) process.exit(1)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
