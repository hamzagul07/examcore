import assert from 'node:assert/strict'
import {
  buildAssignmentSetEmail,
  excerpt,
  formatDueDayUtc,
  formatDueUtc,
  greetingName,
  itemNoun,
  oneLine,
  studentAssignmentUrl,
} from '@/lib/email/assignment-set'

const NOW = new Date('2026-09-25T12:00:00Z')

// --- dates: always UTC, always labelled ----------------------------------------------

assert.equal(formatDueUtc('2026-10-02T16:00:00Z', NOW), 'Fri 2 Oct, 16:00 UTC')
assert.equal(formatDueUtc('2026-10-02T07:05:00+05:00', NOW), 'Fri 2 Oct, 02:05 UTC', 'converted, not echoed')
assert.equal(formatDueUtc('2027-01-04T09:00:00Z', NOW), 'Mon 4 Jan 2027, 09:00 UTC', 'another year says so')
assert.equal(formatDueUtc(null, NOW), null)
assert.equal(formatDueUtc('garbage', NOW), null)
assert.equal(formatDueDayUtc('2026-10-02T23:30:00Z'), 'Fri 2 Oct')

// --- text hygiene -------------------------------------------------------------------------

assert.equal(oneLine('  Vectors \r\n drill\t2 ', 50), 'Vectors drill 2')
assert.equal(oneLine('a\u0000b\u001fc', 50), 'a b c', 'control characters never reach a header')
assert.equal(oneLine(null, 10), '')
{
  const long = oneLine('The quick brown fox jumps over the lazy dog again and again', 30)
  assert.ok(Array.from(long).length <= 30, long)
  assert.match(long, /…$/)
  assert.doesNotMatch(long, / …$/, 'cut at a word, no dangling space')
}
{
  const e = excerpt('Para one.\r\n\r\n\r\n\r\nPara two.', 100)
  assert.deepEqual(e, { text: 'Para one.\n\nPara two.', truncated: false })
  const cut = excerpt('word '.repeat(200), 50)
  assert.equal(cut.truncated, true)
  assert.ok(Array.from(cut.text).length <= 50)
}

assert.equal(greetingName('Amira Khan'), 'Amira')
{
  const hostile = greetingName('<script>alert(1)</script> Jo Ng')
  assert.match(hostile, /^[\p{L}'’-]+$/u, 'markup never reaches a greeting: letters only')
  assert.doesNotMatch(hostile, /script|[<>()]/i)
}
assert.equal(greetingName(null), 'there')
assert.equal(greetingName('   '), 'there')

assert.equal(itemNoun('question_set', 1), 'question')
assert.equal(itemNoun('topic_drill', 3), 'questions')
assert.equal(itemNoun('whole_paper', 2), 'papers')
assert.equal(itemNoun('practice_prompt', 1), 'prompt')

// --- the email --------------------------------------------------------------------------

const base = {
  to: 'amira@example.com',
  recipientName: 'Amira Khan',
  teacherName: 'Sarah Kowalski',
  className: 'Year 13 Maths',
  assignmentId: '00000000-0000-4000-8000-00000000a551',
  title: 'Vectors drill',
  kind: 'question_set' as const,
  itemCount: 4,
  dueAt: '2026-10-02T16:00:00Z',
  unsubscribeHref: 'https://markscheme.app/community/unsubscribe?token=abc',
  now: NOW,
}

{
  const email = buildAssignmentSetEmail(base)
  assert.equal(email.subject, 'New set: Vectors drill (due Fri 2 Oct)')
  assert.match(email.text, /^Hi Amira,/)
  assert.match(email.text, /Sarah K\. has set new work for Year 13 Maths\./)
  assert.match(email.text, /Questions · 4 questions · Due Fri 2 Oct, 16:00 UTC/)
  assert.doesNotMatch(email.html + email.text, /Kowalski|Khan/, 'surnames never leave the app (displayName only)')
  assert.match(email.html, new RegExp(studentAssignmentUrl(base.assignmentId).replace(/[.?]/g, '\\$&')), 'CTA opens the set')
  assert.match(email.html, /Marks on this set are visible to your teacher/, 'the visibility notice is in the email too')
  assert.match(email.html, /Stop emails about work your teacher sets/)
  assert.ok(email.html.includes(base.unsubscribeHref), 'unsubscribe link present')
  assert.match(email.text, /Stop emails about work your teacher sets: https:\/\/markscheme\.app\/community\/unsubscribe/)
}

{
  // The teacher's own text is escaped, not rendered.
  const hostile = buildAssignmentSetEmail({
    ...base,
    title: '<img src=x onerror=alert(1)> Drill',
    className: 'Maths "A" & <b>B</b>',
    instructions: 'Show working.\n<script>steal()</script>',
    isMock: true,
    timedMinutes: 45,
    dueAt: null,
  })
  assert.doesNotMatch(hostile.html, /<img src=x|<script>|<b>B<\/b>/)
  assert.match(hostile.html, /&lt;img src=x onerror=alert\(1\)&gt; Drill/)
  assert.match(hostile.html, /Maths &quot;A&quot; &amp; &lt;b&gt;B&lt;\/b&gt;/)
  assert.match(hostile.text, /No deadline · Timed: 45 min · Mock/)
  assert.equal(hostile.subject, 'New set: <img src=x onerror=alert(1)> Drill', 'subjects are plain text; the mail client escapes them')
  assert.doesNotMatch(hostile.subject, /[\r\n]/)
}

{
  const long = buildAssignmentSetEmail({ ...base, instructions: 'Read carefully. '.repeat(100) })
  assert.match(long.text, /…/, 'long instructions are an excerpt; the full text is on the set page')
  const noNotes = buildAssignmentSetEmail({ ...base, instructions: '   ' })
  assert.doesNotMatch(noNotes.text, /From Sarah K\.:/, 'no empty instructions block')
}

console.log('assignment-set.test.ts — all assertions passed')
