# Lesson recall — spaced review without marking

Status: implemented (migration applied)
Related: `docs/quick-check-self-explanation.md`, `lib/courses/review-queue.ts`

## The problem

`buildReviewQueue()` was built entirely from the `attempts` table and returned
`[]` when a student had none:

```ts
const attempts = (data ?? []) as unknown as AttemptWithPaper[]
if (!attempts.length) return []          // <- removed
```

Only a minority of users ever mark anything, so the whole spaced-review
system — the retention mechanism — was invisible to most of the user base. They
read lessons, nothing was tracked, and there was no reason to come back.

Both surfaces short-circuited even earlier, so fixing the queue alone would not
have reached anyone:

- `app/dashboard/page.tsx` — `const reviewItems = isEmpty ? [] : await buildReviewQueue(...)`
- `app/dashboard/review/page.tsx` — `coldStart = readiness.length === 0` showed
  the start-here funnel instead of items

Both now account for recall.

## The signal

Completing a lesson's quick check is the strongest non-marking evidence that
real work happened: the student **produced** answers rather than reading them.
That is what `lesson_recall` records.

## Scheduling

`lib/courses/recall-schedule.ts` — pure, so the rules are testable without a
database (the queue itself needs an authenticated user with attempt history).

Intervals expand: **3 → 7 → 16 → 35 → 60** days. Re-answering a lesson you
already recalled is evidence it is sticking, so it should return less often. A
**partial** pass does not earn the expansion — it repeats the current interval.

Two suppressions, both deliberate:

- **Not yet due.** Recall works because of the delay; showing a lesson the day
  after you did it is just re-reading.
- **Already marked on that topic.** A marked attempt is strictly stronger than a
  self-assessed quick check and the attempt-driven queue already covers it.
  Surfacing both would list the same topic twice, once with a real score and
  once without.

Scheduling lives in its own table rather than `review_schedule`. That table is
keyed `(user_id, subject_code, topic_code)` and driven by mastery from marked
attempts; folding a second, differently-paced signal into the same row would
have the two sources overwrite each other's intervals.

## `source` on ReviewItem

`ReviewItem` gained `source: 'attempts' | 'recall'`. A recall item has never
been marked, so `percentage` and `attemptsCount` are zero and **the UI must not
print them** — "0% over 0 attempts" would be a fabricated result. The review
page renders "You answered this lesson's quick check 5d ago · not yet marked"
instead, with a neutral "Recall" badge rather than a severity colour.

Recall items are appended after attempt-driven ones: a real marked score always
outranks a self-assessed one.

## Trust boundary

`/api/courses/recall` takes only enough from the client to identify the lesson.
The topic code is read from the lesson on disk, and `answered` is clamped to the
lesson's real question count, so a crafted request cannot inflate an interval.

Guests are a **successful no-op**, not an error — quick check works signed-out
(drafts in localStorage) and should not stop working or nag for an account.

The table is server-only: RLS on with zero policies, and `select, insert,
update, delete, truncate` revoked from `anon`/`authenticated`. TRUNCATE is
included because RLS does not constrain it.

Same two-route subject-code resolution as `/api/courses/explain` — the client
sends `biology-hl` from the canonical route, content lives under
`ib-biology-hl`.

## Verified

- **Guest POST** → `{recorded: false, reason: "guest"}`, zero rows written.
- **Client fires once.** On a real lesson, 0 calls through the first four
  questions, exactly 1 on completing the fifth, payload
  `{subjectCode:"biology-hl", lessonSlug:"a1-1-water", answered:5, total:5}`,
  and **no re-fire** when a previously-answered box is edited afterwards.
- **The queue actually changes.** Against a real user with no marked attempts:
  queue `0 items` → seed one due recall row → `1 item`
  (`source=recall`, `code=A1.1`, `name="Water"`, `days=5`,
  `lessonHref=/ib/courses/biology-hl/a1-1-water#worked`) → set it not-yet-due →
  back to `0 items`. Test row deleted.

**Not verified:** the signed-in dashboard and review-page render of a recall
item. Both require an authenticated session, which cannot be driven here. The
data path is proven end to end; the pixels are not.
