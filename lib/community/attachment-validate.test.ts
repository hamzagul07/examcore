import assert from 'node:assert/strict'
import {
  MAX_ATTACHMENTS,
  MAX_ATTACHMENT_BYTES,
  MAX_ATTACHMENT_NAME,
  attachmentKindForMime,
  attachmentPathPattern,
  cleanAttachmentName,
  extForMime,
  isOwnedAttachmentPath,
  normalizeAttachment,
  normalizeAttachments,
  normalizeImagePaths,
  sniffMatchesMime,
} from './attachment-validate'

const ME = '11111111-2222-3333-4444-555555555555'
const OTHER = '99999999-8888-7777-6666-555555555555'
const OWN_PDF = `${ME}/1758800000000-3f9a1c2b4d5e.pdf`
const OWN_PNG = `${ME}/1758800000000-a1b2c3.png`

// --- path ownership --------------------------------------------------------

assert.ok(isOwnedAttachmentPath(OWN_PDF, ME), 'own pdf in generated shape is accepted')
assert.ok(isOwnedAttachmentPath(OWN_PNG, ME), 'six-char legacy suffix still accepted')
assert.equal(
  isOwnedAttachmentPath(`${OTHER}/1758800000000-3f9a1c2b4d5e.pdf`, ME),
  false,
  'another user\'s folder is rejected — this is the republish-a-removed-attachment hole'
)
assert.equal(isOwnedAttachmentPath(`${ME}/../${OTHER}/x.pdf`, ME), false, 'traversal rejected')
assert.equal(isOwnedAttachmentPath(`${ME}/1758800000000-3f9a1c.exe`, ME), false, 'unknown ext')
assert.equal(isOwnedAttachmentPath(`${ME}/1758800000000-3f9a1c.PDF`, ME), false, 'ext is lowercase')
assert.equal(isOwnedAttachmentPath(`${ME}/1758800000000-ab.pdf`, ME), false, 'suffix too short')
assert.equal(isOwnedAttachmentPath(`${ME}/x-3f9a1c2b4d5e.pdf`, ME), false, 'timestamp must be digits')
assert.equal(isOwnedAttachmentPath(` ${OWN_PDF}`, ME), false, 'no leading whitespace')
assert.equal(isOwnedAttachmentPath(`${OWN_PDF}\n`, ME), false, 'no trailing newline')
assert.equal(isOwnedAttachmentPath(OWN_PDF, ''), false, 'empty user id never matches')
assert.equal(isOwnedAttachmentPath(42, ME), false, 'non-string rejected')
assert.equal(isOwnedAttachmentPath(OWN_PDF, ME, { imagesOnly: true }), false, 'pdf is not an image')
assert.ok(isOwnedAttachmentPath(OWN_PNG, ME, { imagesOnly: true }), 'png is an image')

// A user id containing regex metacharacters must be matched literally.
assert.equal(
  isOwnedAttachmentPath('anyone/1758800000000-3f9a1c2b4d5e.pdf', '.*'),
  false,
  'user id is escaped before it becomes a pattern'
)
assert.ok(attachmentPathPattern(ME).source.startsWith('^'), 'anchored at start')
assert.ok(attachmentPathPattern(ME).source.endsWith('$'), 'anchored at end')

// --- mime table ------------------------------------------------------------

assert.equal(attachmentKindForMime('image/png'), 'image')
assert.equal(attachmentKindForMime('IMAGE/JPEG'), 'image', 'case-insensitive')
assert.equal(attachmentKindForMime('application/pdf'), 'pdf')
assert.equal(attachmentKindForMime('text/csv'), 'doc')
assert.equal(attachmentKindForMime('text/html'), null, 'html is never an attachment')
assert.equal(attachmentKindForMime('image/svg+xml'), null, 'svg can carry script')
assert.equal(extForMime('image/jpeg'), 'jpg')
assert.equal(extForMime('application/x-msdownload'), null)

// --- descriptor normalisation ---------------------------------------------

{
  const a = normalizeAttachment(
    { path: OWN_PDF, name: 'notes.pdf', kind: 'image', mime: 'application/pdf', size: 1234 },
    ME
  )
  assert.ok(a)
  assert.equal(a.kind, 'pdf', 'kind is recomputed from the mime, not trusted')
  assert.equal(a.name, 'notes.pdf')
  assert.equal(a.size, 1234)
}
assert.equal(
  normalizeAttachment({ path: OWN_PDF, name: 'x', mime: 'image/png', size: 1 }, ME),
  null,
  'mime that does not match the path extension is rejected'
)
assert.equal(
  normalizeAttachment({ path: OWN_PDF, name: 'x', mime: 'application/pdf', size: -1 }, ME),
  null,
  'negative size rejected'
)
assert.equal(
  normalizeAttachment(
    { path: OWN_PDF, name: 'x', mime: 'application/pdf', size: MAX_ATTACHMENT_BYTES + 1 },
    ME
  ),
  null,
  'over-cap size rejected'
)
assert.equal(
  normalizeAttachment({ path: OWN_PDF, name: 'x', mime: 'application/pdf', size: '12' }, ME),
  null,
  'string size rejected'
)
assert.equal(normalizeAttachment('nope', ME), null)
assert.equal(normalizeAttachment(null, ME), null)

// Name hygiene: capped, control characters out, never empty.
{
  const long = 'a'.repeat(500)
  const a = normalizeAttachment({ path: OWN_PDF, name: long, mime: 'application/pdf', size: 1 }, ME)
  assert.equal(a?.name.length, MAX_ATTACHMENT_NAME, 'name capped at 120')
}
assert.equal(cleanAttachmentName('ev\u0000il\r\n.pdf', OWN_PDF), 'evil.pdf')
assert.equal(cleanAttachmentName('../../etc/passwd', OWN_PDF), '..-..-etc-passwd')
assert.equal(cleanAttachmentName('', OWN_PDF), '1758800000000-3f9a1c2b4d5e.pdf', 'blank → basename')
assert.equal(cleanAttachmentName(undefined, OWN_PDF), '1758800000000-3f9a1c2b4d5e.pdf')

// --- list normalisation ----------------------------------------------------

{
  const ok = normalizeAttachments(undefined, ME)
  assert.deepEqual(ok, { ok: true, attachments: [] })
}
{
  const r = normalizeAttachments('x', ME)
  assert.equal(r.ok, false, 'non-array rejected')
}
{
  const good = { path: OWN_PDF, name: 'a', mime: 'application/pdf', size: 1 }
  const r = normalizeAttachments(Array.from({ length: MAX_ATTACHMENTS + 1 }, () => good), ME)
  assert.equal(r.ok, false, 'over the per-post cap is an error')
}
{
  const good = { path: OWN_PDF, name: 'a', mime: 'application/pdf', size: 1 }
  const bad = { path: `${OTHER}/1758800000000-3f9a1c2b4d5e.pdf`, name: 'b', mime: 'application/pdf', size: 1 }
  const r = normalizeAttachments([good, bad], ME)
  assert.equal(r.ok, false, 'one foreign path fails the whole list rather than being dropped')
}
{
  const good = { path: OWN_PDF, name: 'a', mime: 'application/pdf', size: 1 }
  const r = normalizeAttachments([good, { ...good, name: 'dup' }], ME)
  assert.ok(r.ok)
  assert.equal(r.attachments.length, 1, 'duplicate paths collapse')
}

// --- note image paths ------------------------------------------------------

{
  const r = normalizeImagePaths([OWN_PNG, OWN_PNG], ME, 8)
  assert.ok(r.ok)
  assert.deepEqual(r.paths, [OWN_PNG])
}
assert.equal(normalizeImagePaths([OWN_PDF], ME, 8).ok, false, 'a pdf is not a note image')
assert.equal(
  normalizeImagePaths([`${OTHER}/1758800000000-a1b2c3.png`], ME, 8).ok,
  false,
  'foreign image rejected'
)
assert.equal(normalizeImagePaths(Array(9).fill(OWN_PNG), ME, 8).ok, false, 'note image cap')

// --- magic bytes -----------------------------------------------------------

const png = Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13])
const jpg = Uint8Array.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46])
const gif = Uint8Array.from([...Buffer.from('GIF89a'), 1, 0, 1, 0])
const webp = Uint8Array.from([...Buffer.from('RIFF'), 0x24, 0, 0, 0, ...Buffer.from('WEBPVP8 ')])
const pdf = Uint8Array.from(Buffer.from('%PDF-1.7\n%âãÏÓ'))
const zip = Uint8Array.from([0x50, 0x4b, 0x03, 0x04, 0x14, 0, 0, 0])
const ole = Uint8Array.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1, 0, 0])
const html = Uint8Array.from(Buffer.from('<!doctype html><script>alert(1)</script>'))
const text = Uint8Array.from(Buffer.from('q1,q2,q3\n4,5,6\n'))

assert.ok(sniffMatchesMime(png, 'image/png'))
assert.ok(sniffMatchesMime(jpg, 'image/jpeg'))
assert.ok(sniffMatchesMime(jpg, 'image/jpg'))
assert.ok(sniffMatchesMime(gif, 'image/gif'))
assert.ok(sniffMatchesMime(webp, 'image/webp'))
assert.ok(sniffMatchesMime(pdf, 'application/pdf'))
assert.ok(
  sniffMatchesMime(zip, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document')
)
assert.ok(sniffMatchesMime(ole, 'application/msword'))
assert.ok(sniffMatchesMime(text, 'text/csv'))
assert.ok(sniffMatchesMime(text, 'text/plain'))

assert.equal(sniffMatchesMime(html, 'image/png'), false, 'html declared as png is refused')
assert.equal(sniffMatchesMime(html, 'application/pdf'), false, 'html declared as pdf is refused')
assert.equal(sniffMatchesMime(jpg, 'image/png'), false, 'jpeg declared as png is refused')
assert.equal(sniffMatchesMime(png, 'text/plain'), false, 'binary declared as text is refused')
assert.equal(
  sniffMatchesMime(Uint8Array.from([0x41, 0x00, 0x42]), 'text/plain'),
  false,
  'NUL byte means not text'
)
assert.equal(sniffMatchesMime(Uint8Array.from(Buffer.from('RIFF....WAVE')), 'image/webp'), false, 'wav is not webp')
assert.equal(sniffMatchesMime(new Uint8Array(0), 'image/png'), false, 'empty is nothing')
assert.equal(sniffMatchesMime(png, 'text/html'), false, 'unknown mime never matches')

console.log('attachment-validate tests passed')
