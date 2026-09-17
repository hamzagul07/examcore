/**
 * Keyboard scrolling in Study Mode — real-browser verification.
 *
 * Study mode turns <main class="lesson-page"> into a fixed, self-scrolling
 * overlay and locks the document, so ArrowDown / PageDown / Space / End must
 * scroll the OVERLAY, not the (now frozen) document. Playwright's
 * keyboard.press dispatches trusted key events, so the browser's native
 * keyboard scrolling is exercised for real, in each engine.
 *
 * Usage:
 *   BASE_URL=http://localhost:3100 node scripts/verify-study-scroll.mjs
 *   node scripts/verify-study-scroll.mjs --browser=firefox
 *   node scripts/verify-study-scroll.mjs --all
 *
 * Exits non-zero when any check fails. Prints a PASS/FAIL table per scenario
 * per engine, plus focus/scroll diagnostics for every failing step.
 */
import { chromium, firefox, webkit } from 'playwright'

const BASE = process.env.BASE_URL ?? 'http://localhost:3100'
const LESSON = process.env.LESSON ?? '/courses/9709/5-5-the-normal-distribution'
const STUDY_PREF_KEY = 'ms:study-mode'
const VIEWPORT = { width: 1280, height: 900 }

const args = process.argv.slice(2)
const wantAll = args.includes('--all')
const browserArg = args.find((a) => a.startsWith('--browser='))?.split('=')[1]
const engines = wantAll
  ? ['chromium', 'firefox', 'webkit']
  : [browserArg ?? process.env.BROWSER ?? 'chromium']
const LAUNCHERS = { chromium, firefox, webkit }

const OVERLAY = 'main.lesson-page[data-study="on"]'

// ── page helpers ───────────────────────────────────────────────────────────

/** Where focus is, and what the two candidate scrollports are doing. */
async function diag(page) {
  return page.evaluate((sel) => {
    const a = document.activeElement
    const desc = (el) =>
      el
        ? `${el.tagName.toLowerCase()}${el.id ? '#' + el.id : ''}${
            el.className && typeof el.className === 'string'
              ? '.' + el.className.trim().split(/\s+/).slice(0, 2).join('.')
              : ''
          }`
        : 'null'
    const overlay = document.querySelector(sel)
    return {
      active: desc(a),
      activeInOverlay: !!(overlay && a && overlay.contains(a)),
      overlayHasFocus: !!(overlay && a === overlay),
      overlayScrollTop: overlay ? Math.round(overlay.scrollTop) : null,
      overlayMax: overlay ? overlay.scrollHeight - overlay.clientHeight : null,
      docScrollTop: Math.round(document.documentElement.scrollTop),
      study: document.documentElement.dataset.lessonStudy ?? null,
      dialogOpen: !!document.querySelector('[role="dialog"][aria-modal="true"]'),
    }
  }, OVERLAY)
}

const overlayTop = (page) =>
  page.evaluate((sel) => document.querySelector(sel)?.scrollTop ?? null, OVERLAY)
const docTop = (page) => page.evaluate(() => document.documentElement.scrollTop)

/** Wait until a scroll position stops moving (keyboard scrolls animate). */
async function settle(page, read, { timeout = 1500 } = {}) {
  const start = Date.now()
  let prev = await read(page)
  while (Date.now() - start < timeout) {
    await page.waitForTimeout(120)
    const cur = await read(page)
    if (cur === prev) return cur
    prev = cur
  }
  return prev
}

/** Press a key and return the overlay/document scroll positions before and after. */
async function pressAndMeasure(page, key, read = overlayTop, times = 1) {
  const before = await read(page)
  for (let i = 0; i < times; i++) {
    await page.keyboard.press(key)
    await page.waitForTimeout(60)
  }
  const after = await settle(page, read)
  return { before, after }
}

/** Mounted + hydrated: the study effect stamps <html data-lesson-study>. */
async function waitHydrated(page) {
  await page.waitForFunction(
    () => document.documentElement.dataset.lessonStudy !== undefined,
    null,
    { timeout: 60000 }
  )
}

async function waitStudyOn(page) {
  await page.waitForSelector(OVERLAY, { timeout: 15000 })
  // Give the focus-claiming rAFs a chance to run.
  await page.waitForTimeout(250)
}

async function gotoLesson(page, path = LESSON) {
  await page.goto(`${BASE}${path}`, { waitUntil: 'networkidle', timeout: 120000 })
  await waitHydrated(page)
}

async function clickStudyOn(page) {
  const on = page.locator('.study-toggle [role="radio"]', { hasText: 'ON' }).first()
  await on.click()
  await waitStudyOn(page)
}

// ── scenarios ──────────────────────────────────────────────────────────────
// Each returns { ok, note } and may throw; a throw is a FAIL with the message.
// `ctx` factory options: { studyPref } seeds localStorage before navigation.

const scenarios = [
  {
    id: 'a',
    name: 'Toggle ON via mode bar → arrows / PgDn / Space / End / Home scroll overlay',
    async run({ newPage }) {
      const page = await newPage()
      await gotoLesson(page)
      await clickStudyOn(page)
      const notes = []
      const d0 = await diag(page)
      notes.push(`after toggle: ${JSON.stringify(d0)}`)

      const down = await pressAndMeasure(page, 'ArrowDown', overlayTop, 3)
      const okDown = down.after > down.before
      notes.push(`ArrowDown x3: ${down.before} → ${down.after}`)

      const up = await pressAndMeasure(page, 'ArrowUp')
      const okUp = up.after < up.before
      notes.push(`ArrowUp: ${up.before} → ${up.after}`)

      const pgdn = await pressAndMeasure(page, 'PageDown')
      const okPgDn = pgdn.after > pgdn.before
      notes.push(`PageDown: ${pgdn.before} → ${pgdn.after}`)

      const space = await pressAndMeasure(page, 'Space')
      const okSpace = space.after > space.before
      notes.push(`Space: ${space.before} → ${space.after}`)

      const end = await pressAndMeasure(page, 'End')
      const d1 = await diag(page)
      const okEnd = d1.overlayMax !== null && Math.abs(end.after - d1.overlayMax) <= 4
      notes.push(`End: ${end.before} → ${end.after} (max ${d1.overlayMax})`)

      const home = await pressAndMeasure(page, 'Home')
      const okHome = home.after === 0
      notes.push(`Home: ${home.before} → ${home.after}`)

      const doc = await docTop(page)
      const okDoc = doc === 0
      notes.push(`document.scrollTop after all keys: ${doc}`)
      if (!(okDown && okUp && okPgDn && okSpace && okEnd && okHome && okDoc)) {
        notes.push(`diag: ${JSON.stringify(await diag(page))}`)
      }
      return { ok: okDown && okUp && okPgDn && okSpace && okEnd && okHome && okDoc, notes }
    },
  },
  {
    id: 'b',
    name: 'Direct load with pref ON → ArrowDown scrolls with no click',
    async run({ newPage }) {
      const page = await newPage({ studyPref: '1' })
      await gotoLesson(page)
      await waitStudyOn(page)
      const notes = [`on load: ${JSON.stringify(await diag(page))}`]
      const r = await pressAndMeasure(page, 'ArrowDown', overlayTop, 3)
      notes.push(`ArrowDown x3: ${r.before} → ${r.after}; doc ${await docTop(page)}`)
      return { ok: r.after > r.before && (await docTop(page)) === 0, notes }
    },
  },
  {
    id: 'c',
    name: 'Reload with pref ON → still scrolls',
    async run({ newPage }) {
      const page = await newPage({ studyPref: '1' })
      await gotoLesson(page)
      await waitStudyOn(page)
      await page.reload({ waitUntil: 'networkidle' })
      await waitHydrated(page)
      await waitStudyOn(page)
      const notes = [`after reload: ${JSON.stringify(await diag(page))}`]
      const r = await pressAndMeasure(page, 'ArrowDown', overlayTop, 3)
      notes.push(`ArrowDown x3: ${r.before} → ${r.after}`)
      return { ok: r.after > r.before, notes }
    },
  },
  {
    id: 'd',
    name: 'Click plain paragraph in overlay (non-focusable) → ArrowDown scrolls',
    async run({ newPage }) {
      const page = await newPage({ studyPref: '1' })
      await gotoLesson(page)
      await waitStudyOn(page)
      const para = page.locator(`${OVERLAY} .note-p p, ${OVERLAY} .simple-lead-text p`).first()
      await para.click()
      await page.waitForTimeout(200)
      const notes = [`after click: ${JSON.stringify(await diag(page))}`]
      const r = await pressAndMeasure(page, 'ArrowDown', overlayTop, 3)
      notes.push(`ArrowDown x3: ${r.before} → ${r.after}`)
      return { ok: r.after > r.before, notes }
    },
  },
  {
    id: 'e',
    name: 'Click a plain button in overlay (worked-example reveal) → ArrowDown scrolls',
    async run({ newPage }) {
      const page = await newPage({ studyPref: '1' })
      await gotoLesson(page)
      await waitStudyOn(page)
      // A button that does not own the arrow keys (unlike the segmented
      // radios, which use arrows to move between options by design).
      const btn = page.locator(`${OVERLAY} button.worked-reveal, ${OVERLAY} button.faq-q`).first()
      await btn.click()
      await page.waitForTimeout(200)
      const notes = [`after click: ${JSON.stringify(await diag(page))}`]
      const r = await pressAndMeasure(page, 'ArrowDown', overlayTop, 3)
      notes.push(`ArrowDown x3: ${r.before} → ${r.after}`)
      return { ok: r.after > r.before, notes }
    },
  },
  {
    id: 'f',
    name: 'Open Aa reading menu, Escape → study stays ON and ArrowDown still scrolls',
    async run({ newPage }) {
      const page = await newPage({ studyPref: '1' })
      await gotoLesson(page)
      await waitStudyOn(page)
      await page.locator(`${OVERLAY} details.reading-menu summary`).click()
      await page.waitForTimeout(150)
      const notes = [`menu open: ${JSON.stringify(await diag(page))}`]
      await page.keyboard.press('Escape')
      await page.waitForTimeout(300)
      const d = await diag(page)
      notes.push(`after Escape: ${JSON.stringify(d)}`)
      const menuOpen = await page.evaluate(() => document.querySelector('details.reading-menu')?.open)
      notes.push(`menu still open: ${menuOpen}`)
      if (d.study !== 'on') {
        notes.push('Escape with the menu open EXITED study mode')
        return { ok: false, notes }
      }
      const r = await pressAndMeasure(page, 'ArrowDown', overlayTop, 3)
      notes.push(`ArrowDown x3: ${r.before} → ${r.after}`)
      return { ok: r.after > r.before && menuOpen === false, notes }
    },
  },
  {
    id: 'g',
    name: 'Focus a textarea in overlay → ArrowDown does NOT scroll the pane',
    async run({ newPage }) {
      const page = await newPage({ studyPref: '1' })
      await gotoLesson(page)
      await waitStudyOn(page)
      const ta = page.locator(`${OVERLAY} textarea`).first()
      if (!(await ta.count())) {
        return { ok: false, notes: ['no textarea found in this lesson'] }
      }
      await ta.scrollIntoViewIfNeeded()
      await ta.click()
      await page.waitForTimeout(200)
      const notes = [`after focus: ${JSON.stringify(await diag(page))}`]
      const r = await pressAndMeasure(page, 'ArrowDown', overlayTop, 3)
      notes.push(`ArrowDown x3: ${r.before} → ${r.after}`)
      const stillFocused = await page.evaluate(() => document.activeElement?.tagName === 'TEXTAREA')
      return { ok: r.after === r.before && stillFocused, notes }
    },
  },
  {
    id: 'h',
    name: 'Quick-check widget: focus inside → ArrowDown moves focus to next .qc-head',
    async run({ newPage }) {
      const page = await newPage({ studyPref: '1' })
      await gotoLesson(page)
      await waitStudyOn(page)
      const heads = page.locator(`${OVERLAY} .qc-head`)
      const n = await heads.count()
      if (n < 2) return { ok: false, notes: [`only ${n} .qc-head cards`] }
      await heads.first().scrollIntoViewIfNeeded()
      await heads.first().click()
      await page.waitForTimeout(200)
      const notes = [`after click: ${JSON.stringify(await diag(page))}`]
      await page.keyboard.press('ArrowDown')
      await page.waitForTimeout(300)
      const idx = await page.evaluate(() => {
        const all = Array.from(document.querySelectorAll('.qc-head'))
        return all.indexOf(document.activeElement)
      })
      notes.push(`focused .qc-head index after ArrowDown: ${idx}`)
      return { ok: idx === 1, notes }
    },
  },
  {
    id: 'i',
    name: 'Modal Sheet open in study mode → ArrowDown must not scroll; close → scrolls',
    async run() {
      // No Sheet (UpgradeModal / Dialog) is reachable from a lesson page
      // without signing in: UpgradeModal is only mounted by /mark and the
      // chat panel. Recorded honestly rather than faked.
      return { ok: null, notes: ['not testable unauthenticated — no Sheet reachable on a public lesson page'] }
    },
  },
  {
    id: 'i2',
    name: 'SYNTHETIC dialog ([role=dialog][aria-modal]) injected into body → ArrowDown must not scroll overlay; removed → scrolls',
    async run({ newPage }) {
      const page = await newPage({ studyPref: '1' })
      await gotoLesson(page)
      await waitStudyOn(page)
      // Mirrors what Sheet does: a portal in document.body (outside the
      // overlay) with focus moved into it.
      await page.evaluate(() => {
        const d = document.createElement('div')
        d.id = 'synthetic-dialog'
        d.setAttribute('role', 'dialog')
        d.setAttribute('aria-modal', 'true')
        d.style.cssText = 'position:fixed;inset:0;z-index:999;background:rgba(0,0,0,.3)'
        d.innerHTML = '<button id="synthetic-close" type="button">close</button>'
        document.body.appendChild(d)
        document.getElementById('synthetic-close').focus()
      })
      await page.waitForTimeout(150)
      const notes = [`dialog open: ${JSON.stringify(await diag(page))}`]
      const r1 = await pressAndMeasure(page, 'ArrowDown', overlayTop, 3)
      notes.push(`ArrowDown x3 with dialog: ${r1.before} → ${r1.after}`)
      await page.evaluate(() => document.getElementById('synthetic-dialog')?.remove())
      await page.waitForTimeout(300)
      notes.push(`dialog removed: ${JSON.stringify(await diag(page))}`)
      const r2 = await pressAndMeasure(page, 'ArrowDown', overlayTop, 3)
      notes.push(`ArrowDown x3 after close: ${r2.before} → ${r2.after}`)
      return { ok: r1.after === r1.before && r2.after > r2.before, notes }
    },
  },
  {
    id: 'j',
    name: 'Client navigation to next lesson with study ON → ArrowDown scrolls, no click',
    async run({ newPage }) {
      const page = await newPage({ studyPref: '1' })
      await gotoLesson(page)
      await waitStudyOn(page)
      const next = page.locator(`${OVERLAY} .prevnext a.pn-btn.right`).first()
      if (!(await next.count())) return { ok: false, notes: ['no next-lesson link'] }
      const href = await next.getAttribute('href')
      await next.click()
      await page.waitForURL((u) => u.pathname === href, { timeout: 60000 })
      await page.waitForLoadState('networkidle')
      await waitHydrated(page)
      await waitStudyOn(page)
      await page.waitForTimeout(400)
      const notes = [`on ${href}: ${JSON.stringify(await diag(page))}`]
      const r = await pressAndMeasure(page, 'ArrowDown', overlayTop, 3)
      notes.push(`ArrowDown x3: ${r.before} → ${r.after}`)
      return { ok: r.after > r.before, notes }
    },
  },
  {
    id: 'm',
    name: 'Focused FAQ button: Space activates it (no pane scroll), ArrowDown scrolls',
    async run({ newPage }) {
      const page = await newPage({ studyPref: '1' })
      await gotoLesson(page)
      await waitStudyOn(page)
      const faq = page.locator(`${OVERLAY} button.faq-q`).first()
      if (!(await faq.count())) return { ok: null, notes: ['lesson has no FAQ buttons'] }
      await faq.scrollIntoViewIfNeeded()
      await faq.click()
      // WebKit (like Safari) does not focus a button on mouse click; a keyboard
      // user reaches it by Tab, so put focus there explicitly in every engine.
      await faq.focus()
      await page.waitForTimeout(200)
      const expandedAfterClick = await faq.getAttribute('aria-expanded')
      const notes = [`after click: ${JSON.stringify(await diag(page))}, aria-expanded=${expandedAfterClick}`]
      const sp = await pressAndMeasure(page, 'Space')
      const expandedAfterSpace = await faq.getAttribute('aria-expanded')
      notes.push(`Space: scrollTop ${sp.before} → ${sp.after}; aria-expanded ${expandedAfterClick} → ${expandedAfterSpace}`)
      const r = await pressAndMeasure(page, 'ArrowDown', overlayTop, 3)
      notes.push(`ArrowDown x3: ${r.before} → ${r.after}`)
      const toggled = expandedAfterSpace !== expandedAfterClick
      return { ok: toggled && sp.after === sp.before && r.after > r.before, notes }
    },
  },
  {
    id: 'k',
    name: 'Study OFF → ArrowDown scrolls the document (no regression)',
    async run({ newPage }) {
      const page = await newPage({ studyPref: '0' })
      await gotoLesson(page)
      const notes = [`on load: ${JSON.stringify(await diag(page))}`]
      const r = await pressAndMeasure(page, 'ArrowDown', docTop, 3)
      notes.push(`ArrowDown x3 (document): ${r.before} → ${r.after}`)
      return { ok: r.after > r.before, notes }
    },
  },
  {
    id: 'l',
    name: 'Boundaries: ArrowUp at 0 stays 0 and throws nothing; ArrowDown at max stays at max',
    async run({ newPage }) {
      const page = await newPage({ studyPref: '1' })
      const errors = []
      page.on('pageerror', (e) => errors.push(String(e)))
      await gotoLesson(page)
      await waitStudyOn(page)
      const up = await pressAndMeasure(page, 'ArrowUp', overlayTop, 2)
      const notes = [`ArrowUp at top: ${up.before} → ${up.after}`]
      await pressAndMeasure(page, 'End')
      const d = await diag(page)
      const down = await pressAndMeasure(page, 'ArrowDown', overlayTop, 2)
      notes.push(`ArrowDown at max: ${down.before} → ${down.after} (max ${d.overlayMax})`)
      notes.push(`page errors: ${errors.length ? errors.join(' | ') : 'none'}`)
      const ok =
        up.after === 0 &&
        d.overlayMax !== null &&
        Math.abs(down.before - d.overlayMax) <= 4 &&
        down.after === down.before &&
        errors.length === 0
      return { ok, notes }
    },
  },
]

// ── runner ─────────────────────────────────────────────────────────────────

async function runEngine(engine) {
  const browser = await LAUNCHERS[engine].launch()
  const rows = []
  for (const sc of scenarios) {
    const pages = []
    const newPage = async ({ studyPref } = {}) => {
      const context = await browser.newContext({ viewport: VIEWPORT })
      if (studyPref !== undefined) {
        await context.addInitScript(
          ([k, v]) => {
            try {
              window.localStorage.setItem(k, v)
            } catch {}
          },
          [STUDY_PREF_KEY, studyPref]
        )
      }
      const page = await context.newPage()
      pages.push(context)
      return page
    }
    let result
    try {
      result = await sc.run({ newPage })
    } catch (err) {
      result = { ok: false, notes: [`threw: ${err?.message ?? err}`] }
    }
    for (const c of pages) await c.close().catch(() => {})
    rows.push({ engine, id: sc.id, name: sc.name, ...result })
  }
  await browser.close()
  return rows
}

function status(ok) {
  return ok === null ? 'SKIP' : ok ? 'PASS' : 'FAIL'
}

async function main() {
  const all = []
  for (const engine of engines) {
    if (!LAUNCHERS[engine]) {
      console.error(`unknown browser: ${engine}`)
      process.exit(2)
    }
    console.log(`\n=== ${engine} ===`)
    const rows = await runEngine(engine)
    for (const r of rows) {
      console.log(`${status(r.ok).padEnd(4)} ${r.id.padEnd(2)} ${r.name}`)
      for (const n of r.notes ?? []) console.log(`       · ${n}`)
    }
    all.push(...rows)
  }

  console.log('\n=== summary ===')
  const header = `${'scenario'.padEnd(9)}${engines.map((e) => e.padEnd(10)).join('')}`
  console.log(header)
  for (const sc of scenarios) {
    const cells = engines.map((e) => status(all.find((r) => r.engine === e && r.id === sc.id)?.ok).padEnd(10))
    console.log(`${sc.id.padEnd(9)}${cells.join('')}`)
  }
  const failed = all.filter((r) => r.ok === false)
  console.log(`\n${failed.length} failed / ${all.length} checks`)
  process.exit(failed.length ? 1 : 0)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
