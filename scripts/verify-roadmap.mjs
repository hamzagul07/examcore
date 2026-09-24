/**
 * Exam Roadmap — real-browser walkthrough.
 *
 * Drives the wizard, the Today screen, every task action, the sheets, the
 * dashboard hero, the Study Mode chip, /api/plan/today, the rebuild path,
 * a few accessibility checks, the offline queue, a carry-over to a chosen
 * day and a second paper for one subject, in a real engine, and prints a
 * PASS/FAIL table. Run it on an account with no plan (delete its
 * study_plans row between runs): with a plan already saved the wizard
 * starts from "Adjust" and the fixture's tuition row doubles. It is non-destructive in the sense that it only
 * ever touches the plan of the account it is given: it never creates or
 * deletes users. Point it at a throwaway account.
 *
 * Usage:
 *   QA_EMAIL=… QA_PASSWORD=… BASE_URL=http://localhost:3100 node scripts/verify-roadmap.mjs
 *   node scripts/verify-roadmap.mjs --browser=firefox
 *   SCREENSHOT_DIR=/tmp/shots REPORT_JSON=/tmp/report.json node scripts/verify-roadmap.mjs
 *
 * Optional env:
 *   QA_TIME_ZONE   the zone typed into the wizard. By default the script picks
 *                  a zone where it is currently early evening (so today's
 *                  evening window still has time in it and the hero is a task).
 *   LESSON         the Study Mode lesson path (default 9709 normal distribution).
 *
 * Exits non-zero when any check fails.
 */
import { chromium, firefox, webkit } from 'playwright'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const BASE = process.env.BASE_URL ?? 'http://localhost:3100'
const EMAIL = process.env.QA_EMAIL
const PASSWORD = process.env.QA_PASSWORD
const LESSON = process.env.LESSON ?? '/courses/9709/5-5-the-normal-distribution'
const SHOTS = process.env.SCREENSHOT_DIR ?? null
const REPORT = process.env.REPORT_JSON ?? null
const VIEWPORT = { width: 1280, height: 900 }
const PHONE = { width: 390, height: 844 }

const args = process.argv.slice(2)
const engine = args.find((a) => a.startsWith('--browser='))?.split('=')[1] ?? process.env.BROWSER ?? 'chromium'
const LAUNCHERS = { chromium, firefox, webkit }

if (!EMAIL || !PASSWORD) {
  console.error('QA_EMAIL and QA_PASSWORD are required (a throwaway account; this script never creates or deletes users).')
  process.exit(2)
}
if (!LAUNCHERS[engine]) {
  console.error(`unknown browser: ${engine}`)
  process.exit(2)
}
if (SHOTS) mkdirSync(SHOTS, { recursive: true })

// ── copy rules ─────────────────────────────────────────────────────────────
// Words the brief forbids on any roadmap surface. "prediction" is allowed only
// in the footer's "not a prediction", so it is checked separately.
const BANNED = /\b(behind|missed|streak|catch(?:ing)? up|failed|everyone else|verified|guaranteed?)\b/i

// ── helpers ────────────────────────────────────────────────────────────────

const shots = []
async function shot(page, name, caption, opts = {}) {
  if (!SHOTS) return
  const path = join(SHOTS, `${name}.png`)
  try {
    await page.screenshot({ path, fullPage: opts.fullPage ?? true })
    shots.push({ path, caption })
  } catch (err) {
    shots.push({ path, caption: `${caption} (screenshot failed: ${err?.message})` })
  }
}

const apiLog = []
function watchApi(context) {
  context.on('response', async (res) => {
    const url = new URL(res.url())
    if (!url.pathname.startsWith('/api/plan')) return
    const entry = {
      at: new Date().toISOString(),
      method: res.request().method(),
      path: url.pathname + url.search,
      status: res.status(),
      cacheControl: res.headers()['cache-control'] ?? null,
      contentType: res.headers()['content-type'] ?? null,
    }
    if (res.status() >= 400) {
      // What the client sent and what the server said: a 409's body tells stale from conflict.
      entry.request = (res.request().postData() ?? '').slice(0, 300)
      try {
        entry.body = (await res.text()).slice(0, 300)
      } catch {
        entry.body = null
      }
    }
    apiLog.push(entry)
  })
}

/** textContent, not innerText: several labels are upper-cased by CSS. */
const tc = async (locator) => ((await locator.evaluate((el) => el.textContent)) ?? '').replace(/\s+/g, ' ').trim()

async function alertText(page) {
  const alerts = await page.locator('[role="alert"]').allTextContents()
  return alerts.map((a) => a.replace(/\s+/g, ' ').trim()).filter(Boolean).join(' // ')
}

/** Close a "what changed" sheet left open by an action (swap, check-in, replan) so the next click lands. */
async function settleSheets(page) {
  const diff = page.locator('[role="dialog"][aria-modal="true"]', { hasText: /was adjusted/ })
  if (await diff.count()) {
    await diff.locator('button', { hasText: 'Fine by me' }).click().catch(() => {})
  }
  await page.locator('[role="dialog"][aria-modal="true"]').first().waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {})
}

function parseRgb(s) {
  const m = /rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:[,\s/]+([\d.]+))?/.exec(s ?? '')
  if (!m) return null
  return { r: +m[1], g: +m[2], b: +m[3], a: m[4] === undefined ? 1 : +m[4] }
}
function luminance({ r, g, b }) {
  const f = (c) => {
    const v = c / 255
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4
  }
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b)
}
function contrast(fg, bg) {
  if (!fg || !bg) return null
  const a = luminance(fg)
  const b = luminance(bg)
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)
}

const consoleErrors = []
const pageErrors = []
function watchErrors(page, label) {
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push({ where: label, text: msg.text().slice(0, 300) })
  })
  page.on('pageerror', (err) => pageErrors.push({ where: label, text: String(err?.message ?? err).slice(0, 300) }))
}

function isoLocal(d = new Date()) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}
function addDays(iso, n) {
  const d = new Date(`${iso}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}
function weekdayUtc(iso) {
  return new Date(`${iso}T00:00:00Z`).getUTCDay() // 0 = Sunday
}
function nextSunday(iso) {
  const w = weekdayUtc(iso)
  const gap = w === 0 ? 7 : 7 - w
  return addDays(iso, gap)
}
function minuteOf(clock) {
  const [h, m] = clock.split(':').map(Number)
  return h * 60 + m
}

/** A zone where it is early evening right now and the date matches the browser's. */
function pickZone(localIso) {
  if (process.env.QA_TIME_ZONE) return process.env.QA_TIME_ZONE
  const candidates = [
    'Europe/London', 'Europe/Paris', 'Europe/Athens', 'Asia/Dubai', 'Asia/Karachi', 'Asia/Kolkata', 'Asia/Dhaka',
    'Asia/Bangkok', 'Asia/Shanghai', 'Asia/Tokyo', 'Australia/Sydney', 'Pacific/Auckland', 'Atlantic/Azores',
    'America/Sao_Paulo', 'America/Halifax', 'America/New_York', 'America/Chicago', 'America/Denver',
    'America/Los_Angeles', 'America/Anchorage', 'Pacific/Honolulu',
  ]
  const now = new Date()
  let best = null
  for (const tz of candidates) {
    const parts = new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false }).formatToParts(now)
    const get = (t) => parts.find((p) => p.type === t)?.value
    const date = `${get('year')}-${get('month')}-${get('day')}`
    const minute = Number(get('hour')) % 24 * 60 + Number(get('minute'))
    if (date !== localIso) continue
    // Evening window is 17:00–22:00; aim for ~17:00–18:30 so the hero still has an hour or more.
    const target = 17 * 60 + 30
    const score = Math.abs(minute - target)
    if (minute >= 17 * 60 && minute <= 19 * 60 + 30 && (!best || score < best.score)) best = { tz, score, minute }
  }
  return best?.tz ?? 'Europe/London'
}

const radio = (page, text, within = page) => within.locator('[role="radio"]', { hasText: text }).first()
const dialog = (page) => page.locator('[role="dialog"][aria-modal="true"]')

async function waitApi(page, method, pathPrefix, timeout = 30000) {
  const res = await page.waitForResponse(
    (r) => r.request().method() === method && new URL(r.url()).pathname === pathPrefix,
    { timeout }
  )
  let body = null
  try {
    body = await res.json()
  } catch {
    body = null
  }
  return { status: res.status(), body, headers: res.headers() }
}

async function bodyText(page) {
  return page.evaluate(() => document.body.innerText)
}

function bannedIn(text) {
  const hits = []
  const re = new RegExp(BANNED.source, 'gi')
  let m
  while ((m = re.exec(text))) {
    hits.push(text.slice(Math.max(0, m.index - 30), m.index + m[0].length + 30).replace(/\s+/g, ' '))
    if (hits.length >= 5) break
  }
  return hits
}

async function signIn(page) {
  await page.goto(`${BASE}/auth/signin`, { waitUntil: 'domcontentloaded', timeout: 120000 })
  // The password field appears only once the "Password" toggle is clicked after hydration; a click that lands
  // before React is listening is lost, so the toggle is pressed again until the field shows.
  for (let attempt = 0; attempt < 8; attempt++) {
    await radio(page, 'Password').click()
    if (await page.locator('#password').waitFor({ timeout: 4000 }).then(() => true, () => false)) break
  }
  await page.fill('#email', EMAIL)
  await page.fill('#password', PASSWORD)
  await page.locator('button[type="submit"]', { hasText: 'Sign in' }).click()
  await page.waitForURL((u) => u.pathname.startsWith('/dashboard'), { timeout: 120000 })
}

async function gotoPlan(page, query = '') {
  await page.goto(`${BASE}/dashboard/plan${query}`, { waitUntil: 'domcontentloaded', timeout: 120000 })
  await page.locator('.ms-rm-setup, .ms-rm-head').first().waitFor({ timeout: 120000 })
}

/** The wizard, whether the account has a plan (Adjust plan) or not. */
async function openWizard(page) {
  await gotoPlan(page)
  if (await page.locator('.ms-rm-setup').count()) return 'fresh'
  await radio(page, 'Roadmap').click()
  await page.locator('button', { hasText: 'Adjust plan' }).click()
  await page.locator('.ms-rm-setup').waitFor()
  return 'adjust'
}

async function openFineTune(page) {
  const fold = page.locator('details.ms-rm-setup-more')
  if (!(await fold.evaluate((el) => el.open))) await fold.locator('summary').click()
  await page.locator('#rm-nostudy-start').waitFor({ state: 'visible', timeout: 5000 })
}

async function clickNext(page) {
  await page.locator('.ms-rm-setup-nav button[type="submit"]', { hasText: 'Next' }).click()
}

async function stepVisible(page, n) {
  await page.locator('.ec-eyebrow', { hasText: `Step ${n} of 5` }).waitFor({ timeout: 20000 })
}

async function ensurePressed(btn) {
  if ((await btn.getAttribute('aria-pressed')) !== 'true') await btn.click()
}
async function ensureChecked(btn) {
  if ((await btn.getAttribute('aria-checked')) !== 'true') await btn.click()
}

// ── the run ────────────────────────────────────────────────────────────────

const rows = []
const shared = {
  localIso: isoLocal(),
  zone: null,
  planJson: null,
  heroTitle: null,
  startedTaskId: null,
  doneTaskId: null,
  sample: null,
  swapHref: null,
  swapHrefStatus: null,
  minutesBefore: null,
  minutesAfter: null,
}

function record(id, name, ok, notes) {
  rows.push({ id, name, ok, notes })
  console.log(`${(ok === null ? 'SKIP' : ok ? 'PASS' : 'FAIL').padEnd(4)} ${String(id).padEnd(3)} ${name}`)
  for (const n of notes ?? []) console.log(`       · ${n}`)
}

async function step(id, name, fn) {
  const notes = []
  const assert = (cond, msg) => {
    notes.push(`${cond ? 'ok' : 'FAIL'}: ${msg}`)
    if (!cond) assert.failed = true
    return cond
  }
  assert.failed = false
  try {
    const result = await fn(notes, assert)
    if (result === 'skip') return record(id, name, null, notes)
    record(id, name, !assert.failed, notes)
  } catch (err) {
    notes.push(`threw: ${String(err?.message ?? err).split('\n')[0]}`)
    if (step.page) await shot(step.page, `fail-${id}`, `Step ${id} failed here`, { fullPage: false })
    record(id, name, false, notes)
  }
}

async function main() {
  const browser = await LAUNCHERS[engine].launch()
  const context = await browser.newContext({ viewport: VIEWPORT })
  watchApi(context)
  const page = await context.newPage()
  step.page = page
  watchErrors(page, 'desktop')

  await signIn(page)
  const storage = await context.storageState()
  const zone = pickZone(shared.localIso)
  shared.zone = zone
  console.log(`\n=== ${engine} · ${BASE} · zone ${zone} · local date ${shared.localIso} ===`)

  const mathsDate = addDays(shared.localIso, 19)
  const physicsDate = addDays(shared.localIso, 16)
  const sunday = nextSunday(shared.localIso)

  // 1. dashboard with no plan
  await step(1, 'Dashboard without a plan shows the roadmap offer card', async (notes, assert) => {
    await page.goto(`${BASE}/dashboard`, { waitUntil: 'domcontentloaded', timeout: 120000 })
    const offer = page.locator('.ms-plan-offer')
    const hero = page.locator('.ms-rm-hero')
    try {
      await Promise.race([offer.waitFor({ timeout: 120000 }), hero.waitFor({ timeout: 120000 })])
    } catch {
      const text = (await bodyText(page)).replace(/\s+/g, ' ').slice(0, 600)
      assert(false, `neither the offer card nor the hero rendered on /dashboard; page says: ${text}`)
      await shot(page, '01-dashboard-no-offer', 'Dashboard without a plan: no offer card rendered', { fullPage: true })
      return
    }
    if (await hero.count()) {
      notes.push('account already has a plan: the hero renders instead of the offer (re-run on a fresh account to see the offer)')
      await shot(page, '01-dashboard-existing-plan', 'Dashboard for an account that already has a plan')
      return
    }
    const text = await offer.innerText()
    assert(/Build my roadmap/.test(text), 'offer card has "Build my roadmap"')
    assert(/days to go|Get every day/.test(text), `offer headline: ${text.split('\n')[1]?.slice(0, 80)}`)
    await shot(page, '01-dashboard-offer', 'Dashboard with no plan: the roadmap offer card', { fullPage: false })
  })

  // 2. the wizard
  await step(2, 'Wizard: five steps, feasibility, change mode round-trip, build', async (notes, assert) => {
    const how = await openWizard(page)
    notes.push(`entered the wizard via: ${how}`)
    await stepVisible(page, 1)
    const readonly = await page.locator('.ms-rm-setup-readonly').innerText()
    assert(/Cambridge International/.test(readonly) && /A-Level/.test(readonly), `board/qualification prefilled: ${readonly.replace(/\s+/g, ' ')}`)

    const subjects = page.locator('[role="group"][aria-label="Subjects"] button')
    await ensurePressed(subjects.filter({ hasText: /^Mathematics$/ }))
    await ensurePressed(subjects.filter({ hasText: /^Physics$/ }))
    const mathsPressed = await subjects.filter({ hasText: /^Mathematics$/ }).getAttribute('aria-pressed')
    const physPressed = await subjects.filter({ hasText: /^Physics$/ }).getAttribute('aria-pressed')
    assert(mathsPressed === 'true' && physPressed === 'true', 'Mathematics + Physics selected')

    const mathsRow = page.locator('.ms-rm-setup-exam', { has: page.locator('.ms-rm-setup-exam__name', { hasText: /^Mathematics$/ }) })
    const physRow = page.locator('.ms-rm-setup-exam', { has: page.locator('.ms-rm-setup-exam__name', { hasText: /^Physics$/ }) })
    const mathsSelect = mathsRow.locator('select')
    if (await mathsSelect.count()) {
      const options = await mathsSelect.locator('option').allTextContents()
      if (options.includes('Paper 1')) {
        await mathsSelect.selectOption('Paper 1')
        notes.push(`Mathematics component set to Paper 1 (offered: ${options.filter(Boolean).join(', ')})`)
      } else notes.push(`Paper 1 not offered for Mathematics: ${options.join(', ')}`)
    } else notes.push('no component select for Mathematics')
    await mathsRow.locator('input[type="date"]').fill(mathsDate)
    await physRow.locator('input[type="date"]').fill(physicsDate)
    await page.fill('#rm-exam-time-9709', '09:00')
    await page.fill('#rm-exam-time-9702', '09:00')
    const tz = page.locator('input[aria-label="Time zone"]')
    // The zone field offers the browser's zone list and says where its value came from; a typo is caught on blur.
    assert((await tz.getAttribute('list')) === 'rm-zones', 'zone input is backed by the #rm-zones datalist')
    const zoneOptions = await page.locator('datalist#rm-zones option').count()
    assert(zoneOptions > 50, `zone datalist lists ${zoneOptions} zones`)
    await tz.fill('Nowhere/Town')
    await tz.blur()
    assert(/not one we recognise/.test(await tc(page.locator('#rm-issue-timeZone'))), 'a mistyped zone is flagged on blur, next to the field')
    await tz.fill(zone)
    await tz.blur()
    assert((await page.locator('#rm-issue-timeZone').count()) === 0, 'a known zone clears the flag')
    const zoneSource = await tc(page.locator('#rm-zone-source')).catch(() => '')
    assert(/From your device|Use my device/.test(zoneSource), `zone source note: ${zoneSource}`)
    notes.push(`dates: Mathematics ${mathsDate} 09:00, Physics ${physicsDate} 09:00; zone ${zone} (${zoneSource.replace(/\s+/g, ' ')})`)
    const runsTo = await page.locator('.ms-plan-fieldset', { hasText: 'Exam dates' }).locator('.ms-plan-note').innerText().catch(() => '')
    assert(/19 days from today/.test(runsTo), `plan length line: ${runsTo.replace(/\s+/g, ' ')}`)
    await shot(page, '02a-wizard-step1-finish-line', 'Wizard step 1: Finish line with subjects, Paper 1, dates, times and zone')
    await clickNext(page)

    await stepVisible(page, 2)
    const mathsFs = page.locator('fieldset.ms-rm-setup-rating', { has: page.locator('legend', { hasText: /^Mathematics$/ }) })
    const physFs = page.locator('fieldset.ms-rm-setup-rating', { has: page.locator('legend', { hasText: /^Physics$/ }) })
    await radio(page, 'Rusty', mathsFs).click()
    await radio(page, 'Confident', physFs).click()
    assert((await radio(page, 'Rusty', mathsFs).getAttribute('aria-checked')) === 'true', 'Mathematics rated Rusty')
    assert((await radio(page, 'Confident', physFs).getAttribute('aria-checked')) === 'true', 'Physics rated Confident')
    await shot(page, '02b-wizard-step2-position', 'Wizard step 2: Current position, Mathematics Rusty / Physics Confident')
    await clickNext(page)

    await stepVisible(page, 3)
    const weekday = page.locator('[role="group"][aria-label="Weekday minutes"] button')
    const weekend = page.locator('[role="group"][aria-label="Weekend minutes"] button')
    const weekdayLabels = await weekday.allTextContents()
    await weekday.filter({ hasText: /^1 h 30 min$/ }).click()
    // 150 is not one of the wizard's choices; take the nearest offered value.
    const weekendChoice = weekdayLabels.includes('2 h 30 min') ? '2 h 30 min' : '2 h'
    await weekend.filter({ hasText: new RegExp(`^${weekendChoice}$`) }).click()
    notes.push(`weekday 1 h 30 min; weekend ${weekendChoice} (choices offered: ${weekdayLabels.join(' | ')})`)
    const evening = page.locator('[role="group"][aria-label="Weekdays: preferred times"] button', { hasText: 'Evening' })
    await ensurePressed(evening)
    const weekendEvening = page.locator('[role="group"][aria-label="Weekends: preferred times"] button', { hasText: 'Evening' })
    await ensurePressed(weekendEvening)
    assert((await evening.getAttribute('aria-pressed')) === 'true', 'weekday Evening window on')
    await radio(page, '40 min').click()
    await ensureChecked(radio(page, 'Standard'))
    await page.locator('button', { hasText: 'Add a commitment' }).click()
    await page.locator('input[aria-label="Commitment name"]').last().fill('Tuition')
    await page.locator('[role="group"][aria-label="Tuition days"] button', { hasText: /^Tue$/ }).click()
    const commitmentStart = page.locator('input[id^="rm-commitment-"][id$="-start"]').last()
    const commitmentEnd = page.locator('input[id^="rm-commitment-"][id$="-end"]').last()
    await commitmentStart.fill('17:00')
    await commitmentEnd.fill('19:00')
    // Break rhythm, the no-study span, quiet hours and days away sit under one closed fold on a fresh wizard;
    // the reminder time is asked on step 4, under the check-in box, not here.
    assert((await page.locator('#rm-reminder').count()) === 0, 'step 3 does not ask for a reminder time')
    const fold = page.locator('details.ms-rm-setup-more')
    assert((await fold.count()) === 1, 'step 3 has the fine-tune fold')
    assert(!(await fold.evaluate((el) => el.open)), 'fine-tune fold is closed on a fresh wizard')
    assert(!(await page.locator('#rm-nostudy-start').isVisible()), 'no-study span is hidden until the fold opens')
    await shot(page, '02c-wizard-step3-collapsed', 'Wizard step 3: minutes, windows, session and commitments open; fine-tune folded')
    await openFineTune(page)
    await page.fill('#rm-nostudy-start', '22:30')
    await page.fill('#rm-nostudy-end', '07:00')
    const quiet = `${await page.inputValue('#rm-quiet-start')}–${await page.inputValue('#rm-quiet-end')}`
    await page.locator('input[aria-label="A date you\'re away"]').fill(sunday)
    await page.locator('button', { hasText: /^Add day$/ }).click()
    const away = await page.locator('ul[aria-label="Days away"] li').allTextContents()
    assert(away.length === 1, `day away added: ${away.join(', ')} (${sunday})`)
    notes.push(`session 40, breaks Standard, Tuition Tue 17:00–19:00, no study 22:30–07:00, quiet ${quiet} (default)`)
    await shot(page, '02c-wizard-step3-availability', 'Wizard step 3: availability with tuition, sleep span and a day away')
    await clickNext(page)

    await stepVisible(page, 4)
    await ensureChecked(radio(page, 'Balanced Revision'))
    const remind = page.locator('.ms-plan-check input[type="checkbox"]')
    // The reminder time appears only while the check-in box is ticked, and the value travels with the request either way.
    if (!(await remind.isChecked())) await remind.check()
    await page.locator('#rm-reminder').waitFor({ timeout: 5000 })
    await page.fill('#rm-reminder', '08:00')
    await remind.uncheck()
    assert(!(await remind.isChecked()), 'morning check-in unchecked')
    assert((await page.locator('#rm-reminder').count()) === 0, 'reminder time hides when the check-in box is off')
    notes.push('reminder 08:00 (set while the check-in box was ticked, then unticked)')
    await shot(page, '02d-wizard-step4-goal', 'Wizard step 4: Balanced Revision, check-in off')
    await clickNext(page)

    await stepVisible(page, 5)
    const feas = page.locator('.ms-rm-setup-feas')
    await feas.waitFor({ timeout: 60000 })
    const chip = await feas.locator('.ms-rm-setup-feas__chip').innerText()
    const headline = await feas.locator('.ms-rm-setup-feas__headline').innerText()
    const subjectRows = await feas.locator('.ms-rm-setup-feas__subject').count()
    assert(['On track', 'Focused plan', 'Time is tight'].includes(chip.trim()), `state chip: ${chip.trim()}`)
    assert(headline.trim().length > 0, `headline: ${headline.trim()}`)
    assert(subjectRows === 2, `${subjectRows} per-subject rows`)
    const feasText = await feas.innerText()
    notes.push(`feasibility card: ${feasText.replace(/\s+/g, ' ').slice(0, 400)}`)
    assert(!/must-cover/i.test(feasText), 'feasibility card never says "must-cover" (the student reads "priority")')
    // The options fieldset appears only when there is a real choice; on track, the nav's Build button is the one build action.
    const optionButtons = await page.locator('.ms-rm-setup-option').allTextContents()
    const buildButtons = await page.locator('.ms-rm-setup-nav button[type="submit"]', { hasText: /Build my roadmap/ }).count()
    assert(!optionButtons.some((t) => /Keep it realistic/.test(t)), `no "Keep it realistic" option: ${optionButtons.map((t) => t.replace(/\s+/g, ' ')).join(' | ') || '(none)'}`)
    if (chip.trim() === 'On track') {
      assert(optionButtons.length === 0, `on track: no options fieldset (${optionButtons.length} options)`)
      assert(buildButtons === 1, `on track: "Build my roadmap" is the only build button (${buildButtons})`)
    } else {
      assert(optionButtons.length > 1, `${chip.trim()}: ${optionButtons.length} options offered`)
    }
    await shot(page, '02e-wizard-step5-feasibility', 'Wizard step 5: feasibility card with state chip, headline, per-subject rows and options')

    const previews = apiLog.filter((r) => r.method === 'POST' && r.path === '/api/plan')
    assert(previews.length > 0 && previews.every((r) => r.status === 200), `preview POST /api/plan statuses: ${previews.map((r) => r.status).join(',')}`)

    const changeMode = page.locator('.ms-rm-setup-option', { hasText: /Change roadmap mode|Choose a different style/ })
    if (await changeMode.count()) {
      await changeMode.click()
      await stepVisible(page, 4)
      notes.push('"Choose a different style" returned to step 4')
      await clickNext(page)
      await stepVisible(page, 5)
      await feas.waitFor({ timeout: 60000 })
      await page.locator('.ms-rm-setup-feas:not([aria-busy])').waitFor({ timeout: 60000 }).catch(() => {})
    } else notes.push('"Choose a different style" not offered by this report')

    const buildBtn = page.locator('.ms-rm-setup-nav button[type="submit"]')
    const wait = waitApi(page, 'POST', '/api/plan', 120000)
    await buildBtn.click()
    let build = await wait
    // The first POST seen may still be a preview; the build is the one without preview:true.
    while (build.body?.preview === true) build = await waitApi(page, 'POST', '/api/plan', 120000)
    assert(build.status === 200 && build.body?.plan, `build POST /api/plan → ${build.status}, plan v${build.body?.plan?.version}, revision ${build.body?.revision}`)
    await page.locator('.ms-rm-head').waitFor({ timeout: 60000 })
  })

  // 3. Today
  await step(3, 'Today screen: countdown, day line, chip, hero, timeline, Tuesday tuition respected', async (notes, assert) => {
    await gotoPlan(page)
    await radio(page, 'Today').click()
    const h1 = await page.locator('h1').innerText()
    assert(/^\d+ days? to /.test(h1), `countdown: ${h1}`)
    const dayLine = await page.locator('.ms-rm-head__line').innerText()
    assert(/^Day \d+ of your roadmap/.test(dayLine), `day line: ${dayLine}`)
    const chip = await tc(page.locator('.ms-rm-status'))
    assert(chip === 'On track', `status chip: ${chip}`)
    const hero = page.locator('.ms-rm-hero')
    const eyebrow = await tc(hero.locator('.ec-eyebrow'))
    assert(/^Up next · .+ · \d+ min( · shortened to fit)?$/.test(eyebrow), `hero eyebrow: ${eyebrow}`)
    assert(!/best use/i.test(eyebrow), 'no superlative in the eyebrow')
    // The primary CTA must be readable: computed text colour against its own background.
    const startLink = hero.locator('a', { hasText: 'Start focus block' })
    if (await startLink.count()) {
      const css = await startLink.evaluate((el) => {
        const s = getComputedStyle(el)
        return { color: s.color, background: s.backgroundColor, opacity: s.opacity }
      })
      const ratio = contrast(parseRgb(css.color), parseRgb(css.background))
      assert(ratio !== null && ratio >= 3, `Start focus block contrast ${ratio?.toFixed(2)} (color ${css.color} on ${css.background}, opacity ${css.opacity})`)
    }
    const title = await hero.locator('.ms-rm-hero__title').innerText()
    shared.heroTitle = title.trim()
    assert(title.trim().length > 0, `hero objective: ${title.trim()}`)
    const chips = await hero.locator('.ms-rm-chip').allTextContents()
    assert(chips.length > 0, `evidence chips: ${chips.join(' | ')}`)
    for (const label of ['Start focus block', 'Why this now?', 'Adjust today']) {
      assert((await hero.locator('a, button', { hasText: label }).count()) > 0, `hero action "${label}"`)
    }
    const times = await page.locator('.ms-rm-day .ms-rm-row--task .ms-rm-time').allTextContents()
    assert(times.length > 0 && times.every((t) => /^\d\d:\d\d–\d\d:\d\d$/.test(t.trim())), `task times: ${times.join(', ')}`)
    const cats = await page.locator('.ms-rm-day .ms-rm-tag').allTextContents()
    assert(cats.length > 0, `categories: ${[...new Set(cats)].join(', ')}`)
    const breaks = await page.locator('.ms-rm-day .ms-rm-row--break').count()
    notes.push(`${breaks} break rows`)
    const hand = await page.locator('.ms-rm-day__hand').allTextContents()
    notes.push(hand.length ? `in hand: ${hand.join(', ')}` : 'no "in hand" line today (buffer under 10 min)')
    const todayText = await page.locator('.ms-rm-day').innerText()
    const banned = bannedIn(await bodyText(page))
    assert(banned.length === 0, banned.length ? `banned words on Today: ${banned.join(' // ')}` : 'no banned words on Today')
    await shot(page, '03a-today', 'Today screen: countdown, day line, On track chip, hero and timed timeline')

    // Tuesday tuition: check every Tuesday in the plan through the API, then the Roadmap tab.
    const res = await page.request.get(`${BASE}/api/plan`)
    const data = await res.json()
    shared.planJson = data
    const tuesdays = data.plan.days.filter((d) => weekdayUtc(d.date) === 2)
    let clash = 0
    let tuesdayTasks = 0
    for (const d of tuesdays) {
      for (const b of d.blocks ?? []) {
        if (!b.startsAt || b.kind === 'break' || b.kind === 'buffer' || b.kind === 'rest') continue
        tuesdayTasks += 1
        const s = minuteOf(b.startsAt)
        const e = b.endsAt ? minuteOf(b.endsAt) : s + (b.minutes ?? 0)
        if (s < 19 * 60 && e > 17 * 60) clash += 1
      }
    }
    assert(tuesdays.length > 0 && clash === 0, `${tuesdays.length} Tuesdays, ${tuesdayTasks} tasks, ${clash} inside 17:00–19:00`)
    const tuitionRows = tuesdays.filter((d) => (d.commitments ?? []).some((c) => /Tuition/.test(c.label))).length
    assert(tuitionRows === tuesdays.length, `Tuition commitment on ${tuitionRows}/${tuesdays.length} Tuesdays`)
    const sundayDay = data.plan.days.find((d) => d.date === sunday)
    assert(!sundayDay || (sundayDay.blocks ?? []).every((b) => !['study', 'review', 'timed_paper', 'question', 'lesson', 'diagnostic', 'recall', 'quick_check'].includes(b.kind) || b.minutes === 0) || sundayDay.workMinutes === 0, `day away ${sunday}: workMinutes ${sundayDay?.workMinutes ?? 'n/a'} (${sundayDay?.kind ?? 'not on plan'})`)

    await radio(page, 'Roadmap').click()
    await page.locator('.ms-rm-roadmap').waitFor()
    const tueCard = page.locator('.ms-rm-daycard', { has: page.locator('.ms-rm-daycard__date', { hasText: /^Tue/ }) })
    if (await tueCard.count()) {
      await tueCard.locator('summary').click().catch(() => {})
      const text = await tueCard.innerText()
      assert(/Tuition/.test(text), 'Tuesday day card lists the Tuition commitment')
      const cardTimes = await tueCard.locator('.ms-rm-time').allTextContents()
      const bad = cardTimes.filter((t) => {
        const [a, b] = t.split('–')
        return a && b && minuteOf(a) < 19 * 60 && minuteOf(b) > 17 * 60
      })
      assert(bad.length === 0, `Tuesday card task times: ${cardTimes.join(', ')}`)
      await shot(page, '03b-roadmap-tuesday', 'Roadmap tab with the Tuesday day card (tuition 17:00–19:00 kept clear)')
    } else {
      const milestones = await page.locator('.ms-rm-milestone', { hasText: /^Tue/ }).count()
      notes.push(`no Tuesday among the ${await page.locator('.ms-rm-daycard').count()} detailed day cards (it falls in the milestone rows: ${milestones}); the API check above covers every Tuesday`)
      await shot(page, '03b-roadmap-tab', 'Roadmap tab (Tuesday is beyond the detailed days)')
    }

    // The generated plan sample: the first three days as the timeline renders them.
    const lines = []
    for (const d of data.plan.days.slice(0, 3)) {
      lines.push(`${d.date} · Day ${d.day} · ${d.kind} · ${d.focus} · ${d.workMinutes} min work${d.bufferMinutes ? ` · ${d.bufferMinutes} in hand` : ''}`)
      for (const c of d.commitments ?? []) lines.push(`  [${c.start}–${c.end}] ${c.label}`)
      for (const b of d.blocks ?? []) {
        if (b.kind === 'buffer' || b.kind === 'rest') continue
        if (b.kind === 'break') {
          lines.push(`  ${b.startsAt ?? ''} ${b.minutes} min off`)
          continue
        }
        lines.push(`  ${b.startsAt ?? ''}–${b.endsAt ?? ''} [${b.category ?? b.kind}] ${b.minutes} min · ${b.subjectLabel ?? ''} · ${b.objective ?? b.label} → ${b.href ?? '(no link)'}`)
      }
    }
    lines.push('', 'Today as rendered:', todayText)
    shared.sample = lines.join('\n')
  })

  // 4. Why this now?
  await step(4, 'Why this now? sheet: evidence lines and the footer; Escape closes it', async (notes, assert) => {
    await gotoPlan(page)
    await radio(page, 'Today').click()
    await page.locator('.ms-rm-hero button', { hasText: 'Why this now?' }).click()
    const d = dialog(page)
    await d.waitFor()
    const text = await d.innerText()
    const items = await d.locator('.ms-rm-why__item').count()
    const plain = await d.locator('.ms-rm-why__plain').count()
    assert(items > 0 || plain > 0, `${items} evidence lines${plain ? ' (plain syllabus line)' : ''}`)
    const sources = await d.locator('.ms-rm-why__source').allTextContents()
    notes.push(`sources: ${[...new Set(sources)].join(' | ')}`)
    assert(/Why this now\?/i.test(text), 'sheet eyebrow "Why this now?"')
    assert(/not a prediction/.test(text) && /not endorsed/.test(text), 'footer says not a prediction and not endorsed')
    assert(!/verified/i.test(text), 'no "verified" in the sheet')
    notes.push(`sheet: ${text.replace(/\s+/g, ' ').slice(0, 500)}`)
    await shot(page, '04-why-this-now', 'Why this now? sheet with evidence lines and the not-a-prediction footer', { fullPage: false })
    await page.keyboard.press('Escape')
    await d.waitFor({ state: 'hidden', timeout: 5000 })
    assert((await d.count()) === 0, 'Escape closed the sheet')
  })

  // 5. task detail actions
  await step(5, 'Task detail: six actions; Shorten halves; Skip; Swap resolves; Defer moves', async (notes, assert) => {
    await gotoPlan(page)
    await radio(page, 'Today').click()
    const tasks = () => page.locator('.ms-rm-day .ms-rm-row--task')
    const n = await tasks().count()
    notes.push(`${n} tasks on today's timeline`)
    if (n === 0) {
      assert(false, 'no tasks today to act on')
      return
    }

    const d = dialog(page)
    const remaining = [0, 1, 2, 3].filter((i) => i < n)
    const objectiveAt = async (i) => (await tasks().nth(i).locator('.ms-rm-task__objective').innerText()).trim()
    const minutesAt = async (i) => Number((await tasks().nth(i).locator('.ms-rm-task__min').innerText()).replace(/\D/g, ''))
    const standingAt = async (i) => (await tasks().nth(i).locator('.ms-rm-standing').innerText().catch(() => '')).trim()

    // Shorten: the first task whose Shorten is enabled (a 10-minute diagnostic is already at its floor).
    let shortened = null
    for (const i of [...remaining]) {
      const before = await minutesAt(i)
      await tasks().nth(i).locator('.ms-rm-task').click()
      await d.waitFor()
      if (shortened === null && i === remaining[0]) {
        const actions = await d.locator('.ms-rm-actions--secondary button').allTextContents()
        // Six since the carry-over: Shorten, Swap, Defer, Carry over to a day I choose, Skip, Pin.
        assert(actions.length === 6 && actions.some((a) => /Carry over/.test(a)), `six actions: ${actions.map((a) => a.trim()).join(' | ')}`)
      }
      const shortenBtn = d.locator('button', { hasText: /^Shorten/ })
      const shortenLabel = (await shortenBtn.innerText()).trim()
      if (await shortenBtn.isDisabled()) {
        notes.push(`task ${i + 1} (${before} min) cannot be shortened: "${shortenLabel}" is at its floor`)
        await page.keyboard.press('Escape')
        await d.waitFor({ state: 'hidden' })
        continue
      }
      const expected = Number(shortenLabel.replace(/\D/g, ''))
      const wait = waitApi(page, 'PATCH', '/api/plan/task')
      await shortenBtn.click()
      const res = await wait
      assert(res.status === 200 && res.body?.day?.date, `shorten PATCH → ${res.status}, day ${res.body?.day?.date}, revision ${res.body?.revision}${res.body?.diff ? `, diff: ${res.body.diff.summary}` : ''}`)
      await page.waitForTimeout(400)
      await settleSheets(page)
      const after = await minutesAt(i)
      shared.minutesBefore = before
      shared.minutesAfter = after
      assert(after === expected && after < before, `task ${i + 1} minutes ${before} → ${after} (button said ${expected}; halve-to-5 with a floor)`)
      shortened = i
      remaining.splice(remaining.indexOf(i), 1)
      break
    }
    if (shortened === null) assert(false, 'no task today could be shortened')
    await shot(page, '05a-after-shorten', 'Today after shortening a task', { fullPage: false })

    // Skip the next.
    if (remaining.length) {
      const i = remaining.shift()
      await tasks().nth(i).locator('.ms-rm-task').click()
      await d.waitFor()
      const wait = waitApi(page, 'PATCH', '/api/plan/task')
      await d.locator('button', { hasText: /^Skip$/ }).click()
      const res = await wait
      assert(res.status === 200, `skip PATCH → ${res.status}`)
      await page.waitForTimeout(400)
      await settleSheets(page)
      const standing = await standingAt(i)
      assert(/^Skipped$/.test(standing), `task ${i + 1} standing: "${standing}"`)
      assert(!/behind|missed|failed/i.test(standing), 'skip copy is calm')
    } else notes.push('no task left to skip')

    // Swap the next.
    if (remaining.length) {
      const i = remaining.shift()
      const objectiveBefore = await objectiveAt(i)
      await tasks().nth(i).locator('.ms-rm-task').click()
      await d.waitFor()
      const wait = waitApi(page, 'PATCH', '/api/plan/task')
      await d.locator('button', { hasText: 'Swap topic' }).click()
      const res = await wait
      assert(res.status === 200, `swap PATCH → ${res.status}`)
      await page.waitForTimeout(400)
      const diffSheet = page.locator('[role="dialog"][aria-modal="true"]', { hasText: /was adjusted/ })
      if (await diffSheet.count()) notes.push(`swap opened a what-changed sheet: ${(await diffSheet.innerText()).replace(/\s+/g, ' ').slice(0, 200)}`)
      await settleSheets(page)
      const objectiveAfter = await objectiveAt(i)
      if (res.status === 200 && res.body?.day) {
        assert(objectiveAfter !== objectiveBefore, `swapped task ${i + 1}: "${objectiveBefore}" → "${objectiveAfter}"`)
        const swappedId = Object.entries(res.body.taskState ?? {}).find(([, v]) => v?.status === 'swapped')?.[0]
        const block = (res.body.day.blocks ?? []).find((b) => b.id === swappedId) ?? null
        const href = block?.href ?? null
        shared.swapHref = href
        if (href) {
          const r = await page.request.get(`${BASE}${href}`, { maxRedirects: 0 })
          shared.swapHrefStatus = r.status()
          assert(r.status() === 200 || (r.status() >= 300 && r.status() < 400), `swapped task href ${href} → ${r.status()}`)
        } else assert(false, 'swapped task has no href')
      } else if (res.status === 200) notes.push(`swap noop: ${JSON.stringify(res.body).slice(0, 200)}`)
    } else notes.push('no task left to swap')

    // Defer the next.
    if (remaining.length) {
      const i = remaining.shift()
      await tasks().nth(i).locator('.ms-rm-task').click()
      await d.waitFor()
      const wait = waitApi(page, 'PATCH', '/api/plan/task')
      await d.locator('button', { hasText: 'Defer to a day with room' }).click()
      const res = await wait
      assert(res.status === 200, `defer PATCH → ${res.status}`)
      await page.waitForTimeout(400)
      await settleSheets(page)
      const standing = await standingAt(i)
      assert(/^Moved to/.test(standing), `task ${i + 1} standing: "${standing}"`)
      const other = (res.body?.otherDays ?? []).map((o) => o.day?.date).join(', ')
      notes.push(`deferred into: ${other || '(no other day in the response)'}`)
    } else notes.push('no task left to defer')
    const err = await alertText(page)
    assert(!err, err ? `error shown: ${err}` : 'no error box after the actions')
    await shot(page, '05b-after-actions', 'Today after shorten / skip / swap / defer', { fullPage: false })
  })

  // 6. start, done, check-in, undo
  await step(6, 'Start opens a real destination; Done → check-in → Too difficult → Undo', async (notes, assert) => {
    await gotoPlan(page)
    await radio(page, 'Today').click()
    const startLink = page.locator('.ms-rm-hero a', { hasText: 'Start focus block' })
    assert((await startLink.count()) > 0, 'hero has Start focus block')
    const href = await startLink.getAttribute('href')
    notes.push(`hero href: ${href}`)
    await startLink.click()
    await page.waitForURL((u) => /^\/(mark|courses|ib)/.test(u.pathname), { timeout: 120000 })
    const url = new URL(page.url())
    assert(/^\/(mark|courses)/.test(url.pathname), `landed on ${url.pathname}`)
    assert(url.search.includes('return=%2Fdashboard%2Fplan'), 'URL carries return=%2Fdashboard%2Fplan')
    const taskId = url.searchParams.get('task')
    assert(Boolean(taskId), `URL carries task=${taskId}`)
    shared.startedTaskId = taskId
    await page.waitForLoadState('domcontentloaded')
    await shot(page, '06a-start-destination', `Start focus block opened ${url.pathname}`, { fullPage: false })

    await gotoPlan(page, `?task=${encodeURIComponent(taskId ?? '')}`)
    await radio(page, 'Today').click()
    await settleSheets(page)
    const card = page.locator('.ms-rm-day .ms-rm-row--task', { has: page.locator('.ms-rm-standing', { hasText: 'In progress' }) }).first()
    const anyCard = (await card.count()) ? card : page.locator('.ms-rm-day .ms-rm-row--task', { has: page.locator('.ms-rm-done') }).first()
    if (!(await card.count())) notes.push('no card shows "In progress" (the keepalive start request may not have landed before navigation); using the first open task')
    const objective = (await anyCard.locator('.ms-rm-task__objective').innerText()).trim()
    const waitDone = waitApi(page, 'PATCH', '/api/plan/task')
    await anyCard.locator('.ms-rm-done').click()
    const d = dialog(page)
    await d.waitFor()
    // The sheet lists only the feelings the reducer will act on for this task (availableFeels), never all six blindly:
    // "About right" and "Took longer" always, the rest when there is something to repair, move or open.
    // textContent joins the label and the effect spans with no separator, so match each button on its label prefix —
    // never on the effect text (CHECKIN_FEEL_EFFECT), which is copy the service may reword.
    const feels = await d.locator('.ms-rm-feel').allTextContents()
    const known = ['Too easy', 'About right', 'Too difficult', 'Took longer than expected', 'I was busy', 'I need help']
    const labels = feels.map((f) => known.find((k) => f.trim().startsWith(k)) ?? f.trim().slice(0, 30))
    assert(
      feels.length >= 2 && feels.length <= 6 && labels.every((l) => known.includes(l)) && labels.includes('About right') && labels.includes('Took longer than expected'),
      `check-in options (${feels.length}): ${labels.join(' | ')}`
    )
    assert(/How did that go\?/.test(await d.innerText()), 'check-in sheet title')
    const done = await waitDone
    assert(done.status === 200, `complete PATCH → ${done.status}`)
    shared.doneTaskId = Object.entries(done.body?.taskState ?? {}).find(([, v]) => v?.status === 'done')?.[0] ?? null
    notes.push(`done task: ${shared.doneTaskId} (${objective})`)
    await shot(page, '06b-checkin-sheet', 'Check-in sheet after Done with the six options', { fullPage: false })

    const waitFeel = waitApi(page, 'PATCH', '/api/plan/task')
    await d.locator('.ms-rm-feel', { hasText: 'Too difficult' }).click()
    const feel = await waitFeel
    assert(feel.status === 200, `check-in PATCH → ${feel.status}; diff changes: ${feel.body?.diff?.changes?.length ?? 0}; summary: ${feel.body?.diff?.summary ?? '(none)'}`)
    const diffSheet = page.locator('[role="dialog"][aria-modal="true"]', { hasText: /was adjusted/ })
    await diffSheet.waitFor({ timeout: 8000 }).catch(() => {})
    if (await diffSheet.count()) {
      const text = await diffSheet.innerText()
      notes.push(`replan sheet: ${text.replace(/\s+/g, ' ').slice(0, 400)}`)
      assert(!/protected/i.test(text), 'the sheet says "stayed put", not "protected"')
      assert((text.match(/What changed/g) ?? []).length === 0, 'no "What changed" stacked over "What changed" (eyebrow is "Adjusted")')
      await shot(page, '06c-checkin-diff', 'After "Too difficult": what changed, with Undo', { fullPage: false })
      const undoBtn = diffSheet.locator('button', { hasText: /^Undo$/ })
      assert((await undoBtn.count()) > 0, 'Undo offered')
      const waitUndo = waitApi(page, 'POST', '/api/plan/undo')
      await undoBtn.click()
      const undo = await waitUndo
      assert(undo.status === 200, `undo POST → ${undo.status}, revision ${undo.body?.revision}`)
      await diffSheet.waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {})
      const err = await alertText(page)
      assert(!err, err ? `error after undo: ${err}` : 'no error after undo')
      const chip = await tc(page.locator('.ms-rm-status'))
      notes.push(`status chip after undo: ${chip}`)
    } else {
      const ok = await page.locator('.ms-rm-sheet__ok').innerText().catch(() => '')
      const adjusted = await page.locator('.ms-rm-hero__adjusted').innerText().catch(() => '')
      notes.push(`no diff sheet; confirmation: "${ok}" hero note: "${adjusted}"`)
      assert(feel.body?.diff == null || (feel.body.diff.changes ?? []).length === 0, 'check-in produced no diff, so no Undo is expected')
      if (await page.locator('button', { hasText: 'See what changed' }).count()) {
        await settleSheets(page)
        await page.locator('button', { hasText: 'See what changed' }).click()
        const s = dialog(page)
        await s.waitFor()
        const waitUndo = waitApi(page, 'POST', '/api/plan/undo')
        await s.locator('button', { hasText: /^Undo$/ }).click()
        const undo = await waitUndo
        assert(undo.status === 200, `undo POST → ${undo.status}`)
      }
    }
    await shot(page, '06d-after-undo', 'Today after Undo', { fullPage: false })
  })

  // 7. Adjust today
  await step(7, 'Adjust today → confirm → diff sheet → Undo', async (notes, assert) => {
    await gotoPlan(page)
    await radio(page, 'Today').click()
    const adjust = page.locator('.ms-rm-hero button', { hasText: 'Adjust today' })
    if (!(await adjust.count())) {
      notes.push('hero has no Adjust today (no open task left today)')
      return 'skip'
    }
    await adjust.click()
    const d = dialog(page)
    await d.waitFor()
    assert(/Replan the rest of today/.test(await d.innerText()), 'confirm sheet copy')
    await shot(page, '07a-adjust-confirm', 'Adjust today: the confirm sheet', { fullPage: false })
    const wait = waitApi(page, 'POST', '/api/plan/replan')
    await d.locator('button', { hasText: 'Replan today' }).click()
    const res = await wait
    assert(res.status === 200, `replan POST → ${res.status}, changes ${res.body?.diff?.changes?.length ?? 0}, summary "${res.body?.diff?.summary ?? ''}"`)
    const diffSheet = page.locator('[role="dialog"][aria-modal="true"]', { hasText: /was adjusted/ })
    await diffSheet.waitFor({ timeout: 10000 })
    const text = await diffSheet.innerText()
    const summary = (await diffSheet.locator('.ms-rm-sheet__sub').innerText()).trim()
    notes.push(`diff sheet summary: "${summary}"`)
    assert(summary.length > 0, 'summary line present (default is "Plans change. We protected the essentials and rebuilt today.")')
    notes.push(`diff sheet: ${text.replace(/\s+/g, ' ').slice(0, 500)}`)
    await shot(page, '07b-adjust-diff', 'Adjust today: the diff sheet with Undo', { fullPage: false })
    const chip = await page.locator('.ms-rm-status').innerText()
    notes.push(`status chip now: ${chip.trim()}`)
    const undoBtn = diffSheet.locator('button', { hasText: /^Undo$/ })
    assert((await undoBtn.count()) > 0, 'Undo offered')
    const waitUndo = waitApi(page, 'POST', '/api/plan/undo')
    await undoBtn.click()
    const undo = await waitUndo
    assert(undo.status === 200, `undo POST → ${undo.status}`)
    await diffSheet.waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {})
    const err = await alertText(page)
    assert(!err, err ? `error after undo: ${err}` : 'no error after undo')
    notes.push(`status chip after undo: ${await tc(page.locator('.ms-rm-status'))}`)
    await shot(page, '07c-after-undo', 'Today after undoing the replan', { fullPage: false })
  })

  // 8. Roadmap tab
  await step(8, 'Roadmap tab: detailed days, milestones, exam dates, Adjust plan, Add to calendar', async (notes, assert) => {
    await gotoPlan(page)
    await radio(page, 'Roadmap').click()
    await page.locator('.ms-rm-roadmap').waitFor()
    const cards = await page.locator('.ms-rm-daycard').count()
    const milestones = await page.locator('.ms-rm-milestones:not(#rm-past-days) .ms-rm-milestone').count()
    const exams = await page.locator('.ms-rm-examlist li').allTextContents()
    assert(cards >= 1 && cards <= 4, `${cards} detailed day cards`)
    assert(milestones >= 1, `${milestones} milestone rows`)
    assert(exams.length === 2, `exam dates: ${exams.map((e) => e.replace(/\s+/g, ' ')).join(' | ')}`)
    assert((await page.locator('button', { hasText: 'Adjust plan' }).count()) > 0, 'Adjust plan button')
    const cal = page.locator('a', { hasText: 'Add to calendar' })
    assert((await cal.count()) > 0, 'Add to calendar link')
    const res = await page.request.get(`${BASE}/api/plan/calendar`)
    const ct = res.headers()['content-type'] ?? ''
    assert(res.status() === 200 && /text\/calendar/.test(ct), `GET /api/plan/calendar → ${res.status()} ${ct}`)
    const banned = bannedIn(await bodyText(page))
    assert(banned.length === 0, banned.length ? `banned words on Roadmap: ${banned.join(' // ')}` : 'no banned words on Roadmap')
    await shot(page, '08-roadmap-tab', 'Roadmap tab: next days in detail, later days as milestones, exam dates')
  })

  // 9. dashboard hero
  await step(9, 'Dashboard hero shows the same next task; Why this? opens the sheet on the plan page', async (notes, assert) => {
    await gotoPlan(page)
    await radio(page, 'Today').click()
    const planTitle = (await page.locator('.ms-rm-hero__title').innerText().catch(() => '')).trim()
    await page.goto(`${BASE}/dashboard`, { waitUntil: 'domcontentloaded', timeout: 120000 })
    const hero = page.locator('.ms-rm-hero').first()
    await hero.waitFor({ timeout: 60000 })
    const dashTitle = (await hero.locator('.ms-rm-hero__title').innerText()).trim()
    assert(dashTitle === planTitle, `dashboard "${dashTitle}" vs plan "${planTitle}"`)
    const why = hero.locator('a[href*="why=1"]')
    assert((await why.count()) > 0, `Why this? link: ${await why.first().getAttribute('href')}`)
    await shot(page, '09a-dashboard-hero', 'Dashboard: TodayPlanCard hero with the next task and Why this?', { fullPage: false })
    await why.first().click()
    await page.waitForURL((u) => u.pathname === '/dashboard/plan', { timeout: 60000 })
    const d = dialog(page)
    await d.waitFor({ timeout: 60000 })
    assert(/Why this now\?/i.test(await tc(d)), 'Why sheet opened from the dashboard link')
    await shot(page, '09b-why-from-dashboard', 'Plan page opened from the dashboard with the Why sheet up', { fullPage: false })
    await page.keyboard.press('Escape')
  })

  // 10. Study Mode chip
  await step(10, 'Study Mode chip: shown and linked when signed in; absent and silent when signed out', async (notes, assert) => {
    await page.goto(`${BASE}${LESSON}`, { waitUntil: 'domcontentloaded', timeout: 120000 })
    await page.waitForFunction(() => document.documentElement.dataset.lessonStudy !== undefined, null, { timeout: 120000 })
    await page.locator('.study-toggle [role="radio"]', { hasText: 'ON' }).first().click()
    await page.locator('main.lesson-page[data-study="on"]').waitFor({ timeout: 15000 })
    const link = page.locator('.ms-rm-chipwrap[data-state="ready"] a')
    await link.waitFor({ timeout: 30000 })
    const text = (await link.innerText()).trim()
    const href = await link.getAttribute('href')
    assert(/^Roadmap · .+ · \d+ min →$/.test(text), `chip: ${text}`)
    assert(text.length <= 80, `chip is a label, not a sentence (${text.length} chars)`)
    assert((await link.getAttribute('title') ?? '').length > 0, 'the full objective rides on the link title')
    assert(Boolean(href) && href !== '#', `chip href: ${href}`)
    const todayCalls = apiLog.filter((r) => r.path === '/api/plan/today')
    notes.push(`GET /api/plan/today so far: ${todayCalls.map((r) => r.status).join(',') || 'none (served from the session cache)'}`)
    await shot(page, '10a-study-mode-chip', 'Study Mode mode bar with the roadmap chip', { fullPage: false })
    await page.keyboard.press('Escape')

    const anon = await browser.newContext({ viewport: VIEWPORT })
    const requests = []
    anon.on('request', (r) => {
      if (new URL(r.url()).pathname.startsWith('/api/plan')) requests.push(r.url())
    })
    const p2 = await anon.newPage()
    await p2.goto(`${BASE}${LESSON}`, { waitUntil: 'domcontentloaded', timeout: 120000 })
    await p2.waitForFunction(() => document.documentElement.dataset.lessonStudy !== undefined, null, { timeout: 120000 })
    await p2.locator('.study-toggle [role="radio"]', { hasText: 'ON' }).first().click()
    await p2.locator('main.lesson-page[data-study="on"]').waitFor({ timeout: 15000 })
    await p2.waitForTimeout(2500)
    const chips = await p2.locator('.ms-rm-chipwrap a').count()
    const state = await p2.locator('.ms-rm-chipwrap').getAttribute('data-state')
    assert(chips === 0, `signed out: ${chips} chip links (wrapper state ${state})`)
    assert(requests.length === 0, `signed out: ${requests.length} /api/plan requests`)
    await shot(p2, '10b-study-mode-signed-out', 'Study Mode signed out: no roadmap chip', { fullPage: false })
    await anon.close()
  })

  // 11. /api/plan/today
  await step(11, 'GET /api/plan/today: hasPlan, nextTask, Cache-Control private, no-store', async (notes, assert) => {
    const res = await page.request.get(`${BASE}/api/plan/today`)
    const body = await res.json()
    assert(res.status() === 200, `status ${res.status()}`)
    assert(body.hasPlan === true, 'hasPlan true')
    assert(Boolean(body.nextTask?.label), `nextTask: ${JSON.stringify(body.nextTask).slice(0, 200)}`)
    const cc = res.headers()['cache-control'] ?? ''
    assert(/private/.test(cc) && /no-store/.test(cc), `Cache-Control: ${cc}`)
    notes.push(`summary: ${JSON.stringify(body).slice(0, 400)}`)
  })

  // 13. rebuild
  await step(13, 'Adjust plan: wizard prefilled; switch to Exam Polish; rebuild keeps the done task state', async (notes, assert) => {
    await gotoPlan(page)
    await radio(page, 'Roadmap').click()
    await page.locator('button', { hasText: 'Adjust plan' }).click()
    await page.locator('.ms-rm-setup').waitFor()
    assert(/Adjust your roadmap/i.test(await tc(page.locator('.ms-rm-setup-top .ec-eyebrow'))), 'wizard eyebrow says Adjust your roadmap')
    await stepVisible(page, 1)
    const mathsRow = page.locator('.ms-rm-setup-exam', { has: page.locator('.ms-rm-setup-exam__name', { hasText: /^Mathematics$/ }) })
    const dateVal = await mathsRow.locator('input[type="date"]').inputValue()
    const compVal = await mathsRow.locator('select').inputValue().catch(() => '(none)')
    assert(dateVal === mathsDate, `Mathematics date prefilled ${dateVal}, component ${compVal}`)
    await clickNext(page)
    await stepVisible(page, 2)
    const mathsFs = page.locator('fieldset.ms-rm-setup-rating', { has: page.locator('legend', { hasText: /^Mathematics$/ }) })
    const physFs = page.locator('fieldset.ms-rm-setup-rating', { has: page.locator('legend', { hasText: /^Physics$/ }) })
    assert((await radio(page, 'Rusty', mathsFs).getAttribute('aria-checked')) === 'true', 'Mathematics rating prefilled Rusty')
    assert((await radio(page, 'Confident', physFs).getAttribute('aria-checked')) === 'true', 'Physics rating prefilled Confident')
    await clickNext(page)
    await stepVisible(page, 3)
    const wk = await page.locator('[role="group"][aria-label="Weekday minutes"] button[aria-pressed="true"]').innerText()
    const commitments = await page.locator('input[aria-label="Commitment name"]').evaluateAll((els) => els.map((e) => e.value))
    assert(wk.trim() === '1 h 30 min', `weekday minutes prefilled: ${wk.trim()}`)
    assert(commitments.includes('Tuition'), `commitments prefilled: ${commitments.join(', ')}`)
    // The day away differs from the defaults, so the fold opens by itself on a rebuild.
    assert(await page.locator('details.ms-rm-setup-more').evaluate((el) => el.open), 'fine-tune fold opens when the prior plan differs from defaults')
    assert((await page.inputValue('#rm-nostudy-start')) === '22:30', `no-study prefilled ${await page.inputValue('#rm-nostudy-start')}–${await page.inputValue('#rm-nostudy-end')}`)
    await clickNext(page)
    await stepVisible(page, 4)
    assert((await radio(page, 'Balanced Revision').getAttribute('aria-checked')) === 'true', 'mode prefilled Balanced Revision')
    await radio(page, 'Exam Polish').click()
    await clickNext(page)
    await stepVisible(page, 5)
    await page.locator('.ms-rm-setup-feas').waitFor({ timeout: 60000 })
    await shot(page, '13a-rebuild-feasibility', 'Rebuild: feasibility for Exam Polish', { fullPage: false })
    const wait = waitApi(page, 'POST', '/api/plan', 120000)
    await page.locator('.ms-rm-setup-nav button[type="submit"]', { hasText: 'Rebuild my roadmap' }).click()
    let build = await wait
    while (build.body?.preview === true) build = await waitApi(page, 'POST', '/api/plan', 120000)
    assert(build.status === 200, `rebuild POST → ${build.status}`)
    await page.locator('.ms-rm-head').waitFor({ timeout: 60000 })
    const res = await page.request.get(`${BASE}/api/plan`)
    const data = await res.json()
    assert(data.plan?.mode === 'polish', `plan mode now ${data.plan?.mode}`)
    const ids = new Set(data.plan.days.flatMap((d) => (d.blocks ?? []).map((b) => b.id)))
    const doneId = shared.doneTaskId
    const entry = doneId ? data.taskState?.[doneId] : null
    if (doneId && ids.has(doneId)) assert(entry?.status === 'done', `done task ${doneId} still in the plan with status ${entry?.status}`)
    else notes.push(`done task ${doneId} is not in the rebuilt plan (${entry ? `state kept: ${entry.status}` : 'state dropped'}); the screen rendered without error`)
    const standings = await page.locator('.ms-rm-standing').allTextContents()
    notes.push(`standings shown after rebuild: ${standings.map((s) => s.trim()).join(' | ') || '(none)'}`)
    const err = await alertText(page)
    assert(!err, err ? `error after rebuild: ${err}` : 'no error box after rebuild')
    await shot(page, '13b-after-rebuild', 'Today after rebuilding in Exam Polish', { fullPage: false })
  })

  // 14. accessibility
  await step(14, 'Accessibility: dialogs are modal, Tab stays inside, 44px targets, one h1', async (notes, assert) => {
    await gotoPlan(page)
    await radio(page, 'Today').click()
    assert((await page.locator('h1').count()) === 1, `${await page.locator('h1').count()} h1`)
    const heights = await page.locator('.ms-rm-btn, .ms-rm-done').evaluateAll((els) =>
      els
        .map((e) => ({ t: (e.textContent ?? '').trim().slice(0, 24), h: Math.round(e.getBoundingClientRect().height) }))
        .filter((x) => x.h > 0)
        .slice(0, 5)
    )
    // At least the hero's three actions and one Done button (how many Done buttons remain depends on the earlier steps).
    assert(heights.length >= 4 && heights.every((x) => x.h >= 44), `roadmap button heights: ${heights.map((x) => `${x.t}=${x.h}`).join(', ')}`)
    const segments = await page.locator('.ms-rm-tabs .ms-plan-segment').evaluateAll((els) =>
      els.map((e) => ({ t: (e.textContent ?? '').trim(), h: Math.round(e.getBoundingClientRect().height) }))
    )
    assert(segments.every((x) => x.h >= 44), `Today/Roadmap tab heights: ${segments.map((x) => `${x.t}=${x.h}`).join(', ')}`)
    const opener = page.locator('.ms-rm-day .ms-rm-row--task .ms-rm-task').first()
    if (await opener.count()) {
      await opener.click()
      const d = dialog(page)
      await d.waitFor()
      assert((await d.getAttribute('aria-modal')) === 'true' && (await d.getAttribute('role')) === 'dialog', 'task sheet is role=dialog aria-modal=true')
      assert(Boolean(await d.getAttribute('aria-labelledby')), 'dialog has aria-labelledby')
      let inside = 0
      const presses = 14
      for (let i = 0; i < presses; i++) {
        await page.keyboard.press('Tab')
        const ok = await page.evaluate(() => {
          const d = document.querySelector('[role="dialog"][aria-modal="true"]')
          return Boolean(d && d.contains(document.activeElement))
        })
        if (ok) inside += 1
      }
      assert(inside === presses, `focus stayed inside the sheet on ${inside}/${presses} Tab presses`)
      await page.keyboard.press('Escape')
      await d.waitFor({ state: 'hidden', timeout: 5000 })
    } else notes.push('no task to open a sheet on')
    notes.push(`console errors so far: ${consoleErrors.length}; page errors: ${pageErrors.length}`)
    assert(pageErrors.length === 0, pageErrors.length ? `page errors: ${pageErrors.map((e) => e.text).join(' // ')}` : 'no uncaught page errors')
  })

  // 15. offline
  await step(15, 'Offline: Done is kept on the device and syncs when back online', async (notes, assert) => {
    await gotoPlan(page)
    await radio(page, 'Today').click()
    const card = page.locator('.ms-rm-day .ms-rm-row--task', { has: page.locator('.ms-rm-done') }).first()
    if (!(await card.count())) {
      notes.push('no open task with a Done button today')
      return 'skip'
    }
    const errorsBefore = pageErrors.length
    await context.setOffline(true)
    await card.locator('.ms-rm-done').click()
    const d = dialog(page)
    await d.waitFor()
    await page.waitForTimeout(1500)
    const note = await page.locator('.ms-rm-sheet__sync, .ms-rm-sync').first().innerText().catch(() => '')
    assert(/Saved on this device/.test(note), `offline note: "${note}"`)
    assert(pageErrors.length === errorsBefore, 'no page error while offline')
    await shot(page, '15a-offline-done', 'Done while offline: saved on this device', { fullPage: false })
    await d.locator('button', { hasText: /Not now|Close/ }).click()
    const waitSync = page.waitForResponse((r) => r.request().method() === 'PATCH' && new URL(r.url()).pathname === '/api/plan/task', { timeout: 20000 })
    await context.setOffline(false)
    try {
      const res = await waitSync
      assert(res.status() === 200, `queued action reached the API → ${res.status()}`)
    } catch {
      assert(false, 'no PATCH /api/plan/task seen within 20 s of going back online')
    }
    await page.waitForTimeout(800)
    const queued = await page.evaluate(() => localStorage.getItem('ms-roadmap-queue'))
    assert(queued === null, `queue after sync: ${queued ?? 'empty'}`)
    await shot(page, '15b-back-online', 'Back online: the queued Done synced', { fullPage: false })
  })

  // 16. phone and late-night captures
  // 17. Carry over: a task moves to a day the student chooses; the copy remembers where it came from.
  await step(17, 'Carry over: the sheet lists days with their fit; the copy lands on the chosen day and says where it came from', async (notes, assert) => {
    await gotoPlan(page)
    await settleSheets(page)
    await radio(page, 'Today').click()
    let open = page.locator('.ms-rm-row--task:not(.is-done):not(.is-skipped):not(.is-deferred):not(.is-dropped) .ms-rm-task')
    if (!(await open.count())) {
      // Earlier steps settled every task of day one: carry one of tomorrow's instead (a future task may move too).
      await radio(page, 'Roadmap').click()
      await page.locator('.ms-rm-roadmap').waitFor()
      const firstCard = page.locator('.ms-rm-daycard').first()
      // An open <details> has an empty-string "open" attribute, so test the property, not the attribute.
      if ((await firstCard.locator('details').count()) && !(await firstCard.locator('details').first().evaluate((el) => el.open))) {
        await firstCard.locator('summary').click()
      }
      open = firstCard.locator('.ms-rm-row--task:not(.is-done):not(.is-skipped):not(.is-deferred):not(.is-dropped) .ms-rm-task')
      if (!(await open.count())) {
        notes.push('no open task today or tomorrow to carry')
        return 'skip'
      }
      notes.push('today has no open task left; carrying one from the first day card')
    }
    const objective = await tc(open.first().locator('.ms-rm-task__objective'))
    await open.first().click()
    const d = dialog(page)
    await d.waitFor()
    const carryBtn = d.locator('button', { hasText: 'Carry over to a day I choose' })
    assert((await carryBtn.count()) > 0, 'task sheet offers "Carry over to a day I choose"')
    await carryBtn.click()
    // The task sheet is still closing when the carry sheet opens; the day list is only ever in the carry sheet.
    const sheet = page.locator('[role="dialog"][aria-modal="true"]', { has: page.locator('.ms-rm-carry') })
    await sheet.waitFor()
    const days = sheet.locator('.ms-rm-carry__day')
    const n = await days.count()
    assert(n >= 1 && n <= 7, `${n} days offered`)
    const whens = await sheet.locator('.ms-rm-carry__when').allTextContents()
    const fits = await sheet.locator('.ms-rm-carry__fit').allTextContents()
    notes.push(`days: ${whens.map((w, i) => `${w.trim()} (${fits[i]?.trim()})`).join(' | ')}`)
    assert(whens.every((w) => /^(Today|Tomorrow|[A-Z][a-z]{2} \d)/.test(w.trim())), 'each day is named')
    assert(fits.every((f) => /min/.test(f)), 'each day says what the move means in minutes')
    assert(bannedIn(await sheet.innerText()).length === 0, 'carry sheet copy is calm')
    await shot(page, '17a-carry-sheet', 'Carry over: the days a task can move to, each with its fit', { fullPage: false })
    // Tomorrow when it is offered, else the first day listed.
    const pick = (await days.filter({ hasText: /^Tomorrow/ }).count()) ? days.filter({ hasText: /^Tomorrow/ }).first() : days.first()
    const pickedWhen = (await tc(pick.locator('.ms-rm-carry__when'))).trim()
    const wait = waitApi(page, 'PATCH', '/api/plan/task')
    await pick.click()
    const res = await wait
    assert(res.status === 200, `carry PATCH → ${res.status}`)
    assert(/Carried over to/.test(res.body?.diff?.summary ?? ''), `diff summary: ${res.body?.diff?.summary}`)
    assert((res.body?.otherDays?.length ?? 0) >= 1 || res.body?.date, 'the response carries the target day')
    const copy = [...(res.body?.otherDays ?? []).map((o) => o.day), res.body?.day].filter(Boolean).flatMap((day) => day.blocks).find((b) => b.carriedFrom)
    assert(Boolean(copy), 'a copy with carriedFrom is on the target day')
    notes.push(`carried to ${pickedWhen}: ${copy?.id} (${copy?.minutes} min, from ${copy?.carriedFrom})`)
    await settleSheets(page)
    // The original reads "Moved to …" now.
    const moved = page.locator('.ms-rm-row--task.is-deferred .ms-rm-standing', { hasText: /^Moved to/ })
    await moved.first().waitFor({ timeout: 10000 })
    assert((await moved.count()) >= 1, 'the original says where it moved to')
    // The copy's own sheet says where it came from: on the Today tab when it landed today, else on its day card.
    if (pickedWhen === 'Today') {
      await radio(page, 'Today').click()
      // A full day folds its fifth task and beyond under "and n more"; the copy is the newest, so unfold.
      const more = page.locator('.ms-rm-more')
      if (await more.count()) await more.first().click()
    } else {
      await radio(page, 'Roadmap').click()
      await page.locator('.ms-rm-roadmap').waitFor()
      for (const d of await page.locator('.ms-rm-daycard details:not([open]) summary').all()) await d.click().catch(() => {})
    }
    const copyCard = page.locator('.ms-rm-row--task:not(.is-deferred) .ms-rm-task', { hasText: objective.slice(0, 40) }).first()
    await copyCard.waitFor({ timeout: 10000 })
    await copyCard.click()
    const d2 = dialog(page)
    await d2.waitFor()
    const carriedLine = await d2.locator('.ms-rm-sheet__carried').innerText().catch(() => '')
    assert(/Carried over from/.test(carriedLine), `copy sheet: ${carriedLine}`)
    await shot(page, '17b-carried-copy', 'The carried copy on its new day, with where it came from', { fullPage: false })
    await page.keyboard.press('Escape')
    shared.carriedTo = pickedWhen
  })

  // 18. Several papers in one subject: a second row, its own date, validation, and removal.
  await step(18, 'Wizard: a second paper for one subject gets its own row, date and validation; removed again', async (notes, assert) => {
    await gotoPlan(page)
    await settleSheets(page)
    await radio(page, 'Roadmap').click()
    await page.locator('button', { hasText: 'Adjust plan' }).click()
    await stepVisible(page, 1)
    const mathsRow = page.locator('.ms-rm-setup-exam', { has: page.locator('.ms-rm-setup-exam__name', { hasText: /^Mathematics/ }) })
    const add = mathsRow.locator('button', { hasText: /Add it|Add another paper/ })
    assert((await add.count()) > 0, 'Mathematics offers to add another paper')
    await add.click()
    assert((await mathsRow.locator('.ms-rm-setup-paper').count()) === 2, 'a second paper row appears')
    // Next without a date on the new row is refused, and the message names the row.
    await clickNext(page)
    const issue = await tc(page.locator('.ms-rm-setup-summary'))
    assert(/Set the exam date for Mathematics/.test(issue), `validation names the empty row: ${issue}`)
    const second = mathsRow.locator('.ms-rm-setup-paper').nth(1)
    const select = second.locator('select')
    if (await select.count()) await select.selectOption('Paper 2')
    const later = new Date(`${mathsDate}T00:00:00Z`)
    later.setUTCDate(later.getUTCDate() + 3)
    const secondDate = later.toISOString().slice(0, 10)
    await second.locator('input[type="date"]').fill(secondDate)
    const runs = await tc(mathsRow.locator('.ms-rm-setup-exam__runs'))
    assert(/runs to/.test(runs), `the subject says where it runs to: ${runs}`)
    const runsTo = await page.locator('.ms-plan-fieldset', { hasText: 'Exam dates' }).locator('.ms-plan-note').innerText().catch(() => '')
    assert(/22 days from today/.test(runsTo), `the plan runs to the later paper: ${runsTo.replace(/\s+/g, ' ')}`)
    await shot(page, '18a-second-paper', 'Finish line: Mathematics with Paper 1 and Paper 2 on their own dates')
    await clickNext(page)
    await stepVisible(page, 2)
    notes.push('step 1 accepted two Mathematics papers')
    await page.locator('button', { hasText: 'Back' }).click()
    await stepVisible(page, 1)
    await second.locator('button', { hasText: 'Remove' }).click()
    assert((await mathsRow.locator('.ms-rm-setup-paper').count()) === 1, 'the second row is removed')
    // Leave the wizard without rebuilding; the plan is untouched.
    await page.locator('button', { hasText: 'Keep the current plan' }).click()
    await page.locator('.ms-rm-head').waitFor()
    assert(bannedIn(await bodyText(page)).length === 0, 'no banned words after the round trip')
  })

  await step(16, 'Phone (390x844) and late-night captures of Today and the wizard', async (notes, assert) => {
    const phone = await browser.newContext({ viewport: PHONE, storageState: storage, isMobile: true, hasTouch: true })
    const p = await phone.newPage()
    watchErrors(p, 'phone')
    await p.goto(`${BASE}/dashboard/plan`, { waitUntil: 'domcontentloaded', timeout: 120000 })
    await p.locator('.ms-rm-head').waitFor({ timeout: 60000 })
    await radio(p, 'Today').click()
    const noScroll = await p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)
    assert(noScroll, 'no horizontal overflow on the phone Today screen')
    await shot(p, '16a-phone-today', 'Today at 390x844')
    await radio(p, 'Roadmap').click()
    await p.locator('button', { hasText: 'Adjust plan' }).click()
    await p.locator('.ms-rm-setup').waitFor()
    await shot(p, '16b-phone-wizard-step1', 'Wizard step 1 at 390x844')
    await clickNext(p)
    await stepVisible(p, 2)
    await clickNext(p)
    await stepVisible(p, 3)
    await shot(p, '16c-phone-wizard-step3', 'Wizard step 3 at 390x844')
    await phone.close()

    const night = await browser.newContext({ viewport: VIEWPORT, storageState: storage })
    await night.addInitScript(() => {
      try {
        localStorage.setItem('ec-theme', 'late-night')
      } catch {}
    })
    const n = await night.newPage()
    watchErrors(n, 'late-night')
    await n.goto(`${BASE}/dashboard/plan`, { waitUntil: 'domcontentloaded', timeout: 120000 })
    await n.locator('.ms-rm-head').waitFor({ timeout: 60000 })
    const theme = await n.evaluate(() => document.documentElement.getAttribute('data-ec-theme'))
    assert(theme === 'late-night', `theme attribute: ${theme}`)
    await radio(n, 'Today').click()
    await shot(n, '16d-night-today', 'Today in the late-night theme')
    await n.locator('.ms-rm-hero button', { hasText: 'Why this now?' }).click().catch(() => {})
    await dialog(n).waitFor({ timeout: 5000 }).catch(() => {})
    await shot(n, '16e-night-why-sheet', 'Why this now? sheet in the late-night theme', { fullPage: false })
    await n.keyboard.press('Escape')
    await radio(n, 'Roadmap').click()
    await n.locator('button', { hasText: 'Adjust plan' }).click()
    await n.locator('.ms-rm-setup').waitFor()
    await shot(n, '16f-night-wizard-step1', 'Wizard step 1 in the late-night theme')
    await clickNext(n)
    await stepVisible(n, 2)
    await clickNext(n)
    await stepVisible(n, 3)
    await clickNext(n)
    await stepVisible(n, 4)
    await clickNext(n)
    await stepVisible(n, 5)
    await n.locator('.ms-rm-setup-feas').waitFor({ timeout: 60000 })
    await shot(n, '16g-night-wizard-step5', 'Wizard step 5 (feasibility) in the late-night theme')
    await night.close()
  })

  await browser.close()

  // ── summary ────────────────────────────────────────────────────────────
  console.log('\n=== summary ===')
  for (const r of rows) console.log(`${(r.ok === null ? 'SKIP' : r.ok ? 'PASS' : 'FAIL').padEnd(5)} ${String(r.id).padEnd(3)} ${r.name}`)
  const failed = rows.filter((r) => r.ok === false)
  console.log(`\n${failed.length} failed / ${rows.length} steps · ${apiLog.length} /api/plan responses · ${consoleErrors.length} console errors · ${pageErrors.length} page errors`)
  console.log('\n=== /api/plan responses ===')
  const tally = {}
  for (const r of apiLog) {
    const k = `${r.method} ${r.path.split('?')[0]} → ${r.status}`
    tally[k] = (tally[k] ?? 0) + 1
  }
  for (const [k, v] of Object.entries(tally)) console.log(`${String(v).padStart(3)}× ${k}`)
  if (consoleErrors.length) {
    console.log('\n=== console errors ===')
    for (const e of consoleErrors.slice(0, 20)) console.log(`[${e.where}] ${e.text}`)
  }
  if (pageErrors.length) {
    console.log('\n=== page errors ===')
    for (const e of pageErrors) console.log(`[${e.where}] ${e.text}`)
  }
  if (shared.sample) {
    console.log('\n=== generated plan (first three days) ===')
    console.log(shared.sample)
  }
  if (REPORT) {
    writeFileSync(
      REPORT,
      JSON.stringify({ engine, base: BASE, zone: shared.zone, rows, apiLog, tally, consoleErrors, pageErrors, shots, sample: shared.sample, shared }, null, 2)
    )
    console.log(`\nreport: ${REPORT}`)
  }
  process.exit(failed.length ? 1 : 0)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
