/** Server-side admin gate for /admin routes and ingest tools. */

/**
 * The founder's address, for NON-production only. It used to be the
 * production fallback too, which made one personal Gmail the sole /admin and
 * privileged /api/health identity on any deploy where ADMIN_EMAILS was unset
 * — a typo in the variable name was an admin session for whoever held that
 * mailbox. Production now mirrors lib/marking/share-token.ts: no explicit
 * configuration, no admins, and the gap is reported (once here, and by
 * /api/health's `secrets.ADMIN_EMAILS`). A local or preview run keeps the
 * convenience.
 */
const DEV_FALLBACK_ADMIN_EMAIL = 'hg9256970@gmail.com'

/**
 * Report once per process, not once per request: this runs inside the proxy on
 * every /admin hit and `isAdminUser` is called from ingest tools in loops.
 */
let reportedAdminEmailsUnset = false

export function getAdminEmails(): string[] {
  const raw = process.env.ADMIN_EMAILS?.trim()

  if (!raw) {
    if (process.env.NODE_ENV === 'production') {
      if (!reportedAdminEmailsUnset) {
        reportedAdminEmailsUnset = true
        console.error(
          '[admin-auth] ADMIN_EMAILS is unset in production: nobody is an admin. ' +
            'Set it to a comma-separated list of addresses to restore /admin access.'
        )
      }
      return []
    }
    return [DEV_FALLBACK_ADMIN_EMAIL]
  }

  return raw
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean)
}

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false
  return getAdminEmails().includes(email.trim().toLowerCase())
}

export function isAdminUser(user: { email?: string | null } | null | undefined): boolean {
  return isAdminEmail(user?.email)
}
