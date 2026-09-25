import assert from 'node:assert/strict'

const JPEG = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 0x10, 0x4a, 0x46, 0x49, 0x46, 0, 1, 1, 0])
const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0x0d, 0x49, 0x48])
const PDF = new TextEncoder().encode('%PDF-1.7\n%\xe2\xe3\xcf\xd3\n1 0 obj\n')
const HTML = new TextEncoder().encode('<!doctype html><html><body>hi</body></html>')

async function main() {
  const {
    MAX_UPLOAD_FILE_BYTES,
    MAX_UPLOAD_PAGES,
    checkUploadFile,
    pageCountError,
    withUploadType,
  } = await import('./upload-limits')

  const page = (over: Partial<Parameters<typeof checkUploadFile>[0]>) =>
    checkUploadFile({
      label: 'Page 1',
      declaredType: 'image/jpeg',
      size: 1024,
      head: JPEG,
      expect: 'image',
      ...over,
    })

  // ── Happy paths return the sniffed type ──────────────────────────────────
  assert.deepEqual(page({}), { ok: true, type: 'image/jpeg' })
  assert.deepEqual(page({ declaredType: 'image/png', head: PNG }), { ok: true, type: 'image/png' })
  assert.deepEqual(
    page({ label: 'The answer PDF', declaredType: 'application/pdf', head: PDF, expect: 'pdf' }),
    { ok: true, type: 'application/pdf' }
  )

  // ── The bytes win over the declaration ───────────────────────────────────
  assert.deepEqual(
    page({ declaredType: 'image/jpeg', head: PNG }),
    { ok: true, type: 'image/png' },
    'a PNG declared as JPEG is treated as the PNG it is'
  )
  assert.deepEqual(
    page({ declaredType: '' }),
    { ok: true, type: 'image/jpeg' },
    'a browser that could not name the file still gets through on the bytes'
  )
  assert.deepEqual(page({ declaredType: 'image/heif', head: JPEG }), { ok: true, type: 'image/jpeg' })
  assert.deepEqual(page({ declaredType: 'IMAGE/JPEG' }), { ok: true, type: 'image/jpeg' })

  // ── HTML is refused whatever it calls itself ─────────────────────────────
  const html = page({ declaredType: 'text/html', head: HTML })
  assert.equal(html.ok, false)
  assert.match((html as { message: string }).message, /JPEG, PNG, WebP or HEIC/)
  const htmlAsJpeg = page({ declaredType: 'image/jpeg', head: HTML })
  assert.equal(htmlAsJpeg.ok, false, 'declaring the right type does not help')
  assert.match((htmlAsJpeg as { message: string }).message, /doesn't look like/)

  // ── Kind mismatches ──────────────────────────────────────────────────────
  const pdfAsPage = page({ declaredType: 'application/pdf', head: PDF })
  assert.equal(pdfAsPage.ok, false)
  assert.match((pdfAsPage as { message: string }).message, /answer PDF/)
  const pdfAsQuestion = page({
    label: 'The question photo',
    declaredType: 'application/pdf',
    head: PDF,
  })
  assert.match((pdfAsQuestion as { message: string }).message, /must be an image/)
  const jpegAsPdf = page({ label: 'The answer PDF', expect: 'pdf' })
  assert.equal(jpegAsPdf.ok, false)
  assert.match((jpegAsPdf as { message: string }).message, /must be a PDF/)
  const htmlAsPdf = page({ label: 'The answer PDF', declaredType: 'text/html', expect: 'pdf' })
  assert.match((htmlAsPdf as { message: string }).message, /must be a PDF/)

  // ── Size ─────────────────────────────────────────────────────────────────
  assert.equal(page({ size: MAX_UPLOAD_FILE_BYTES }).ok, true, 'exactly the cap is fine')
  const big = page({ size: MAX_UPLOAD_FILE_BYTES + 1 })
  assert.equal(big.ok, false)
  assert.match((big as { message: string }).message, /12 MB per file/)
  // Size is checked before the type, so a huge junk file gets the size
  // message — the one thing the student can act on.
  const bigJunk = page({ size: 50 * 1024 * 1024, declaredType: 'text/html', head: HTML })
  assert.match((bigJunk as { message: string }).message, /per file/)

  // ── Page count ───────────────────────────────────────────────────────────
  assert.equal(pageCountError(1), null)
  assert.equal(pageCountError(MAX_UPLOAD_PAGES), null)
  assert.match(pageCountError(MAX_UPLOAD_PAGES + 1) ?? '', /at most 20 pages/)

  // ── Re-typing a file ─────────────────────────────────────────────────────
  const declaredJpeg = new File([PNG], 'scan.jpg', { type: 'image/jpeg', lastModified: 5 })
  const same = withUploadType(declaredJpeg, 'image/jpeg')
  assert.equal(same, declaredJpeg, 'no allocation when the type already matches')
  const fixed = withUploadType(declaredJpeg, 'image/png')
  assert.equal(fixed.type, 'image/png')
  assert.equal(fixed.name, 'scan.jpg')
  assert.equal(fixed.size, PNG.length)
  assert.equal(fixed.lastModified, 5)
  assert.deepEqual(new Uint8Array(await fixed.arrayBuffer()), PNG, 'bytes untouched')

  console.log('upload-limits: all assertions passed')
}

void main()
