import assert from 'node:assert/strict'
import {
  buildTeacherDigestEmail,
  digestSubject,
  namesLine,
  setMetaLine,
  teacherReviewsUrl,
  teacherSetUrl,
  teacherStudentsUrl,
} from '@/lib/email/teacher-digest'
import type { DigestClass, TeacherDigest } from '@/lib/teacher/digest'

assert.equal(namesLine(['Amira K.'], 1), 'Amira K.')
assert.equal(namesLine(['Amira K.', 'Ben O.'], 2), 'Amira K. and Ben O.')
assert.equal(namesLine(['Amira K.', 'Ben O.', 'Cara L.'], 5), 'Amira K., Ben O., Cara L. and 2 more')
assert.equal(namesLine([], 3), '3 students')

assert.equal(
  setMetaLine({ id: 's', title: 'x', due_at: '2026-09-25T16:00:00Z', handed_in: 18, expected: 24, late: 3, mean_pct: 63.6 }),
  'Due Fri 25 Sep · 18 of 24 in · 3 late · mean 64%'
)
assert.equal(
  setMetaLine({ id: 's', title: 'x', due_at: null, handed_in: 0, expected: 0, late: 0, mean_pct: null }),
  'No deadline · nobody owes work'
)

const cls = (over: Partial<DigestClass>): DigestClass => ({
  id: 'class-1',
  name: 'Year 13 Maths',
  subject_label: 'Mathematics · 9709',
  members: 24,
  sets: [
    { id: 'set-1', title: 'Integration drill', due_at: '2026-09-25T16:00:00Z', handed_in: 18, expected: 24, late: 3, mean_pct: 64 },
  ],
  more_sets: 0,
  handed_in: 18,
  expected: 24,
  late: 3,
  mean_pct: 64,
  headline_gap: 'Analysis — 22% of marks earned',
  unreviewed: 5,
  new_hand_ins: 12,
  silent: ['Amira K.', 'Ben O.'],
  silent_count: 4,
  ...over,
})

const digest: TeacherDigest = {
  week_key: '2026-W39',
  week_label: '21–27 Sep 2026',
  classes: [cls({}), cls({ id: 'class-2', name: '<b>Year 12</b> & co', unreviewed: 0, silent: [], silent_count: 0, headline_gap: null, more_sets: 3 })],
  totals: { unreviewed: 5, late: 6, silent: 4, handed_in: 36, expected: 48 },
}

assert.equal(digestSubject(digest), 'Your classes this week: 5 scripts to review, 6 late, 4 gone quiet')
assert.equal(
  digestSubject({ ...digest, totals: { unreviewed: 1, late: 0, silent: 0, handed_in: 1, expected: 1 } }),
  'Your classes this week: 1 script to review'
)
assert.equal(
  digestSubject({ ...digest, totals: { unreviewed: 0, late: 0, silent: 0, handed_in: 3, expected: 3 } }),
  'Your classes this week (21–27 Sep 2026)'
)

const email = buildTeacherDigestEmail({
  recipientName: 'Sarah Kowalski',
  digest,
  unsubscribeHref: 'https://markscheme.app/community/unsubscribe?token=digest',
})

assert.match(email.text, /^Hi Sarah,/)
assert.match(email.text, /Here is how your 2 classes went this week \(21–27 Sep 2026\)/)
assert.match(email.html, /Teacher digest · 21–27 Sep 2026/)
// Per class: handed in / late / mean, the gap, then one line per thing to do.
assert.match(email.html, /18\/24/)
assert.match(email.html, /class mean/)
assert.match(email.html, /Where marks went/)
assert.match(email.html, /Analysis — 22% of marks earned/)
assert.match(email.html, /5 scripts waiting for review/)
assert.match(email.html, /Gone quiet: Amira K\., Ben O\. and 2 more/)
assert.match(email.html, /\+3 more sets this week on your desk/)
// Every line links to the page that deals with it.
for (const href of [teacherSetUrl('class-1', 'set-1'), teacherReviewsUrl('class-1'), teacherStudentsUrl('class-1')]) {
  assert.ok(email.html.includes(href.replace(/&/g, '&amp;')) || email.html.includes(href), `links to ${href}`)
  assert.ok(email.text.includes(href), `text links to ${href}`)
}
assert.match(email.html, /\/teacher\/dashboard/, 'CTA opens the desk')
// The teacher's class name is escaped; student names are already display names.
assert.doesNotMatch(email.html, /<b>Year 12<\/b>/)
assert.match(email.html, /&lt;b&gt;Year 12&lt;\/b&gt; &amp; co/)
assert.doesNotMatch(email.html + email.text, /Kowalski/)
// The opt-out is the digest's own kind.
assert.ok(email.html.includes('https://markscheme.app/community/unsubscribe?token=digest'))
assert.match(email.html, /Stop the Sunday class digest/)
assert.match(email.text, /Stop the Sunday class digest: https:/)

console.log('teacher-digest.test.ts — all assertions passed')
