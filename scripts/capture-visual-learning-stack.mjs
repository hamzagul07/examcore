import { chromium } from 'playwright'
import fs from 'fs'
import path from 'path'

const BASE = process.env.BASE_URL ?? 'http://localhost:3000'
const OUT = path.join(process.cwd(), 'screenshots', 'lesson-restructure', 'round8')

const LESSONS = [
  '9702/3-1-momentum-and-newtons-laws-of-motion',
  '9702/7-2-transverse-and-longitudinal-waves',
  '9702/14-3-specific-heat-capacity-and-specific-latent-heat',
]

async function main() {
  fs.mkdirSync(OUT, { recursive: true })
  const browser = await chromium.launch()

  for (const lesson of LESSONS) {
    for (const focus of [false, true]) {
      const page = await browser.newPage({ viewport: { width: 1280, height: 900 } })
      await page.goto(`${BASE}/courses/${lesson}`, { waitUntil: 'load', timeout: 120000 })
      await page.waitForSelector('#visual-learning', { timeout: 60000 })

      if (focus) {
        const btn = page.locator('[data-focus-toggle]').first()
        if (await btn.count()) await btn.click()
        await page.waitForTimeout(400)
      }

      const layout = await page.evaluate(() => {
        const grid = document.querySelector('.course-visual-learning-grid')
        const diagram = document.querySelector('.course-visual-learning-diagram')
        const steps = document.querySelector('.course-visual-learning-steps')
        if (!grid || !diagram || !steps) return { error: 'missing elements' }
        const gr = grid.getBoundingClientRect()
        const dr = diagram.getBoundingClientRect()
        const sr = steps.getBoundingClientRect()
        const gs = getComputedStyle(grid)
        return {
          gridDisplay: gs.display,
          gridDirection: gs.flexDirection,
          diagramAboveSteps: dr.bottom <= sr.top + 2,
          diagramWidth: Math.round(dr.width),
          stepsWidth: Math.round(sr.width),
          stacked: dr.top < sr.top && dr.width >= gr.width * 0.9,
        }
      })

      const slug = lesson.replace('/', '-')
      const tag = focus ? 'focus' : 'sidebars'
      await page.locator('#visual-learning').screenshot({
        path: path.join(OUT, `${slug}-visual-learning-${tag}.png`),
      })
      console.log(`${slug} ${tag}:`, JSON.stringify(layout))
      await page.close()
    }
  }

  await browser.close()
  console.log(`Screenshots saved to ${OUT}`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
