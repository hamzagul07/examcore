import type { SupabaseClient } from '@supabase/supabase-js'
import { CONTACT_EMAIL, SITE_NAME, SITE_URL } from '@/lib/site-config'
import { adminNotifyAddress, sendEmail, sendEmailAsync } from '@/lib/email/send'

// ---------------------------------------------------------------------------
// Admin alerts (to you)
// ---------------------------------------------------------------------------

export function notifyAdminContactMessage(payload: {
  name: string
  email: string
  message: string
  userId?: string | null
}): void {
  sendEmailAsync({
    to: adminNotifyAddress(),
    replyTo: payload.email,
    subject: `[${SITE_NAME}] Contact from ${payload.name}`,
    text: [
      'New contact form message',
      '',
      `Name: ${payload.name}`,
      `Email: ${payload.email}`,
      payload.userId ? `User ID: ${payload.userId}` : 'Guest (not signed in)',
      '',
      payload.message,
      '',
      '— Stored in Supabase contact_messages',
    ].join('\n'),
  })
}

export function notifyAdminNewAccount(payload: {
  email: string
  userId: string
  provider?: string | null
}): void {
  sendEmailAsync({
    to: adminNotifyAddress(),
    subject: `[${SITE_NAME}] New account`,
    text: [
      'A new user signed up.',
      '',
      `Email: ${payload.email}`,
      `User ID: ${payload.userId}`,
      payload.provider ? `Provider: ${payload.provider}` : 'Provider: email/password or magic link',
      '',
      `Dashboard: ${SITE_URL}/admin/ingest`,
    ].join('\n'),
  })
}

export function notifyAdminPurchase(payload: {
  email: string
  userId: string
  kind: 'credits' | 'subscription'
  detail: string
  stripeSessionId?: string | null
}): void {
  sendEmailAsync({
    to: adminNotifyAddress(),
    subject: `[${SITE_NAME}] ${payload.kind === 'credits' ? 'Credit purchase' : 'New plan'}`,
    text: [
      payload.kind === 'credits' ? 'Credit pack purchased' : 'Subscription started/updated',
      '',
      `Email: ${payload.email}`,
      `User ID: ${payload.userId}`,
      `Detail: ${payload.detail}`,
      payload.stripeSessionId ? `Stripe session: ${payload.stripeSessionId}` : '',
      '',
    ]
      .filter(Boolean)
      .join('\n'),
  })
}

export function notifyAdminWaitlistSignup(payload: {
  email: string
  whatsapp: string
  subjectInterest: string
}): void {
  sendEmailAsync({
    to: adminNotifyAddress(),
    replyTo: payload.email,
    subject: `[${SITE_NAME}] Waitlist signup`,
    text: [
      'New marketing waitlist entry (signups table).',
      '',
      `Email: ${payload.email}`,
      `WhatsApp: ${payload.whatsapp}`,
      `Subject interest: ${payload.subjectInterest}`,
    ].join('\n'),
  })
}

// ---------------------------------------------------------------------------
// User transactional (to the student)
// ---------------------------------------------------------------------------

export function sendWelcomeEmail(payload: {
  email: string
  name?: string | null
}): void {
  const greeting = payload.name?.trim() ? `Hi ${payload.name.trim()},` : 'Hi,'
  sendEmailAsync({
    to: payload.email,
    subject: `Welcome to ${SITE_NAME}`,
    text: [
      greeting,
      '',
      `Thanks for creating your ${SITE_NAME} account.`,
      '',
      'You can upload handwritten Cambridge past-paper answers and get mark-by-mark feedback tied to real mark schemes.',
      '',
      `Mark your first question: ${SITE_URL}/mark`,
      `Set up your subjects: ${SITE_URL}/onboarding`,
      '',
      `Questions? Reply to this email or write to ${CONTACT_EMAIL}.`,
      '',
      `— ${SITE_NAME}`,
    ].join('\n'),
  })
}

export function sendPurchaseConfirmationEmail(payload: {
  email: string
  kind: 'credits' | 'subscription'
  detail: string
}): void {
  const subject =
    payload.kind === 'credits'
      ? `Your ${SITE_NAME} credits are ready`
      : `Your ${SITE_NAME} plan is active`

  sendEmailAsync({
    to: payload.email,
    subject,
    text: [
      'Hi,',
      '',
      payload.kind === 'credits'
        ? `Thanks for your purchase. ${payload.detail}`
        : `Thanks for subscribing. ${payload.detail}`,
      '',
      `Start marking: ${SITE_URL}/mark`,
      `Billing: ${SITE_URL}/account/billing`,
      '',
      `Need help? ${CONTACT_EMAIL}`,
      '',
      `— ${SITE_NAME}`,
    ].join('\n'),
  })
}

// ---------------------------------------------------------------------------
// Marketing (opt-in only)
// ---------------------------------------------------------------------------

export async function sendProductUpdateEmail(
  supabase: SupabaseClient,
  userId: string,
  payload: { subject: string; body: string }
): Promise<boolean> {
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('email_product_updates, full_name')
    .eq('id', userId)
    .maybeSingle()

  if (!profile?.email_product_updates) return false

  const { data: authData } = await supabase.auth.admin.getUserById(userId)
  const email = authData?.user?.email
  if (!email) return false

  const greeting = profile.full_name?.trim()
    ? `Hi ${profile.full_name.trim()},`
    : 'Hi,'

  return sendEmail({
    to: email,
    subject: payload.subject,
    text: [
      greeting,
      '',
      payload.body,
      '',
      `Manage email preferences: ${SITE_URL}/account/preferences`,
      '',
      `— ${SITE_NAME}`,
    ].join('\n'),
  })
}

// ---------------------------------------------------------------------------
// Hooks (call from routes / webhooks)
// ---------------------------------------------------------------------------

const NEW_ACCOUNT_WINDOW_MS = 10 * 60 * 1000

export function isRecentlyCreatedAccount(createdAt: string | undefined): boolean {
  if (!createdAt) return false
  const t = new Date(createdAt).getTime()
  if (Number.isNaN(t)) return false
  return Date.now() - t < NEW_ACCOUNT_WINDOW_MS
}

export async function handlePostAuthEmails(
  supabase: SupabaseClient,
  user: { id: string; email?: string | null; created_at?: string; app_metadata?: Record<string, unknown> }
): Promise<void> {
  if (!user.email || !isRecentlyCreatedAccount(user.created_at)) return

  const provider =
    typeof user.app_metadata?.provider === 'string' ? user.app_metadata.provider : null

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('full_name')
    .eq('id', user.id)
    .maybeSingle()

  sendWelcomeEmail({ email: user.email, name: profile?.full_name })
  notifyAdminNewAccount({
    email: user.email,
    userId: user.id,
    provider,
  })
}

export async function notifyPurchaseEmails(
  supabase: SupabaseClient,
  userId: string,
  payload: {
    kind: 'credits' | 'subscription'
    detail: string
    stripeSessionId?: string | null
  }
): Promise<void> {
  const { data: authData } = await supabase.auth.admin.getUserById(userId)
  const email = authData?.user?.email
  if (!email) return

  sendPurchaseConfirmationEmail({
    email,
    kind: payload.kind,
    detail: payload.detail,
  })
  notifyAdminPurchase({
    email,
    userId,
    kind: payload.kind,
    detail: payload.detail,
    stripeSessionId: payload.stripeSessionId,
  })
}
