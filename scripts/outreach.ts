/**
 * Teacher outreach tracker.
 *
 *   pnpm outreach import targets.csv    # school,country,board,subject,contact_name,contact_email,contact_role,website
 *   pnpm outreach links [board]         # per-school links to paste into the emails
 *   pnpm outreach sent <slug>           # mark as sent (sets sent_at)
 *   pnpm outreach status <slug> <state> # replied | signed_up | linked | declined | bounced
 *   pnpm outreach funnel                # where the campaign actually is
 *   pnpm outreach followups             # sent 7+ days ago, still silent
 *
 * The list itself is not generated here. School contact details have to come
 * from the public directories (the IB World School directory and the Cambridge
 * school finder) — inventing plausible-looking addresses for real schools would
 * produce a campaign that bounces and a sender reputation that never recovers.
 */
process.loadEnvFile?.('.env.local')

// Marks the file as a module — see the note in attribution-report.ts.
export {}

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://markscheme.app'

/** Minimal RFC4180-ish reader: handles quoted fields and embedded commas. */
function parseCsv(text: string): Record<string, string>[] {
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let quoted = false

  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (quoted) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"'
          i++
        } else quoted = false
      } else field += ch
    } else if (ch === '"') {
      quoted = true
    } else if (ch === ',') {
      row.push(field)
      field = ''
    } else if (ch === '\n' || ch === '\r') {
      if (field || row.length) {
        row.push(field)
        rows.push(row)
        row = []
        field = ''
      }
      if (ch === '\r' && text[i + 1] === '\n') i++
    } else field += ch
  }
  if (field || row.length) {
    row.push(field)
    rows.push(row)
  }

  if (!rows.length) return []
  const header = rows[0].map((h) => h.trim().toLowerCase())
  return rows.slice(1).map((r) =>
    Object.fromEntries(header.map((h, i) => [h, (r[i] ?? '').trim()]))
  )
}

async function main() {
  const { createServiceClient } = await import('../lib/supabase/service')
  const { buildFunnel, outreachLink, schoolSlug, websiteHost, OUTREACH_STATUSES } =
    await import('../lib/outreach/targets')
  const service = createServiceClient()
  const [command, ...args] = process.argv.slice(2)

  if (command === 'import') {
    const { readFile } = await import('node:fs/promises')
    const path = args[0]
    if (!path) throw new Error('Usage: pnpm outreach import <file.csv>')

    const rows = parseCsv(await readFile(path, 'utf8'))

    // Reported, not filtered away in silence: a sheet that half-imports while
    // printing a confident count is how a campaign ends up with gaps nobody
    // knows about.
    const unnamed = rows.length - rows.filter((r) => r.school).length
    if (unnamed) {
      console.warn(`${unnamed} row(s) skipped: no school name.`)
    }

    const targets = rows
      .filter((r) => r.school)
      .map((r) => ({
        school: r.school,
        slug: schoolSlug(r.school + (r.subject ? ` ${r.subject}` : '')),
        country: r.country || null,
        board: r.board || null,
        subject: r.subject || null,
        contact_name: r.contact_name || null,
        contact_email: r.contact_email || null,
        contact_role: r.contact_role || null,
        website: r.website || null,
      }))
      .filter((t) => t.slug)

    if (!targets.length) {
      console.log('Nothing to import — is the header row present?')
      return
    }

    // A slug collides when two rows name the same school and subject, or when a
    // long name truncates to the same 48 characters. `ignoreDuplicates` keeps
    // the existing row — correct, since re-importing a corrected sheet must not
    // reset the status of a school already written to — but a collision inside
    // one file means a school is being dropped, so it is called out.
    const seen = new Map<string, string>()
    for (const t of targets) {
      const prior = seen.get(t.slug)
      // Any repeat means a row is discarded, including two rows for the same
      // school and subject with different contacts — which is the common case
      // when a sheet lists a department head and a second teacher.
      if (prior !== undefined) {
        console.warn(
          `Duplicate slug ${t.slug}: "${t.school}" <${t.contact_email ?? 'no email'}> ` +
            `collides with "${prior}" — only the first is imported. ` +
            `Give them different subjects, or merge the rows.`
        )
        continue
      }
      seen.set(t.slug, `${t.school} <${t.contact_email ?? 'no email'}>`)
    }

    // A bounced cold email costs more than a missing one: it damages the sending
    // domain, and there is no time to recover one before the September window.
    const badEmail = targets.filter(
      (t) => !t.contact_email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(t.contact_email)
    )
    if (badEmail.length) {
      console.warn(
        `\n${badEmail.length} target(s) have a missing or malformed email and cannot be written to:`
      )
      for (const t of badEmail.slice(0, 20)) {
        console.warn(`  ${t.school} — ${t.contact_email ?? '(none)'}`)
      }
      if (badEmail.length > 20) console.warn(`  …and ${badEmail.length - 20} more`)
      console.warn('They are still imported, so the addresses can be filled in later.\n')
    }

    const { error } = await service
      .from('outreach_targets')
      .upsert(targets, { onConflict: 'slug', ignoreDuplicates: true })
    if (error) throw new Error(error.message)

    // Teach the channel classifier which vanity domains are schools. Detection
    // is education-TLD only, so a school on a .org.uk would otherwise have its
    // referrals filed as ordinary traffic and never reach the outreach KPI.
    const hosts = [
      ...new Set(
        targets.map((t) => websiteHost(t.website)).filter((h): h is string => Boolean(h))
      ),
    ]
    if (hosts.length) {
      const { error: hostError } = await service
        .from('school_hosts')
        .upsert(
          hosts.map((host) => ({ host, note: 'outreach import' })),
          { onConflict: 'host', ignoreDuplicates: true }
        )
      if (hostError) throw new Error(hostError.message)

      // Past visits were classified with the old rules, so recompute them
      // rather than leaving a school's earlier clicks filed as 'referral'.
      const { data: fixed, error: reclassError } = await service.rpc(
        'reclassify_visit_sessions'
      )
      if (reclassError) throw new Error(reclassError.message)
      console.log(
        `Allowlisted ${hosts.length} school domain(s); reclassified ${fixed ?? 0} past session(s).`
      )
    }

    // What is actually in the table now, rather than what was sent to it.
    const { count } = await service
      .from('outreach_targets')
      .select('*', { count: 'exact', head: true })
    console.log(
      `Imported ${targets.length} row(s) from the file; ${count ?? '?'} target(s) now tracked.`
    )
    return
  }

  if (command === 'links') {
    let q = service
      .from('outreach_targets')
      .select('school, slug, board, subject, contact_name, contact_email, status')
      .order('school')
    if (args[0]) q = q.eq('board', args[0])

    const { data, error } = await q
    if (error) throw new Error(error.message)
    const rows = data ?? []
    if (!rows.length) {
      console.log('No targets. Import a CSV first.')
      return
    }
    for (const t of rows) {
      console.log(
        `\n${t.school}${t.subject ? ` — ${t.subject}` : ''} [${t.status}]\n` +
          `  ${t.contact_name ?? '(no name)'} <${t.contact_email ?? 'no email'}>\n` +
          `  ${outreachLink(BASE_URL, t.slug as string)}`
      )
    }
    return
  }

  if (command === 'sent' || command === 'status') {
    const slug = args[0]
    if (!slug) throw new Error(`Usage: pnpm outreach ${command} <slug> ...`)

    const state = command === 'sent' ? 'sent' : args[1]
    if (!state || !(OUTREACH_STATUSES as readonly string[]).includes(state)) {
      throw new Error(`Status must be one of: ${OUTREACH_STATUSES.join(', ')}`)
    }

    const now = new Date().toISOString()
    const patch: Record<string, string> = { status: state }
    if (state === 'sent') patch.sent_at = now
    if (state === 'replied') patch.replied_at = now
    if (state === 'linked') {
      patch.linked_at = now
      if (args[2]) patch.linked_url = args[2]
    }

    const { data, error } = await service
      .from('outreach_targets')
      .update(patch)
      .eq('slug', slug)
      .select('school')
    if (error) throw new Error(error.message)
    if (!data?.length) {
      console.error(`No target with slug "${slug}".`)
      process.exit(1)
    }
    console.log(`${data[0].school} → ${state}`)
    return
  }

  if (command === 'funnel' || command === 'followups') {
    const { data, error } = await service
      .from('outreach_targets')
      .select('school, slug, status, sent_at, replied_at, linked_at, contact_email')
    if (error) throw new Error(error.message)

    const funnel = buildFunnel(
      (data ?? []) as Parameters<typeof buildFunnel>[0]
    )

    if (command === 'followups') {
      if (!funnel.needsFollowUp.length) {
        console.log('Nothing is overdue a follow-up.')
        return
      }
      console.log(`${funnel.needsFollowUp.length} school(s) sent 7+ days ago, still silent:\n`)
      for (const t of funnel.needsFollowUp) {
        console.log(`  ${t.school.padEnd(40)} ${t.contact_email ?? ''}  (${t.slug})`)
      }
      return
    }

    console.log(`Outreach funnel — ${funnel.total} target(s)\n`)
    for (const [status, count] of Object.entries(funnel.byStatus)) {
      if (count) console.log(`  ${status.padEnd(12)} ${count}`)
    }
    console.log(
      `\nContacted ${funnel.contacted} · reply rate ${(funnel.replyRate * 100).toFixed(0)}%` +
        ` · ${funnel.linked} school site(s) linking here`
    )
    if (funnel.needsFollowUp.length) {
      console.log(`${funnel.needsFollowUp.length} overdue a follow-up (pnpm outreach followups)`)
    }

    // Cross-check against real traffic: the outreach table records what was
    // sent, visit_sessions records what actually arrived.
    const { data: sessions } = await service
      .from('visit_sessions')
      .select('utm_source, user_id')
      .like('utm_source', 'school-%')

    const arrived = new Map<string, { sessions: number; users: number }>()
    for (const s of sessions ?? []) {
      const key = (s.utm_source as string) ?? ''
      const row = arrived.get(key) ?? { sessions: 0, users: 0 }
      row.sessions += 1
      if (s.user_id) row.users += 1
      arrived.set(key, row)
    }

    console.log('')
    if (!arrived.size) {
      console.log('No clicks from outreach links yet.')
    } else {
      console.log('CLICKS FROM OUTREACH LINKS')
      for (const [source, row] of [...arrived.entries()].sort(
        (a, b) => b[1].sessions - a[1].sessions
      )) {
        console.log(
          `  ${source.padEnd(44)} ${String(row.sessions).padStart(4)} sessions, ${row.users} signed in`
        )
      }
    }
    return
  }

  console.error(
    'Commands: import <csv> | links [board] | sent <slug> | status <slug> <state> [url] | funnel | followups'
  )
  process.exit(1)
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err)
  process.exit(1)
})
