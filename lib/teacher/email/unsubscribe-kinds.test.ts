import assert from 'node:assert/strict'
import {
  ONE_CLICK_UNSUBSCRIBE_PATH,
  oneClickUrlFromPageHref,
  signUnsubscribeToken,
  subscribeColumnPatch,
  unsubscribeColumnPatch,
  unsubscribeLabel,
  unsubscribeUrl,
  verifyUnsubscribeToken,
  type UnsubscribeKind,
} from '@/lib/community/email-unsubscribe'

/**
 * The two unsubscribe kinds the teacher system adds (docs/TEACHER_SYSTEM_SPEC.md §5):
 * `assignments` (sets, reminders, teacher feedback → email_assignments) and
 * `teacher_digest` (the Sunday digest → email_teacher_digest). The link in
 * every one of those emails is the only way some recipients will ever find
 * the switch, so it must verify, and it must switch off exactly its own column.
 */

const USER = '11111111-2222-3333-4444-555555555555'
const NEW_KINDS: UnsubscribeKind[] = ['assignments', 'teacher_digest']
const ALL_KINDS: UnsubscribeKind[] = [
  'replies',
  'digest',
  'threads',
  'review',
  'weekly',
  'streak',
  'activation',
  'updates',
  'mark_ready',
  'exam',
  ...NEW_KINDS,
]

for (const kind of NEW_KINDS) {
  // Signed links verify, both on the page and through the one-click endpoint.
  const token = signUnsubscribeToken(USER, kind)
  assert.deepEqual(verifyUnsubscribeToken(token), { userId: USER, kind }, `${kind}: token round trip`)

  const page = unsubscribeUrl(USER, kind)
  const oneClick = oneClickUrlFromPageHref(page)
  assert.ok(oneClick?.includes(ONE_CLICK_UNSUBSCRIBE_PATH), `${kind}: one-click URL derived`)
  const fromHeader = new URL(oneClick as string).searchParams.get('token') ?? ''
  assert.deepEqual(verifyUnsubscribeToken(fromHeader), { userId: USER, kind }, `${kind}: header link verifies`)

  // A kind cannot be swapped under an existing signature.
  const [, , exp, sig] = Buffer.from(token, 'base64url').toString('utf8').split('.')
  const other = kind === 'assignments' ? 'teacher_digest' : 'assignments'
  const swapped = Buffer.from(`${USER}.${other}.${exp}.${sig}`, 'utf8').toString('base64url')
  assert.equal(verifyUnsubscribeToken(swapped), null, `${kind}: swapped kind rejected`)
}

assert.deepEqual(unsubscribeColumnPatch('assignments'), { email_assignments: false })
assert.deepEqual(unsubscribeColumnPatch('teacher_digest'), { email_teacher_digest: false })
assert.deepEqual(subscribeColumnPatch('assignments'), { email_assignments: true }, 'the re-permission twin')
assert.deepEqual(subscribeColumnPatch('teacher_digest'), { email_teacher_digest: true })
assert.match(unsubscribeLabel('assignments'), /teacher sets/)
assert.match(unsubscribeLabel('teacher_digest'), /digest of your classes/)

// Each kind switches off exactly one column, and none shares one with
// another — unsubscribing from the digest must not silence a student's sets.
{
  const seen = new Map<string, UnsubscribeKind>()
  for (const kind of ALL_KINDS) {
    const cols = Object.keys(unsubscribeColumnPatch(kind))
    assert.equal(cols.length, 1, `${kind} patches ${cols.length} columns`)
    const clash = seen.get(cols[0])
    assert.equal(clash, undefined, `${kind} and ${clash} both write ${cols[0]}`)
    seen.set(cols[0], kind)
    assert.ok(unsubscribeLabel(kind).length > 0, `${kind} has no label`)
  }
}

// An unknown kind is still refused, however well formed.
{
  const token = signUnsubscribeToken(USER, 'assignments')
  const [, , exp, sig] = Buffer.from(token, 'base64url').toString('utf8').split('.')
  const bogus = Buffer.from(`${USER}.everything.${exp}.${sig}`, 'utf8').toString('base64url')
  assert.equal(verifyUnsubscribeToken(bogus), null)
}

console.log('unsubscribe-kinds.test.ts — all assertions passed')
