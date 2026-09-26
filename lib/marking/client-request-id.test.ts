import assert from 'node:assert/strict'
import {
  CLIENT_REQUEST_ID_RE,
  isValidClientRequestId,
  newClientRequestId,
} from './client-request-id'

// A UUID must pass the server's regex, or the dedupe is silently off.
{
  const id = newClientRequestId()
  assert.ok(isValidClientRequestId(id), `uuid rejected: ${id}`)
  assert.ok(id.length >= 8 && id.length <= 64)
}

// Two submits never share a key.
{
  const seen = new Set<string>()
  for (let i = 0; i < 200; i++) seen.add(newClientRequestId())
  assert.equal(seen.size, 200)
}

// The fallback (no randomUUID) still produces a valid, url-safe key.
{
  const id = newClientRequestId({
    getRandomValues: <T extends ArrayBufferView | null>(arr: T) => {
      if (arr instanceof Uint8Array) for (let i = 0; i < arr.length; i++) arr[i] = i * 7
      return arr
    },
  })
  assert.equal(id.length, 32)
  assert.ok(CLIENT_REQUEST_ID_RE.test(id))
}

// Shapes the server refuses.
assert.equal(isValidClientRequestId('short'), false)
assert.equal(isValidClientRequestId('has space here'), false)
assert.equal(isValidClientRequestId('x'.repeat(65)), false)
assert.equal(isValidClientRequestId(null), false)
assert.equal(isValidClientRequestId('abcdefgh'), true)

console.log('client-request-id: ok')
