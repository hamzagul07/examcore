import assert from 'node:assert/strict'
import { formatClientMarkError } from './client-mark-errors'

const client = formatClientMarkError(new TypeError('Failed to fetch'))
assert.equal(client.retryable, true)
assert.match(client.message, /connection lost/i)

console.log('client-mark-errors.test.ts: ok')
