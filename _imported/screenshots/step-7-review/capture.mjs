import { spawn } from 'node:child_process'
import { mkdir, writeFile } from 'node:fs/promises'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dir = dirname(fileURLToPath(import.meta.url))
const outDir = __dir
const chrome =
  process.env.CHROME_PATH ||
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const port = 9333
const url = 'http://localhost:3000/'

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

function launchChrome() {
  const userData = join(outDir, '.chrome-profile')
  const proc = spawn(
    chrome,
    [
      `--remote-debugging-port=${port}`,
      '--headless=new',
      '--no-sandbox',
      '--disable-gpu',
      '--hide-scrollbars',
      '--force-device-scale-factor=1',
      `--user-data-dir=${userData}`,
      'about:blank',
    ],
    { stdio: 'ignore', detached: false },
  )
  return proc
}

async function waitForDebugger(retries = 40) {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${port}/json/list`)
      if (res.ok) {
        const targets = await res.json()
        const page =
          targets.find((t) => t.type === 'page' && t.url !== 'chrome://newtab/') ||
          targets.find((t) => t.type === 'page')
        if (page?.webSocketDebuggerUrl) return page
      }
    } catch {}
    await sleep(250)
  }
  throw new Error('Chrome page target not ready')
}

class CDP {
  constructor(wsUrl) {
    this.ws = new WebSocket(wsUrl)
    this.id = 0
    this.pending = new Map()
    this.ws.onmessage = (ev) => {
      const msg = JSON.parse(ev.data)
      if (msg.id && this.pending.has(msg.id)) {
        this.pending.get(msg.id)(msg)
        this.pending.delete(msg.id)
      }
    }
  }

  async open() {
    await new Promise((res, rej) => {
      this.ws.onopen = res
      this.ws.onerror = rej
    })
  }

  send(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = ++this.id
      this.pending.set(id, (msg) => {
        if (msg.error) reject(new Error(msg.error.message))
        else resolve(msg.result ?? msg)
      })
      this.ws.send(JSON.stringify({ id, method, params }))
    })
  }

  close() {
    this.ws.close()
  }
}

async function captureViewport(cdp, { width, height, filename, waitMs }) {
  await cdp.send('Emulation.setDeviceMetricsOverride', {
    width,
    height,
    deviceScaleFactor: 1,
    mobile: width < 768,
  })
  await cdp.send('Page.navigate', { url })
  await sleep(1500)
  await cdp.send('Runtime.evaluate', {
    expression: `(() => {
      const fig = document.querySelector('figure[role="img"]');
      if (fig) fig.scrollIntoView({ block: 'center' });
      else window.scrollTo(0, 600);
    })()`,
  })
  await sleep(waitMs)
  const shot = await cdp.send('Page.captureScreenshot', { format: 'png' })
  const data = shot.data
  if (!data) throw new Error('Screenshot failed: ' + JSON.stringify(shot))
  await writeFile(join(outDir, filename), Buffer.from(data, 'base64'))
}

async function captureDemoCloseup(cdp, waitMs) {
  await cdp.send('Emulation.setDeviceMetricsOverride', {
    width: 1440,
    height: 900,
    deviceScaleFactor: 1,
    mobile: false,
  })
  await cdp.send('Page.navigate', { url })
  await sleep(1500)
  await cdp.send('Runtime.evaluate', {
    expression: `(() => {
      const fig = document.querySelector('figure[role="img"]');
      if (fig) fig.scrollIntoView({ block: 'center' });
    })()`,
  })
  await sleep(waitMs)

  const layout = await cdp.send('Runtime.evaluate', {
    expression: `JSON.stringify((() => {
      const fig = document.querySelector('figure[role="img"]');
      if (!fig) return null;
      const r = fig.getBoundingClientRect();
      const pad = 24;
      return {
        x: Math.max(0, r.x - pad),
        y: Math.max(0, r.y - pad),
        width: r.width + pad * 2,
        height: r.height + pad * 2,
      };
    })())`,
    returnByValue: true,
  })

  const clipRaw = layout.result?.value
  const clip = JSON.parse(clipRaw)
  const shot = await cdp.send('Page.captureScreenshot', {
    format: 'png',
    clip: { ...clip, scale: 1 },
  })
  const data = shot.data
  if (!data) throw new Error('Closeup screenshot failed')
  await writeFile(join(outDir, 'demo-closeup.png'), Buffer.from(data, 'base64'))
}

async function inspectComputed(cdp, waitMs) {
  await cdp.send('Emulation.setDeviceMetricsOverride', {
    width: 1440,
    height: 900,
    deviceScaleFactor: 1,
    mobile: false,
  })
  await cdp.send('Page.navigate', { url })
  await sleep(1500)
  await cdp.send('Runtime.evaluate', {
    expression: `(() => {
      const fig = document.querySelector('figure[role="img"]');
      if (fig) fig.scrollIntoView({ block: 'center' });
    })()`,
  })
  await sleep(waitMs)

  const res = await cdp.send('Runtime.evaluate', {
    expression: `JSON.stringify((() => {
      const fig = document.querySelector('figure[role="img"]');
      if (!fig) return { error: 'no figure' };

      const items = [...fig.querySelectorAll('li')];
      const line1 = items[0]?.querySelector('span.inline-block');
      const line3 = items[2];
      const line4 = items[3]?.querySelector('span.inline-block');

      const tick = items[0]?.querySelector('span[aria-hidden]');
      const underline = line4?.querySelector('span.absolute');
      const annotation = line3?.querySelector('span[aria-hidden].md\\:absolute, span[aria-hidden]');
      const annEl = [...(line3?.querySelectorAll('span[aria-hidden]') || [])].find(
        (el) => el.textContent?.includes('M1')
      );
      const score = fig.querySelector('span.rounded-full.bg-\\[var\\(--ec-ink-red\\)\\], span.rounded-full');

      function box(el) {
        if (!el) return null;
        const r = el.getBoundingClientRect();
        return { x: r.x, y: r.y, w: r.width, h: r.height, right: r.right, bottom: r.bottom };
      }

      const lineCs = line1 ? getComputedStyle(line1) : null;
      const tickCs = tick ? getComputedStyle(tick) : null;
      const underlineCs = underline ? getComputedStyle(underline) : null;

      const annBox = box(annEl);
      const scoreBox = box(score);
      const underlineBox = box(underline);
      const line4Box = box(line4);

      const overlap =
        annBox && scoreBox
          ? !(annBox.right < scoreBox.x || annBox.x > scoreBox.right || annBox.bottom < scoreBox.y || annBox.y > scoreBox.bottom)
          : null;

      return {
        answerLine_fontFamily: lineCs?.fontFamily ?? null,
        answerLine_fontWeight: lineCs?.fontWeight ?? null,
        tick_fontFamily: tickCs?.fontFamily ?? null,
        tick_text: tick?.textContent?.trim() ?? null,
        underline_transform: underlineCs?.transform ?? null,
        underline_width: underlineBox?.w ?? null,
        line4_width: line4Box?.w ?? null,
        underline_overshoot_px: underlineBox && line4Box ? Math.round((underlineBox.w - line4Box.w) * 100) / 100 : null,
        annotation_score_overlap: overlap,
        annotation_box: annBox,
        score_box: scoreBox,
      };
    })())`,
    returnByValue: true,
  })

  const raw = res.result?.value
  if (!raw) throw new Error('Inspect evaluate returned no value: ' + JSON.stringify(res))
  const data = JSON.parse(raw)
  await writeFile(join(outDir, 'inspect.json'), JSON.stringify(data, null, 2))
  return data
}

const chromeProc = launchChrome()
await mkdir(outDir, { recursive: true })

try {
  const { webSocketDebuggerUrl } = await waitForDebugger()
  const cdp = new CDP(webSocketDebuggerUrl)
  await cdp.open()
  await cdp.send('Page.enable')
  await cdp.send('Runtime.enable')

  const waitMs = 4500

  await captureViewport(cdp, {
    width: 1440,
    height: 900,
    filename: 'desktop-1440.png',
    waitMs,
  })
  await captureViewport(cdp, {
    width: 375,
    height: 812,
    filename: 'mobile-375.png',
    waitMs,
  })
  await captureDemoCloseup(cdp, waitMs)
  const inspect = await inspectComputed(cdp, waitMs)

  console.log(JSON.stringify(inspect, null, 2))
  cdp.close()
} finally {
  chromeProc.kill()
}
