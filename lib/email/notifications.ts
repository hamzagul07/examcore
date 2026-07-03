import type { SupabaseClient } from '@supabase/supabase-js'
import { CONTACT_EMAIL, SITE_NAME, SITE_URL } from '@/lib/site-config'
import { adminNotifyAddress, sendEmail, sendEmailAsync } from '@/lib/email/send'

// ---------------------------------------------------------------------------
// Admin alerts (to hello@markscheme.app by default)
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
    preheader: `New message from ${payload.email}`,
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

export function sendContactConfirmationEmail(payload: {
  email: string
  name: string
}): void {
  sendEmailAsync({
    to: payload.email,
    subject: `We received your message — ${SITE_NAME}`,
    preheader: 'Thanks for reaching out. We will reply from hello@markscheme.app.',
    cta: { label: 'Back to MarkScheme', href: SITE_URL },
    text: [
      `Hi ${payload.name},`,
      '',
      `Thanks for contacting ${SITE_NAME}. We received your message and will reply from ${CONTACT_EMAIL} as soon as we can.`,
      '',
      'If your question is about marking a paper, you can also jump straight in:',
      `${SITE_URL}/mark`,
      '',
      `— ${SITE_NAME}`,
    ].join('\n'),
  })
}

export function notifyAdminNewSignup(payload: {
  email: string
  userId: string
  provider?: string | null
}): void {
  sendEmailAsync({
    to: adminNotifyAddress(),
    subject: `[${SITE_NAME}] New signup started`,
    preheader: payload.email,
    text: [
      'Someone started creating an account.',
      '',
      `Email: ${payload.email}`,
      `User ID: ${payload.userId}`,
      payload.provider ? `Provider: ${payload.provider}` : 'Provider: email / magic link',
      '',
      'They still need to finish onboarding before they can mark papers.',
    ].join('\n'),
  })
}

/**
 * Admin alert whenever a signed-in user marks a question — mirrors the signup
 * alert. Best-effort and never throws (fire-and-forget from the mark path).
 */
export async function notifyAdminMark(
  supabase: SupabaseClient,
  userId: string,
  payload: {
    eventType: 'mark_single' | 'mark_whole_paper'
    viaCredit?: boolean
  }
): Promise<void> {
  try {
    const { data } = await supabase.auth.admin.getUserById(userId)
    const email = data?.user?.email ?? '(unknown email)'
    const kind =
      payload.eventType === 'mark_whole_paper' ? 'Whole paper' : 'Single question'
    sendEmailAsync({
      to: adminNotifyAddress(),
      subject: `[${SITE_NAME}] Question marked — ${email}`,
      preheader: `${kind} marked by ${email}`,
      text: [
        `${kind} marked.`,
        '',
        `Email: ${email}`,
        `User ID: ${userId}`,
        payload.viaCredit
          ? 'Charged: 1 credit'
          : 'Counted against monthly allowance',
      ].join('\n'),
    })
  } catch (err) {
    console.error('[notifications] notifyAdminMark failed:', err)
  }
}

export function notifyAdminOnboardingComplete(payload: {
  email: string
  userId: string
  name?: string | null
  level?: string | null
  subjects?: string[] | null
  primaryGoal?: string | null
  provider?: string | null
}): void {
  const subjectList =
    payload.subjects?.length ? payload.subjects.join(', ') : '(none listed)'

  sendEmailAsync({
    to: adminNotifyAddress(),
    subject: `[${SITE_NAME}] New user ready — ${payload.email}`,
    preheader: `${payload.name || payload.email} finished onboarding`,
    text: [
      'A user finished onboarding and can mark papers.',
      '',
      `Email: ${payload.email}`,
      `User ID: ${payload.userId}`,
      payload.name ? `Name: ${payload.name}` : '',
      payload.level ? `Level: ${payload.level}` : '',
      `Subjects: ${subjectList}`,
      payload.primaryGoal ? `Primary goal: ${payload.primaryGoal}` : '',
      payload.provider ? `Sign-up method: ${payload.provider}` : '',
      '',
      `Mark page: ${SITE_URL}/mark`,
    ]
      .filter(Boolean)
      .join('\n'),
  })
}

/** @deprecated Use notifyAdminNewSignup — kept for imports. */
export const notifyAdminNewAccount = notifyAdminNewSignup

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
    preheader: payload.email,
    text: [
      payload.kind === 'credits' ? 'Credit pack purchased' : 'Subscription started/updated',
      '',
      `Email: ${payload.email}`,
      `User ID: ${payload.userId}`,
      `Detail: ${payload.detail}`,
      payload.stripeSessionId ? `Stripe session: ${payload.stripeSessionId}` : '',
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
  level?: string | null
  subjects?: string[] | null
}): void {
  const greeting = payload.name?.trim() ? `Hi ${payload.name.trim()},` : 'Hi,'
  const subjectLine = payload.subjects?.length
    ? payload.subjects.slice(0, 3).join(', ')
    : null

  sendEmailAsync({
    to: payload.email,
    subject: `Welcome to ${SITE_NAME} — you're all set`,
    preheader: 'Mark your first Cambridge question in under a minute.',
    cta: { label: 'Mark your first question', href: `${SITE_URL}/mark` },
    text: [
      greeting,
      '',
      `Your ${SITE_NAME} account is ready.`,
      payload.level && subjectLine
        ? `We saved your ${payload.level} profile${subjectLine ? ` (${subjectLine})` : ''}.`
        : '',
      '',
      'Upload a photo of your handwritten answer and get mark-by-mark feedback tied to real Cambridge mark schemes.',
      '',
      `Mark a question: ${SITE_URL}/mark`,
      `Track progress: ${SITE_URL}/dashboard/progress`,
      `Account settings: ${SITE_URL}/account`,
      '',
      `— ${SITE_NAME}`,
    ]
      .filter(Boolean)
      .join('\n'),
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
    preheader: 'Thanks for supporting MarkScheme.',
    cta: { label: 'Start marking', href: `${SITE_URL}/mark` },
    text: [
      'Hi,',
      '',
      payload.kind === 'credits'
        ? `Thanks for your purchase. ${payload.detail}`
        : `Thanks for subscribing. ${payload.detail}`,
      '',
      `Billing: ${SITE_URL}/account/billing`,
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
// Hooks (call from routes / webhooks / onboarding save)
// ---------------------------------------------------------------------------

const NEW_SIGNUP_WINDOW_MS = 30 * 60 * 1000

export function isRecentlyCreatedAccount(createdAt: string | undefined): boolean {
  if (!createdAt) return false
  const t = new Date(createdAt).getTime()
  if (Number.isNaN(t)) return false
  return Date.now() - t < NEW_SIGNUP_WINDOW_MS
}

/** After OAuth / magic link — admin heads-up only (welcome sends after onboarding). */
export async function handlePostAuthEmails(
  supabase: SupabaseClient,
  user: {
    id: string
    email?: string | null
    created_at?: string
    app_metadata?: Record<string, unknown>
  }
): Promise<void> {
  if (!user.email || !isRecentlyCreatedAccount(user.created_at)) return

  const provider =
    typeof user.app_metadata?.provider === 'string' ? user.app_metadata.provider : null

  notifyAdminNewSignup({
    email: user.email,
    userId: user.id,
    provider,
  })
}

/** First-time onboarding save — welcome email to student + rich admin alert. */
export async function handleOnboardingCompleteEmails(
  supabase: SupabaseClient,
  userId: string,
  profile: {
    full_name?: string | null
    level?: string | null
    subjects?: string[] | null
    primary_goal?: string | null
  }
): Promise<void> {
  const { data: authData } = await supabase.auth.admin.getUserById(userId)
  const email = authData?.user?.email
  if (!email) return

  const provider =
    typeof authData?.user?.app_metadata?.provider === 'string'
      ? authData.user.app_metadata.provider
      : null

  sendWelcomeEmail({
    email,
    name: profile.full_name,
    level: profile.level,
    subjects: profile.subjects,
  })

  notifyAdminOnboardingComplete({
    email,
    userId,
    name: profile.full_name,
    level: profile.level,
    subjects: profile.subjects,
    primaryGoal: profile.primary_goal,
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
