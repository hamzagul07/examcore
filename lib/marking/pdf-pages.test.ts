import assert from 'node:assert/strict'
import { PDFDocument } from 'pdf-lib'
import {
  MAX_PDF_PAGES,
  PDF_OCR_CONCURRENCY,
  ocrPdfToPages,
  splitPdfPages,
  type PdfPageOcr,
} from '@/lib/marking/pdf-pages'

async function makePdf(pages: number): Promise<ArrayBuffer> {
  const doc = await PDFDocument.create()
  for (let i = 0; i < pages; i++) doc.addPage([300, 400])
  const bytes = await doc.save()
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

async function main() {
  // --- splitting ------------------------------------------------------------------
  {
    const split = await splitPdfPages(await makePdf(3))
    assert.equal(split.total, 3)
    assert.equal(split.pages.length, 3)
    for (const page of split.pages) {
      const doc = await PDFDocument.load(page)
      assert.equal(doc.getPageCount(), 1, 'each piece is a one-page PDF')
    }
    const capped = await splitPdfPages(await makePdf(6), 4)
    assert.equal(capped.total, 6, 'the count reports the whole document')
    assert.equal(capped.pages.length, 4, 'only the first pages are kept')
    assert.ok(MAX_PDF_PAGES >= 15, 'the default cap covers a whole exam script')
  }

  // --- per-page OCR, in order, bounded in flight ------------------------------------
  {
    let inFlight = 0
    let maxInFlight = 0
    const seen: number[] = []
    const pages = await ocrPdfToPages(await makePdf(6), {
      ocrPage: async (bytes, pageNumber) => {
        inFlight += 1
        maxInFlight = Math.max(maxInFlight, inFlight)
        seen.push(pageNumber)
        assert.ok(bytes.byteLength > 0)
        // Later pages finish first, so order must come from the index, not completion.
        await sleep(pageNumber % 2 === 0 ? 5 : 25)
        inFlight -= 1
        return { full_text: `page ${pageNumber}`, lines: [] }
      },
    })
    assert.deepEqual(
      pages.map((p) => [p.page_index, p.full_text]),
      [1, 2, 3, 4, 5, 6].map((n) => [n, `page ${n}`]),
      'document order, whatever order the reads finished in'
    )
    assert.equal(maxInFlight, PDF_OCR_CONCURRENCY, `bounded at ${PDF_OCR_CONCURRENCY} in flight`)
    assert.equal(new Set(seen).size, 6, 'every page read exactly once')
  }

  // --- the cap, and the page count reported for the run log ---------------------------
  {
    let reported: [number, number] | null = null
    const pages = await ocrPdfToPages(await makePdf(5), {
      maxPages: 3,
      onPageCount: (total, read) => {
        reported = [total, read]
      },
      ocrPage: async (_b, n) => ({ full_text: `p${n}`, lines: [] }),
    })
    assert.equal(pages.length, 3)
    assert.deepEqual(reported, [5, 3])
  }

  // --- a single page still goes through the per-page read ------------------------------
  {
    const pages = await ocrPdfToPages(await makePdf(1), {
      ocrPage: async () => ({ full_text: 'only', lines: [{ text: 'only', bbox: { top: 1, left: 1, width: 10, height: 2 } }] }),
    })
    assert.equal(pages.length, 1)
    assert.equal(pages[0]!.lines.length, 1, 'line boxes survive')
  }

  // --- a file that will not split falls back to the whole-document read -----------------
  {
    let wholeCalls = 0
    const whole = async (): Promise<PdfPageOcr[]> => {
      wholeCalls += 1
      return [{ page_index: 1, full_text: 'whole', lines: [] }]
    }
    const junk = new TextEncoder().encode('not a pdf at all').buffer as ArrayBuffer
    const pages = await ocrPdfToPages(junk, { ocrPage: async () => ({ full_text: 'never', lines: [] }), ocrWhole: whole })
    assert.equal(wholeCalls, 1)
    assert.equal(pages[0]!.full_text, 'whole')

    // No per-page reader supplied: the old behaviour, unchanged.
    const legacy = await ocrPdfToPages(await makePdf(2), { ocrWhole: whole } as never)
    assert.equal(wholeCalls, 2)
    assert.equal(legacy[0]!.full_text, 'whole')
  }

  console.log('pdf-pages.test.ts: ok')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
