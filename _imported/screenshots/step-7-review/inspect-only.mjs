import { spawn } from 'node:child_process'
import { writeFile } from 'node:fs/promises'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const outDir = dirname(fileURLToPath(import.meta.url))
const chrome = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const port = 9334

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const proc = spawn(chrome, [
  `--remote-debugging-port=${port}`,
  '--headless=new',
  '--no-sandbox',
  '--disable-gpu',
  `--user-data-dir=${join(outDir, '.chrome-inspect')}`,
  'about:blank',
])

async function getPage() {
  for (let i = 0; i < 40; i++) {
    try {
      const targets = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()
      const page = targets.find((t) => t.type === 'page')
      if (page) return page.webSocketDebuggerUrl
    } catch {}
    await sleep(250)
  }
  throw new Error('no page')
}

const wsUrl = await getPage()
const ws = new WebSocket(wsUrl)
await new Promise((r) => (ws.onopen = r))
let id = 0
const pending = new Map()
ws.onmessage = (ev) => {
  const msg = JSON.parse(ev.data)
  if (msg.id && pending.has(msg.id)) {
    pending.get(msg.id)(msg)
    pending.delete(msg.id)
  }
}
const send = (method, params = {}) =>
  new Promise((resolve, reject) => {
    const i = ++id
    pending.set(i, (msg) =>
      msg.error ? reject(new Error(msg.error.message)) : resolve(msg.result),
    )
    ws.send(JSON.stringify({ id: i, method, params }))
  })

await send('Page.enable')
await send('Runtime.enable')
await send('Emulation.setDeviceMetricsOverride', {
  width: 1440,
  height: 900,
  deviceScaleFactor: 1,
  mobile: false,
})
await send('Page.navigate', { url: 'http://localhost:3000/' })
await sleep(1500)
await send('Runtime.evaluate', {
  expression: `(() => { document.querySelector('figure[role="img"]')?.scrollIntoView({ block: 'center' }); })()`,
})
await sleep(4500)

const res = await send('Runtime.evaluate', {
  expression: `JSON.stringify((() => {
    const fig = document.querySelector('figure[role="img"]');
    const items = [...fig.querySelectorAll('li')];
    const line1 = items[0]?.querySelector('span.inline-block');
    const line4 = items[3]?.querySelector('span.inline-block');
    const tick = items[0]?.querySelector('span[aria-hidden]');
    const underline = line4?.querySelector('span.absolute');
    const annEl = [...(items[2]?.querySelectorAll('span[aria-hidden]') || [])].find(
      (el) => el.textContent?.includes('M1')
    );
    const score = fig.querySelector('span.rounded-full');
    const lineCs = line1 ? getComputedStyle(line1) : null;
    const tickCs = tick ? getComputedStyle(tick) : null;
    function box(el) {
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { x: r.x, y: r.y, w: r.width, h: r.height, right: r.right, bottom: r.bottom };
    }
    const annBox = box(annEl);
    const scoreBox = box(score);
    const uBox = box(underline);
    const l4Box = box(line4);
    return {
      answerLine_fontFamily: lineCs?.fontFamily,
      tick_fontFamily: tickCs?.fontFamily,
      tick_text: tick?.textContent?.trim(),
      underline_overshoot_px: uBox && l4Box ? uBox.w - l4Box.w : null,
      annotation_score_overlap: annBox && scoreBox
        ? !(annBox.right < scoreBox.x || annBox.x > scoreBox.right || annBox.bottom < scoreBox.y || annBox.y > scoreBox.bottom)
        : null,
      annotation_box: annBox,
      score_box: scoreBox,
    };
  })())`,
  returnByValue: true,
})

const data = JSON.parse(res.result.value)
await writeFile(join(outDir, 'inspect.json'), JSON.stringify(data, null, 2))
console.log(JSON.stringify(data, null, 2))
ws.close()
proc.kill()
