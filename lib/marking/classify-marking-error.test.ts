import assert from 'node:assert/strict'

// classify-marking-error pulls in mark-runner (for MarkingParseError), which
// constructs Supabase clients at module load. Placeholders + dynamic import
// keep this test runnable with no secrets — it exercises pure logic only.
process.env.NEXT_PUBLIC_SUPABASE_URL ||= 'http://localhost:54321'
process.env.SUPABASE_SERVICE_ROLE_KEY ||= 'test-service-role-key'


/**
 * The classifier decides three things the user and our telemetry both depend
 * on: the HTTP status, whether the UI offers "try again", and the `error_code`
 * written to mark_runs. Getting a user-input problem wrong means telling the
 * student to retry something guaranteed to fail, and logging their blurry photo
 * as an infrastructure failure.
 */
async function main() {
  // Imported here, not at module scope: tsx emits CJS, so top-level await is
  // unavailable and the env placeholders above must be set before these load.
  const { classifyMarkingError } = await import(
    '@/lib/marking/classify-marking-error'
  )
  const { RequestDeadlineExceededError } = await import(
    '@/lib/ai/request-deadline'
  )

  // Every message thrown for "you need to give us something" must classify as
  // a non-retryable client error. These are matched by SUBSTRING, so editing
  // the copy in the pipeline can silently break the mapping — which is exactly
  // what had happened to the two "find a question in your upload" messages.
  const clientMessages = [
    'We could not identify this as a past paper question. Please also upload a photo of the question, or type the question text below.',
    "We couldn't find a question in your upload. Try a clearer scan, or use My question mode to add the question separately.",
    "We couldn't find a question in your upload. Add a photo of the question, type it below, or pick the paper — then we can mark it.",
    'Please select a subject for your question.',
    'Add your question — type it or upload a photo — before we can mark your answer.',
  ]
  for (const message of clientMessages) {
    const c = classifyMarkingError(new Error(message))
    assert.equal(c.code, 'client', `expected client code for: ${message.slice(0, 50)}…`)
    assert.equal(c.status, 400, `expected 400 for: ${message.slice(0, 50)}…`)
    assert.equal(c.retryable, false, `must not offer retry for: ${message.slice(0, 50)}…`)
    assert.equal(c.message, message, 'client messages are surfaced verbatim')
  }

  // Unreadable upload is its own code — distinguishable from "no question".
  const ocr = classifyMarkingError(
    new Error("We couldn't read any answer in your photo. No handwriting detected.")
  )
  assert.equal(ocr.code, 'ocr_empty')
  assert.equal(ocr.retryable, false)

  // Budget exhaustion must not masquerade as a generic failure: it is
  // retryable, but only after a wait, and it carries its own message.
  const deadline = classifyMarkingError(
    new RequestDeadlineExceededError(0, new Error('server overloaded'))
  )
  assert.equal(deadline.code, 'timeout')
  assert.equal(deadline.retryable, true)
  assert.equal(deadline.status, 503)

  // Anything unrecognised stays a retryable server error — the safe default.
  const unknown = classifyMarkingError(new Error('something exploded'))
  assert.equal(unknown.code, 'unknown')
  assert.equal(unknown.status, 500)
  assert.equal(unknown.retryable, true)

  console.log('classify-marking-error.test.ts: ok')
}

void main()
