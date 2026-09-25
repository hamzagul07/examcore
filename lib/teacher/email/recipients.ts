import 'server-only'

import type { SupabaseClient } from '@supabase/supabase-js'
import { runAfterResponse } from '@/lib/after-response'
import { sendEmail, type SendEmailParams } from '@/lib/email/send'
import { chunk, fetchAllFiltered } from '@/lib/teacher-classroom-data'

/**
 * Who a teacher-system email may go to, and how a batch of them is sent
 * (docs/TEACHER_SYSTEM_SPEC.md §5). Shared by lib/teacher/notify.ts, the
 * reminders and the digest so the three cannot disagree about consent.
 *
 * An address is mailed only when all of these hold:
 *
 *   - the account's own preference column is not false — `email_assignments`
 *     for students, `email_teacher_digest` for the digest (both default on;
 *     a missing row or column reads as "no" rather than "yes", see below);
 *   - the account has an address and it is confirmed (an unconfirmed address
 *     bounces, and bounces are what cost a sending domain its reputation);
 *   - the address is not in `email_suppressions` (hard bounce or spam
 *     complaint, recorded by the Resend webhook, stored lower-cased).
 *
 * Every read here fails CLOSED: if the preferences or the suppression list
 * cannot be read, nobody is emailed and the failure is logged. Sending mail
 * someone opted out of, or to an address that complained, is the one mistake
 * an email path cannot take back; a missed notification is not.
 */

export type EmailPreference = 'email_assignments' | 'email_teacher_digest'

export type EmailRecipient = {
  userId: string
  email: string
  /** Raw `full_name` — pass through displayName() before it reaches an email. */
  fullName: string | null
}

export type RecipientProfile = { full_name: string | null; opted_in: boolean | null | undefined }
export type RecipientAccount = { email: string | null; confirmed: boolean }

/**
 * Pure: which of `userIds` may be emailed, in the order given, each once.
 * `profiles` must hold a row for every candidate — no row, no email.
 */
export function selectRecipients(input: {
  userIds: readonly string[]
  profiles: ReadonlyMap<string, RecipientProfile>
  accounts: ReadonlyMap<string, RecipientAccount>
  suppressed: ReadonlySet<string>
}): EmailRecipient[] {
  const seen = new Set<string>()
  const out: EmailRecipient[] = []
  for (const userId of input.userIds) {
    if (seen.has(userId)) continue
    seen.add(userId)
    const profile = input.profiles.get(userId)
    if (!profile || profile.opted_in === false) continue
    const account = input.accounts.get(userId)
    const email = account?.email?.trim()
    if (!email || !account?.confirmed) continue
    if (input.suppressed.has(email.toLowerCase())) continue
    out.push({ userId, email, fullName: profile.full_name })
  }
  return out
}

const ACCOUNT_LOOKUP_CONCURRENCY = 8

/** Map `items` through `fn` with at most `limit` in flight. Order is preserved. */
export async function mapLimited<T, R>(
  items: readonly T[],
  limit: number,
  fn: (item: T) => Promise<R>
): Promise<R[]> {
  const out = new Array<R>(items.length)
  let next = 0
  const worker = async () => {
    while (next < items.length) {
      const i = next++
      out[i] = await fn(items[i])
    }
  }
  const lanes = Math.max(1, Math.min(limit, items.length))
  await Promise.all(Array.from({ length: lanes }, worker))
  return out
}

/**
 * Full names of the given accounts, read with the service client.
 *
 * Callers are server-side jobs acting for a teacher who is not signed in (a
 * cron, a notification after a student's mark), so the teacher-scoped
 * `teacher_roster_profiles` RPC — which keys on auth.uid() — cannot answer.
 * The ids passed are always members of the teacher's own classes (or the
 * teacher), only `full_name` is read, and it only ever leaves through
 * displayName().
 */
export async function loadProfileNames(
  admin: SupabaseClient,
  userIds: readonly string[]
): Promise<Map<string, string | null>> {
  const out = new Map<string, string | null>()
  const ids = [...new Set(userIds.filter(Boolean))]
  for (const part of chunk(ids)) {
    const { rows } = await fetchAllFiltered<{ id: string; full_name: string | null }>(
      'user_profiles',
      (from, to) =>
        admin.from('user_profiles').select('id, full_name').in('id', part).order('id').range(from, to)
    )
    for (const r of rows) out.set(r.id, r.full_name ?? null)
  }
  return out
}

async function loadPreferences(
  admin: SupabaseClient,
  userIds: readonly string[],
  preference: EmailPreference
): Promise<Map<string, RecipientProfile>> {
  const out = new Map<string, RecipientProfile>()
  for (const part of chunk(userIds)) {
    const { rows } = await fetchAllFiltered<Record<string, unknown> & { id: string }>(
      'user_profiles',
      (from, to) =>
        admin
          .from('user_profiles')
          .select(`id, full_name, ${preference}`)
          .in('id', part)
          .order('id')
          .range(from, to)
    )
    for (const r of rows) {
      out.set(r.id, {
        full_name: (r.full_name as string | null | undefined) ?? null,
        opted_in: r[preference] as boolean | null | undefined,
      })
    }
  }
  return out
}

async function loadSuppressed(admin: SupabaseClient, emails: readonly string[]): Promise<Set<string>> {
  const out = new Set<string>()
  const lowered = [...new Set(emails.map((e) => e.trim().toLowerCase()).filter(Boolean))]
  for (const part of chunk(lowered)) {
    const { data, error } = await admin.from('email_suppressions').select('email').in('email', part)
    if (error) throw new Error(`email_suppressions: ${error.message}`)
    for (const r of data ?? []) out.add(String((r as { email: string }).email).toLowerCase())
  }
  return out
}

/**
 * The subset of `userIds` that may be emailed under `preference`, with their
 * addresses. Empty (and logged) when any consent read fails.
 */
export async function loadEmailRecipients(
  admin: SupabaseClient,
  userIds: readonly string[],
  preference: EmailPreference
): Promise<EmailRecipient[]> {
  const ids = [...new Set(userIds.filter(Boolean))]
  if (ids.length === 0) return []
  try {
    const profiles = await loadPreferences(admin, ids, preference)
    const candidates = ids.filter((id) => profiles.get(id)?.opted_in !== false && profiles.has(id))
    if (candidates.length === 0) return []

    const accounts = new Map<string, RecipientAccount>()
    await mapLimited(candidates, ACCOUNT_LOOKUP_CONCURRENCY, async (id) => {
      const { data, error } = await admin.auth.admin.getUserById(id)
      if (error || !data?.user) return
      accounts.set(id, {
        email: data.user.email ?? null,
        confirmed: Boolean(data.user.email_confirmed_at),
      })
    })

    const suppressed = await loadSuppressed(
      admin,
      [...accounts.values()].map((a) => a.email ?? '').filter(Boolean)
    )
    return selectRecipients({ userIds: candidates, profiles, accounts, suppressed })
  } catch (err) {
    console.error('[teacher/email] recipients unreadable — sending nothing:', {
      preference,
      error: err instanceof Error ? err.message : String(err),
    })
    return []
  }
}

/** Emails per deferred batch (spec §5: "chunked 50 per after()"). */
export const EMAIL_CHUNK_SIZE = 50

/**
 * Send prepared emails after the response, EMAIL_CHUNK_SIZE per `after()`.
 *
 * Each batch registers synchronously (runAfterResponse), so it is held open
 * even when the caller is itself running inside `after()`; within a batch the
 * sends go one at a time, which keeps a class-wide publish inside the mail
 * provider's rate limit instead of firing hundreds of requests at once.
 * Outside a request (tests, scripts) the batches run inline.
 */
export function deferEmails(label: string, emails: readonly SendEmailParams[]): void {
  for (const batch of chunk(emails, EMAIL_CHUNK_SIZE)) {
    runAfterResponse(label, async () => {
      for (const email of batch) await sendEmail(email)
    })
  }
}

/** Send prepared emails now, one at a time; resolves to how many were accepted. */
export async function sendEmailsNow(emails: readonly SendEmailParams[]): Promise<number> {
  let sent = 0
  for (const email of emails) {
    if (await sendEmail(email)) sent += 1
  }
  return sent
}
