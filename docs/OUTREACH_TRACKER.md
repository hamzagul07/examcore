# Outreach tracker — moved into the database

This file used to be a markdown table of backlink targets. It sat at 0/10 for a
month, which is the predictable failure of tracking a campaign in a file: it
cannot tell you which schools replied, which produced signups, which are overdue
a follow-up, or whether any of it moved traffic. So it stopped being updated, and
an un-updated tracker is worse than none — it looks like a record.

The list now lives in the `outreach_targets` table and is driven from the CLI.

```bash
pnpm outreach import targets.csv    # school,country,board,subject,contact_name,contact_email,contact_role,website
pnpm outreach links [board]         # per-school links to paste into the emails
pnpm outreach sent <slug>           # mark as sent
pnpm outreach status <slug> linked https://school.example/revision
pnpm outreach funnel                # statuses, reply rate, and real clicks per school
pnpm outreach followups             # sent 7+ days ago, still silent
```

## Why it is wired this way

- Every target gets `utm_source=school-<slug>`. `classify_channel()` routes
  anything matching `school-%` to the **school** channel, so a click on an
  outreach link is attributed to the school it came from with no further work.
  `pnpm outreach funnel` prints those clicks next to the statuses, so the table
  can be checked against reality rather than trusted.
- `import` also records each school's website in `school_hosts`. School
  detection is education-TLD only (`.sch.uk`, `.ac.uk`, `.edu`, …) because
  matching on the words *school*/*college*/*academy* classified khanacademy.org
  and a news site as schools and inflated the number the campaign is judged on.
  The allowlist is how a school on a vanity domain (`harrowschool.org.uk`) still
  counts. Past visits are recomputed on import.
- The link a school puts on its **own** resources page carries no UTM at all —
  see the copy-paste kit on `/for-teachers`. A tagged link is a campaign; a clean
  canonical link is a citation and passes its full weight to the domain, which is
  the entire reason for asking. Those arrive with a school referrer and are
  attributed by host instead.

## Sourcing the list

`outreach` deliberately does not generate targets. School contact details come
from the public directories — the IB World School directory and the Cambridge
school finder. Do not invent addresses that look plausible: they bounce, and a
burned sending domain is not recoverable inside the September window.

The relevant statuses are `linked` (their site now links here — the outcome the
whole campaign exists to produce) and `signed_up`. Reply rate is a leading
indicator; neither of those two is.

## Still current

- [OUTREACH_DM_EMAILS.md](./OUTREACH_DM_EMAILS.md) — the message templates
- [OUTREACH_LISTICLE.md](./OUTREACH_LISTICLE.md) — blurbs for directories
- [DIRECTORY_SUBMISSIONS.md](./DIRECTORY_SUBMISSIONS.md) — directory forms.
  Worth knowing these are mostly nofollow and pass no authority; they are a
  discovery play, not a backlink one.
