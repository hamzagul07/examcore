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

```bash
pnpm outreach gias edubasealldata.csv --subject Chemistry --limit 200 --out targets.csv
```

**Source: Get Information About Schools (GIAS)** — the DfE register of
educational establishments, published daily under the Open Government Licence,
i.e. explicitly for reuse with attribution. Download the "Establishment fields"
CSV by hand from
<https://get-information-schools.service.gov.uk/Downloads>.

`gias` keeps schools that are open and teach to 18, reports every row it dropped
and why, and ranks the survivors by how researchable they are — a school with a
website can have its department contact found in minutes; one without cannot be
researched at all. It writes the same CSV that `import` reads.

### Why not the IB directory

The IB World Schools directory is **not** a usable source, and this is a
decision rather than an oversight:

- `ibo.org` returns HTTP 403 to automated requests, including for `robots.txt`.
  Blocking the robots file is an unambiguous refusal of automated access.
- IB's Rules for use of IB intellectual property state that any use not
  expressly permitted "is prohibited unless special permission is obtained in
  writing from the IB", and prohibit reproducing IB material for commercial
  activity.

If IB coverage matters, the routes are to ask the IB in writing, or to check
membership school-by-school by hand while researching contacts. Do not scrape it.

### Finding the contact

```bash
pnpm outreach research --limit 50 --out research.csv
```

For each target that has a website but no email, this finds the page listing
staff or the subject department, and writes a worksheet of links to open. It
reads each site's `robots.txt` first and obeys it, spaces requests out (honouring
`Crawl-delay`), identifies itself, and **skips any site whose robots.txt it
cannot fetch** — treating an unreadable robots as permission is how a polite
crawler becomes a rude one.

It reads the school's own navigation rather than guessing URLs: one request that
finds the page they actually built beats six guesses at pages we imagined, and
it is six fewer requests on a small school server. Path guessing is the fallback
when the navigation gives nothing.

**It does not read email addresses off any page.** That is deliberate. Harvesting
addresses at scale is what data-protection regulators object to most and what
list vendors do, and a list built that way is worth less than one where somebody
read the page — because reading the page is how you learn the name to open the
email with.

### Emails are never generated

GIAS has no email column and nothing invents one. `contact_email` comes out
blank on purpose. Fill it from each school's own staff page — which is also
where the subject department head is actually named, and a named head of
chemistry converts far better than a generic inbox.

A guessed address (`head@school.sch.uk`) bounces. Bounces are what destroy a
sending domain, and there is no time to recover one inside the September window.
`import` refuses to stay quiet about missing or malformed addresses for exactly
this reason.

### Before sending

Cold B2B email to UK schools is lawful, but it is not unconditional. Under PECR
schools are corporate subscribers, so unsolicited email is permitted provided
every message identifies the sender and carries a working opt-out; GDPR still
applies to a named individual's address, so a role or department address is the
safer default, and an opt-out must be honoured permanently. Warm the sending
domain before a large send — a cold domain pushing 200 messages in a day lands
in spam and teaches every future message to do the same.

The relevant statuses are `linked` (their site now links here — the outcome the
whole campaign exists to produce) and `signed_up`. Reply rate is a leading
indicator; neither of those two is.

## Still current

- [OUTREACH_DM_EMAILS.md](./OUTREACH_DM_EMAILS.md) — the message templates
- [OUTREACH_LISTICLE.md](./OUTREACH_LISTICLE.md) — blurbs for directories
- [DIRECTORY_SUBMISSIONS.md](./DIRECTORY_SUBMISSIONS.md) — directory forms.
  Worth knowing these are mostly nofollow and pass no authority; they are a
  discovery play, not a backlink one.
