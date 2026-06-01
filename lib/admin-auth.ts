/** Server-side admin gate for /admin routes and ingest tools. */

const FALLBACK_ADMIN_EMAIL = 'hg9256970@gmail.com'

export function getAdminEmails(): string[] {
  const raw = process.env.ADMIN_EMAILS ?? FALLBACK_ADMIN_EMAIL
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
