/**
 * Renders Instagram post PNGs from scripts/social/posts.ts.
 *
 *   pnpm social            # render every post
 *   pnpm social 01 04      # render only slugs containing "01" or "04"
 *
 * Output: out/social/<slug>.png (1080x1350, Instagram 4:5) plus captions.md.
 */

import fs from 'node:fs'
import path from 'node:path'
import { chromium } from 'playwright'

import { POSTS, VERIFY } from './posts'
import { CANVAS, render } from './templates'

const OUT = path.join(process.cwd(), 'out', 'social')

/** True when any field of the post still holds a VERIFY placeholder. */
function needsVerify(post: unknown): boolean {
  return JSON.stringify(post).includes(VERIFY)
}

async function main() {
  const filters = process.argv.slice(2)
  const posts = filters.length
    ? POSTS.filter((p) => filters.some((f) => p.slug.includes(f)))
    : POSTS

  if (!posts.length) {
    console.error(`No posts matched: ${filters.join(', ')}`)
    process.exit(1)
  }

  fs.mkdirSync(OUT, { recursive: true })

  const browser = await chromium.launch()
  const page = await browser.newPage({
    viewport: CANVAS,
    deviceScaleFactor: 2, // 2160x2700 — Instagram downsamples, never upsamples
  })

  const unverified: string[] = []

  for (const post of posts) {
    await page.setContent(render(post), { waitUntil: 'load' })
    // Web fonts arrive after load; without this the first render falls back.
    await page.evaluate(() => document.fonts.ready).catch(() => {})
    await page.waitForTimeout(350)

    // Long scripts would otherwise push the footer off the canvas. Shrink the
    // handwriting until the page fits, rather than guessing a budget per post.
    // Passed as a source string on purpose: tsx compiles inline evaluate
    // callbacks with a __name helper that does not exist in the page.
    const lead: number | null = await page.evaluate(`(function () {
      var frame = document.querySelector('.frame')
      var works = Array.prototype.slice.call(document.querySelectorAll('.work'))
      if (!frame || !works.length) return null
      function fits() {
        if (frame.scrollHeight > frame.clientHeight) return false
        // Lines are nowrap, so a narrow column overflows sideways instead.
        // Tolerance absorbs the handwriting jitter, which shifts lines up to
        // 6px right and counts toward scrollWidth; real overflow is far larger.
        for (var j = 0; j < works.length; j++) {
          if (works[j].scrollWidth > works[j].clientWidth + 12) return false
        }
        return true
      }
      var px = parseFloat(getComputedStyle(works[0]).getPropertyValue('--lead'))
      for (var guard = 0; guard < 48 && !fits() && px > 20; guard++) {
        px -= 1
        for (var i = 0; i < works.length; i++) {
          works[i].style.setProperty('--lead', px + 'px')
          works[i].style.setProperty('--fs', Math.round(px * 0.7) + 'px')
        }
      }
      return fits() ? px : -px
    })()`)

    if (lead !== null && lead < 0) {
      console.warn(`  ! ${post.slug}: still overflows at ${-lead}px — shorten the answer`)
    }

    const file = path.join(OUT, `${post.slug}.png`)
    await page.screenshot({ path: file })

    const flag = needsVerify(post) ? '  ← has FILL IN slots' : ''
    if (needsVerify(post)) unverified.push(post.slug)
    console.log(`  ${post.slug}.png${flag}`)
  }

  await browser.close()

  const captions = posts
    .map((p) => `## ${p.slug}\n\n${p.caption}\n`)
    .join('\n---\n\n')
  fs.writeFileSync(path.join(OUT, 'captions.md'), captions)

  console.log(`\n${posts.length} post(s) → out/social/`)
  console.log('Captions → out/social/captions.md')

  if (unverified.length) {
    console.log(`\nNot ready to post — fill the VERIFY slots first:`)
    for (const slug of unverified) {
      const post = POSTS.find((p) => p.slug === slug)
      console.log(`  ${slug}: ${post?.verify ?? 'contains a placeholder'}`)
    }
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
