import fs from 'fs'
import path from 'path'
const worker = await import('pdfjs-dist/legacy/build/pdf.worker.mjs')
globalThis.pdfjsWorker = worker
const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs')
pdfjs.GlobalWorkerOptions.workerSrc = 'pdfjs-dist/legacy/build/pdf.worker.mjs'
const data = new Uint8Array(fs.readFileSync('content/source-notes/9702/_senpai-import/chapter-01.pdf'))
const doc = await pdfjs.getDocument({ data, useSystemFonts: true }).promise
for (let p = 1; p <= doc.numPages; p++) {
  const page = await doc.getPage(p)
  const text = (await page.getTextContent()).items.map((i) => i.str).join(' ')
  console.log('page', p, text.slice(0, 400))
}
