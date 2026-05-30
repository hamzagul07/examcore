#!/usr/bin/env node
/**
 * Stitch marking-result-1..4.png → marking-result.png for the landing hero.
 * Run: node scripts/stitch-landing-screenshot.mjs
 */
import sharp from 'sharp'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const dir = join(__dirname, '..', 'public', 'landing-screenshots')
const parts = ['marking-result-1.png', 'marking-result-2.png', 'marking-result-3.png', 'marking-result-4.png']

const metas = await Promise.all(
  parts.map(async (name) => {
    const path = join(dir, name)
    const meta = await sharp(path).metadata()
    return { path, width: meta.width ?? 0, height: meta.height ?? 0 }
  })
)

const width = Math.max(...metas.map((m) => m.width))
let totalHeight = 0
for (const m of metas) totalHeight += m.height

const composites = []
let top = 0
for (const m of metas) {
  composites.push({ input: m.path, top, left: 0 })
  top += m.height
}

await sharp({
  create: {
    width,
    height: totalHeight,
    channels: 4,
    background: { r: 245, g: 240, b: 232, alpha: 1 },
  },
})
  .composite(composites)
  .png({ compressionLevel: 9 })
  .toFile(join(dir, 'marking-result.png'))

console.log(`Wrote marking-result.png (${width}×${totalHeight})`)
