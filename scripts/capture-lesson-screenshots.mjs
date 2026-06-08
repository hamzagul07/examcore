/**
 * Capture lesson page screenshots for restructure verification.
 * Usage: node scripts/capture-lesson-screenshots.mjs
 */
import { chromium } from 'playwright'
import fs from 'fs'
import path from 'path'

const BASE = process.env.BASE_URL ?? 'http://localhost:3000'
const OUT = path.join(process.cwd(), 'screenshots', 'lesson-restructure')

const LESSONS = [
  '9702/3-1-momentum-and-newtons-laws-of-motion',
  '9702/7-2-transverse-and-longitudinal-waves',
  '9702/14-3-specific-heat-capacity-and-specific-latent-heat',
]

const VIEWPORTS = [
  { name: 'desktop-sidebars', width: 1440, height: 900, focus: false },
  { name: 'desktop-focus', width: 1440, height: 900, focus: true },
  { name: 'mobile-portrait', width: 390, height: 844, focus: false },
  { name: 'mobile-landscape', width: 844, height: 390, focus: false },
]

const SECTION_IDS = [
  'simple-explanation',
  'visual-learning',
  'key-formulas',
  'full-notes',
  'worked-examples',
  'quick-check',
  'flashcards',
  'key-takeaways',
]

async function main() {
  fs.mkdirSync(OUT, { recursive: true })
  const browser = await chromium.launch()
  const results = []

  for (const lesson of LESSONS) {
    for (const vp of VIEWPORTS) {
      const page = await browser.newPage({ viewport: { width: vp.width, height: vp.height } })
      const url = `${BASE}/courses/${lesson}`
      await page.goto(url, { waitUntil: 'networkidle', timeout: 120000 })

      if (vp.focus) {
        const focusBtn = page.locator('[data-focus-toggle], button:has-text("Focus")').first()
        if (await focusBtn.count()) {
          await focusBtn.click()
          await page.waitForTimeout(400)
        }
      }

      const slug = lesson.replace('/', '-')
      const file = path.join(OUT, `${slug}-${vp.name}.png`)
      await page.screenshot({ path: file, fullPage: true })

      const order = []
      for (const id of SECTION_IDS) {
        if (await page.locator(`#${id}`).count()) order.push(id)
      }

      results.push({ lesson, viewport: vp.name, file, sectionOrder: order })
      await page.close()
    }
  }

  await browser.close()

  const reportPath = path.join(OUT, 'report.json')
  fs.writeFileSync(reportPath, JSON.stringify(results, null, 2))
  console.log(`Saved ${results.length} screenshots to ${OUT}`)
  console.log(`Report: ${reportPath}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
