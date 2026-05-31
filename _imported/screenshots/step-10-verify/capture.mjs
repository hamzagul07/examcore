import { spawn } from 'node:child_process'
import { writeFile, mkdir } from 'node:fs/promises'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const outDir = dirname(fileURLToPath(import.meta.url))
const chrome = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const port = 9335
const url = 'http://localhost:3000/'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const proc = spawn(chrome, [
  `--remote-debugging-port=${port}`,
  '--headless=new',
  '--no-sandbox',
  '--disable-gpu',
  `--user-data-dir=${join(outDir, '.chrome-step10')}`,
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

const ws = new WebSocket(await getPage())
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

await mkdir(outDir, { recursive: true })
await send('Page.enable')
await send('Runtime.enable')

for (const { w, h, file } of [
  { w: 375, h: 812, file: 'verify-375.png' },
  { w: 768, h: 1024, file: 'verify-768.png' },
  { w: 1440, h: 900, file: 'verify-1440.png' },
]) {
  await send('Emulation.setDeviceMetricsOverride', {
    width: w,
    height: h,
    deviceScaleFactor: 1,
    mobile: w < 768,
  })
  await send('Page.navigate', { url })
  await sleep(1500)
  await send('Runtime.evaluate', {
    expression: `(() => { document.querySelector('figure[role="img"]')?.scrollIntoView({ block: 'center' }); window.scrollTo(0, 0); })()`,
  })
  await sleep(4500)
  const shot = await send('Page.captureScreenshot', { format: 'png' })
  await writeFile(join(outDir, file), Buffer.from(shot.data, 'base64'))
  console.log('wrote', file)
}

const checks = await send('Runtime.evaluate', {
  expression: `JSON.stringify({
    h1Count: document.querySelectorAll('h1').length,
    zenTheme: !!document.querySelector('[data-ec-theme="zen"]'),
    demoRole: document.querySelector('figure[role="img"]')?.getAttribute('aria-label')?.slice(0, 40),
  })`,
  returnByValue: true,
})
console.log(checks.result.value)

ws.close()
proc.kill()
