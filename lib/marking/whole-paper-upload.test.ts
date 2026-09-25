import assert from 'node:assert/strict'
import { RequestDeadlineExceededError } from '@/lib/ai/request-deadline'
import { MAX_PDF_PAGES } from '@/lib/marking/pdf-pages'
import {
  MAX_WHOLE_PAPER_PAGES,
  collectPageUploads,
  isPdfUpload,
  mapWithConcurrency,
  readPageTolerantly,
  resolvePageUploadType,
  sniffUploadType,
} from './whole-paper-upload'

const bytes = (...parts: Array<number[] | string>): Uint8Array => {
  const out: number[] = []
  for (const p of parts) {
    if (typeof p === 'string') for (const ch of p) out.push(ch.charCodeAt(0))
    else out.push(...p)
  }
  while (out.length < 16) out.push(0)
  return Uint8Array.from(out)
}

// --- the bytes decide what a file is, not the client's label ---------------------

const jpeg = bytes([0xff, 0xd8, 0xff, 0xe0])
const png = bytes([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
const webp = bytes('RIFF', [0, 0, 0, 0], 'WEBP')
const heic = bytes([0, 0, 0, 0x18], 'ftyp', 'heic')
const pdf = bytes('%PDF-1.7')
const html = bytes('<!doctype html><script>')

assert.equal(sniffUploadType(jpeg), 'image/jpeg')
assert.equal(sniffUploadType(png), 'image/png')
assert.equal(sniffUploadType(webp), 'image/webp')
assert.equal(sniffUploadType(heic), 'image/heic')
assert.equal(sniffUploadType(pdf), 'application/pdf')
assert.equal(sniffUploadType(html), null)
assert.equal(sniffUploadType(Uint8Array.from([1, 2, 3])), null, 'too short to be anything')

assert.equal(resolvePageUploadType('text/html', jpeg), 'image/jpeg', 'sniffed type wins over a wrong label')
assert.equal(resolvePageUploadType('image/jpeg', html), null, 'HTML labelled as an image is refused')
assert.equal(resolvePageUploadType('image/jpeg', pdf), null, 'a PDF is not a page image')
assert.equal(resolvePageUploadType('image/webp', bytes([0, 0, 0, 0])), null, 'a label never rescues unidentifiable bytes')
assert.equal(resolvePageUploadType('', heic), 'image/heic', 'a missing label (iOS HEIC) is fine when the bytes are clear')
assert.equal(isPdfUpload(pdf), true)
assert.equal(isPdfUpload(jpeg), false)

assert.equal(MAX_WHOLE_PAPER_PAGES, MAX_PDF_PAGES, 'photos and PDFs share one cap')

// --- page indices follow the client, so a skipped file cannot shift assignments --
{
  const file = (size: number) => new File([new Uint8Array(size)], 'p.jpg', { type: 'image/jpeg' })
  const { pages, emptyIndices } = collectPageUploads([
    ['manual_paper_code', '9709/12'],
    ['pages[2]', file(4)],
    ['pages[0]', file(4)],
    ['pages[1]', file(0)],
    ['pages[3]', file(4)],
  ])
  assert.deepEqual(pages.map((p) => p.clientIndex), [0, 2, 3], 'sorted by the client index, empty one skipped')
  assert.deepEqual(emptyIndices, [1], 'the empty file is reported, and its index is not reused')
}
{
  const { pages } = collectPageUploads([
    ['pages', new File([new Uint8Array(2)], 'a.jpg')],
    ['pages', new File([new Uint8Array(2)], 'b.jpg')],
  ])
  assert.deepEqual(pages.map((p) => p.clientIndex), [0, 1], 'bare keys number by arrival')
}
{
  const { pages } = collectPageUploads([['photo', new File([new Uint8Array(2)], 'a.jpg')]])
  assert.deepEqual(pages.map((p) => p.clientIndex), [0], 'legacy single photo')
  assert.deepEqual(collectPageUploads([['photo', new File([], 'a.jpg')]]), { pages: [], emptyIndices: [0] })
}

// --- OCR scheduling: bounded, ordered, and one bad page does not fail the paper --
async function main() {
  let inFlight = 0
  let peak = 0
  const out = await mapWithConcurrency([30, 5, 20, 1, 10], 2, async (ms, i) => {
    inFlight += 1
    peak = Math.max(peak, inFlight)
    await new Promise((r) => setTimeout(r, ms))
    inFlight -= 1
    return `${i}:${ms}`
  })
  assert.deepEqual(out, ['0:30', '1:5', '2:20', '3:1', '4:10'], 'results keep input order')
  assert.equal(peak, 2, 'never more than the limit in flight')

  const ok = await readPageTolerantly(async () => 'text')
  assert.deepEqual(ok, { ok: true, value: 'text' })

  const failed = await readPageTolerantly(async () => {
    throw new Error('gemini 503')
  })
  assert.equal(failed.ok, false, 'an ordinary failure becomes a reported miss, not a throw')

  await assert.rejects(
    readPageTolerantly(async () => {
      throw new RequestDeadlineExceededError(0)
    }),
    RequestDeadlineExceededError,
    'a spent budget is never tolerated into a blank page'
  )
}

main().then(() => console.log('whole-paper-upload: all assertions passed'))
