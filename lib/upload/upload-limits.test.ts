import assert from 'node:assert/strict'
import {
  MAX_UPLOAD_PAGES,
  MAX_UPLOAD_PAYLOAD_BYTES,
  describeUploadTotal,
  getPageCountError,
  pagesRemainingUnderCap,
} from './upload-limits'

async function main() {
  // The client cap must be the server cap, or one side refuses what the other
  // accepts. The server module is imported here (node) rather than in the
  // page, where it would drag pdf-lib into the bundle.
  const server = await import('@/lib/http/upload-limits')
  assert.equal(MAX_UPLOAD_PAGES, server.MAX_UPLOAD_PAGES, 'client/server page cap drifted')
  assert.equal(getPageCountError(MAX_UPLOAD_PAGES + 1), server.pageCountError(MAX_UPLOAD_PAGES + 1))

  assert.equal(getPageCountError(MAX_UPLOAD_PAGES), null)
  assert.equal(getPageCountError(0), null)
  assert.match(getPageCountError(MAX_UPLOAD_PAGES + 1) ?? '', /at most/)

  assert.equal(pagesRemainingUnderCap(0, 5), 5)
  assert.equal(pagesRemainingUnderCap(MAX_UPLOAD_PAGES - 2, 5), 2)
  assert.equal(pagesRemainingUnderCap(MAX_UPLOAD_PAGES, 5), 0)
  assert.equal(pagesRemainingUnderCap(MAX_UPLOAD_PAGES + 3, 5), 0)

  const mb = (n: number) => ({ size: Math.round(n * 1_000_000) })
  assert.equal(describeUploadTotal([]).tone, 'ok')
  assert.equal(describeUploadTotal([mb(1), mb(1.5)]).tone, 'ok')
  assert.equal(describeUploadTotal([mb(3.5)]).tone, 'warning')
  assert.equal(describeUploadTotal([mb(4.5)]).tone, 'over')
  assert.equal(describeUploadTotal([mb(1)]).bytes, 1_000_000)
  assert.match(describeUploadTotal([mb(1)]).label, /of 3\.8 MB/)
  assert.equal(MAX_UPLOAD_PAYLOAD_BYTES, 4_000_000)

  console.log('upload-limits: ok')
}

void main()
