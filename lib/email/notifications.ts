import type { SupabaseClient } from '@supabase/supabase-js'
import { CONTACT_EMAIL, SITE_NAME, SITE_URL } from '@/lib/site-config'
import { adminNotifyAddress, sendEmail, sendEmailAsync } from '@/lib/email/send'
import type { SubscriptionTier } from '@/lib/database.types'
import {
  EMAIL_INK,
  EMAIL_MUTED,
  calloutHtml,
  escapeHtml as esc,
  noteHtml,
  quoteHtml,
  renderBrandedEmailHtml,
  sectionHeading,
} from '@/lib/email/templates'
import { capForTier, tierMarketingName } from '@/lib/billing/caps'
import {
  FREE_WHOLE_PAPER_QUESTION_LIMIT,
  WHOLE_PAPER_QUESTION_LIMIT,
} from '@/lib/billing/features'
import { sendWelcomeEmail } from '@/lib/email/welcome'

/** Lives in its own module (it is board-aware and long); re-exported so the
 * existing `@/lib/email/notifications` import path keeps working. */
export { sendWelcomeEmail }

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

/** Longest excerpt we quote back. Enough to confirm we got the whole thing
 * without turning the confirmation into a wall of their own text. */
const CONTACT_ECHO_LIMIT = 600

export function sendContactConfirmationEmail(payload: {
  email: string
  name: string
  /** Quoted back so they can see exactly what arrived — and so this reads as a
   * real receipt rather than an autoresponder. */
  message?: string
}): void {
  const raw = (payload.message ?? '').trim()
  const truncated = raw.length > CONTACT_ECHO_LIMIT
  const excerpt = truncated ? `${raw.slice(0, CONTACT_ECHO_LIMIT).trimEnd()}…` : raw

  const echoHtml = excerpt ? quoteHtml(excerpt) : ''

  const bodyHtml =
    `<p style="margin:0 0 4px;font-size:16px;color:${EMAIL_INK}">Hi ${esc(payload.name)},</p>` +
    `<p style="margin:0 0 18px;font-size:15px;line-height:1.6;color:#555">Your message reached us — a real person reads every one. Most replies go out within a day, from ${esc(
      CONTACT_EMAIL
    )}. You can just reply to this email to add anything.</p>` +
    (echoHtml ? sectionHeading('What you sent') + echoHtml : '') +
    calloutHtml(
      `If it is something you would rather not wait on: <a href="${SITE_URL}/faq" style="color:${EMAIL_INK};font-weight:700">the FAQ</a> covers marking accuracy, plans and refunds, and if a mark looked wrong, reply with the question and we will re-run it ourselves.`
    )

  sendEmailAsync({
    to: payload.email,
    subject: `We got your message — ${SITE_NAME}`,
    preheader: 'A real person reads every one. Most replies go out within a day.',
    text: [
      `Hi ${payload.name},`,
      '',
      `Your message reached us — a real person reads every one. Most replies go out within a day, from ${CONTACT_EMAIL}. You can reply to this email to add anything.`,
      excerpt ? '' : null,
      excerpt ? 'What you sent:' : null,
      excerpt ? excerpt.replace(/^/gm, '> ') : null,
      '',
      'If you would rather not wait: the FAQ covers marking accuracy, plans and refunds.',
      `${SITE_URL}/faq`,
      '',
      'And if a mark looked wrong, reply with the question — we will re-run it ourselves.',
      '',
      `— ${SITE_NAME}`,
    ]
      .filter((line): line is string => line !== null)
      .join('\n'),
    html: renderBrandedEmailHtml({
      preheader: 'A real person reads every one. Most replies go out within a day.',
      bodyHtml,
      secondaryLinks: [
        { label: 'FAQ', href: `${SITE_URL}/faq` },
        { label: 'Mark a question', href: `${SITE_URL}/mark` },
        { label: 'Your dashboard', href: `${SITE_URL}/dashboard` },
      ],
    }),
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
  /** Polar subscription or order ID, for cross-referencing in the dashboard. */
  providerRef?: string | null
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
      payload.providerRef ? `Polar ref: ${payload.providerRef}` : '',
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

/**
 * Purchase confirmation. Leads with what the student can now do that they could
 * not do an hour ago — a receipt they can already see in their bank app is not
 * worth an email on its own.
 */
export function sendPurchaseConfirmationEmail(payload: {
  email: string
  kind: 'credits' | 'subscription'
  detail: string
  /** Credits added, for the one-time packs. */
  credits?: number | null
  /** Tier reached, for subscriptions — drives the cap and plan name shown. */
  tier?: SubscriptionTier | null
}): void {
  const isCredits = payload.kind === 'credits'
  const planName = payload.tier ? tierMarketingName(payload.tier) : null
  const cap = payload.tier ? capForTier(payload.tier) : null

  const subject = isCredits
    ? `Your ${SITE_NAME} credits are on your account`
    : planName
      ? `${planName} is active — here's what just unlocked`
      : `Your ${SITE_NAME} plan is active`

  const unlockedHtml = isCredits
    ? noteHtml(
        `Credits are only spent once you have used up your monthly questions — so they sit there until you actually need them, and they never expire mid-session on you.`
      )
    : sectionHeading('What just unlocked') +
      `<div style="margin:6px 0 20px">` +
      (payload.tier === 'mastery'
        ? [
            `<strong style="color:${EMAIL_INK}">Max Resource Vault.</strong> Personalised sprint packs, curated flagship resources, and your full-marks model bank.`,
            `<strong style="color:${EMAIL_INK}">+25 welcome bonus marks</strong> on your account (separate Max welcome email confirms).`,
            `<strong style="color:${EMAIL_INK}">Priority deep marking</strong> on big multi-question scripts — Max finishes the verify pass sooner.`,
            `<strong style="color:${EMAIL_INK}">Weekly Max coach report</strong> every Sunday with weak-topic drills.`,
            `<strong style="color:${EMAIL_INK}">${cap ?? 250} questions a month</strong> so exam season doesn't run you out of marks.`,
          ]
        : [
            `<strong style="color:${EMAIL_INK}">Whole scripts, end to end.</strong> Up to ${WHOLE_PAPER_QUESTION_LIMIT} questions per upload, instead of stopping after the first ${FREE_WHOLE_PAPER_QUESTION_LIMIT}.`,
            `<strong style="color:${EMAIL_INK}">A second-opinion pass on every mark.</strong> Each script is re-checked against the scheme before you see it, which is where the borderline marks get settled.`,
            `<strong style="color:${EMAIL_INK}">Your answer rewritten to full marks.</strong> Annotated line by line, so you can see exactly what each addition earned.`,
            `<strong style="color:${EMAIL_INK}">Progress that maps the syllabus</strong> — mastery matrix, trajectory, and weak-spot drills.`,
          ]
      )
        .map(
          (item) =>
            `<p style="margin:0 0 10px;font-size:14.5px;line-height:1.55;color:#333">${item}</p>`
        )
        .join('') +
      `</div>`

  const capLine =
    cap !== null
      ? `<p style="margin:0 0 20px;font-size:15px;line-height:1.6;color:#555">You are on <strong style="color:${EMAIL_INK}">${esc(
          planName ?? 'your plan'
        )}</strong> — ${cap} questions a month.</p>`
      : ''

  const bodyHtml =
    `<p style="margin:0 0 4px;font-size:16px;color:${EMAIL_INK}">Hi,</p>` +
    `<p style="margin:0 0 18px;font-size:15px;line-height:1.6;color:#555">${esc(
      payload.detail
    )} Thank you — this is what keeps MarkScheme running.</p>` +
    capLine +
    unlockedHtml +
    `<p style="margin:0;font-size:13px;line-height:1.6;color:${EMAIL_MUTED}">Payments and receipts are handled by Polar, our merchant of record. You can change or cancel your plan any time from billing — no email required.</p>`

  const text = [
    'Hi,',
    '',
    `${payload.detail} Thank you — this is what keeps ${SITE_NAME} running.`,
    cap !== null ? `` : '',
    cap !== null ? `You're on ${planName} — ${cap} questions a month.` : '',
    '',
    isCredits
      ? 'Credits are only spent once your monthly questions run out, so they sit there until you need them.'
      : payload.tier === 'mastery'
        ? [
            'What just unlocked:',
            '- Max Resource Vault — sprint packs, curated resources, full-marks bank.',
            '- +25 welcome bonus marks (confirmed in a separate Max email).',
            '- Priority deep marking on big multi-question scripts.',
            '- Weekly Max coach report every Sunday.',
            `- ${cap ?? 250} questions a month.`,
            '',
            `Open your Vault: ${SITE_URL}/dashboard/vault`,
          ].join('\n')
        : [
            'What just unlocked:',
            `- Whole scripts, up to ${WHOLE_PAPER_QUESTION_LIMIT} questions per upload (free stops after ${FREE_WHOLE_PAPER_QUESTION_LIMIT}).`,
            '- A second-opinion pass on every mark before you see it.',
            '- Your answer rewritten to full marks, annotated line by line.',
            '- Progress that maps the syllabus — mastery matrix, trajectory, and weak-spot drills.',
          ].join('\n'),
    '',
    'Payments and receipts are handled by Polar, our merchant of record. Change or cancel any time:',
    `${SITE_URL}/account/billing`,
    '',
    `Start marking: ${SITE_URL}/mark`,
    '',
    `— ${SITE_NAME}`,
  ]
    .filter((line, i, arr) => !(line === '' && arr[i - 1] === ''))
    .join('\n')

  sendEmailAsync({
    to: payload.email,
    subject,
    preheader: isCredits
      ? 'On your account and ready when your monthly questions run out.'
      : 'Whole scripts, a second-opinion pass, and full-marks rewrites.',
    text,
    html: renderBrandedEmailHtml({
      preheader: isCredits
        ? 'On your account and ready when your monthly questions run out.'
        : 'Whole scripts, a second-opinion pass, and full-marks rewrites.',
      bodyHtml,
      cta: { label: 'Start marking →', href: `${SITE_URL}/mark` },
      secondaryLinks: [
        { label: 'Billing & receipts', href: `${SITE_URL}/account/billing` },
        { label: 'Your dashboard', href: `${SITE_URL}/dashboard` },
      ],
    }),
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
    /** Needed by the welcome email: an IB student must not be told their work
     * is marked against Cambridge schemes. */
    board?: string | null
    level?: string | null
    subjects?: string[] | null
    primary_goal?: string | null
    target_grade?: string | null
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
    board: profile.board,
    level: profile.level,
    subjects: profile.subjects,
    targetGrade: profile.target_grade,
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
    /** Credits added (one-time packs) / tier reached (subscriptions) — drive the
     * "what just unlocked" section of the confirmation. */
    credits?: number | null
    tier?: SubscriptionTier | null
    /** Polar subscription or order ID. */
    providerRef?: string | null
  }
): Promise<void> {
  const { data: authData } = await supabase.auth.admin.getUserById(userId)
  const email = authData?.user?.email
  if (!email) return

  sendPurchaseConfirmationEmail({
    email,
    kind: payload.kind,
    detail: payload.detail,
    credits: payload.credits,
    tier: payload.tier,
  })

  notifyAdminPurchase({
    email,
    userId,
    kind: payload.kind,
    detail: payload.detail,
    providerRef: payload.providerRef,
  })
}
