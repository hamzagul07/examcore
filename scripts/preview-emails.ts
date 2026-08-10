/**
 * Renders every outbound email to tmp/email-preview/ so they can be opened in a
 * browser and read the way a student reads them.
 *
 * These are the only student-facing surfaces with no page to visit, so without
 * this the only way to see a change was to trigger the real event and check an
 * inbox. Nothing is sent: the Resend call is stubbed and the request body
 * captured instead.
 *
 *   npx tsx scripts/preview-emails.ts
 */
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'

process.env.RESEND_API_KEY ||= 'preview-not-a-real-key'

type Captured = {
  name: string
  subject: string
  html: string
  text: string
  headers: Record<string, string>
}

const captured: Captured[] = []
let currentName = 'unknown'

const realFetch = globalThis.fetch
globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
  const url = String(input)
  if (!url.includes('api.resend.com')) return realFetch(input, init)
  const body = JSON.parse(String(init?.body ?? '{}'))
  captured.push({
    name: currentName,
    subject: body.subject ?? '(no subject)',
    html: body.html ?? '',
    text: body.text ?? '',
    headers: body.headers ?? {},
  })
  return new Response('{"id":"preview"}', { status: 200 })
}) as typeof fetch

/** Emails are fire-and-forget, so let the microtask queue drain after each. */
async function capture(name: string, fire: () => void | Promise<unknown>): Promise<void> {
  currentName = name
  await fire()
  await new Promise((resolve) => setTimeout(resolve, 0))
}

async function main() {
  const { sendWelcomeEmail } = await import('@/lib/email/welcome')
  const { sendReviewDigestEmail } = await import('@/lib/email/review')
  const { sendPurchaseConfirmationEmail, sendContactConfirmationEmail } = await import(
    '@/lib/email/notifications'
  )
  const { sendStreakNudgeEmail } = await import('@/lib/email/streak-nudge')
  const {
    sendActivationFirstMarkEmail,
    sendActivationProofEmail,
    sendActivationFeedbackEmail,
    sendFinishOnboardingEmail,
  } = await import('@/lib/email/activation')
  const { sendWeeklyReportEmail } = await import('@/lib/email/weekly-report')
  const { sendMaxVaultTourEmail } = await import('@/lib/email/max-vault-tour')
  const { sendMaxWelcomeEmail } = await import('@/lib/email/max-welcome')

  const to = 'student@example.com'
  const unsubscribeHref = 'https://markscheme.app/unsubscribe?token=preview'

  await capture('welcome-ib', () =>
    sendWelcomeEmail({
      email: to,
      name: 'Amara',
      board: 'IB',
      level: 'IB Diploma',
      subjects: ['ib-biology-hl', 'ib-chemistry-sl', 'ib-physics-hl'],
      targetGrade: '7',
    })
  )

  await capture('welcome-cambridge', () =>
    sendWelcomeEmail({
      email: to,
      name: 'Sam',
      board: 'Cambridge International',
      level: 'A-Level',
      subjects: ['Mathematics', 'Physics', 'Chemistry'],
      targetGrade: 'A*',
    })
  )

  await capture('welcome-minimal', () =>
    sendWelcomeEmail({ email: to, name: null, level: 'IGCSE', subjects: [] })
  )

  // The activation series — the three emails to someone who signed up and never
  // marked anything, plus the separate track for unfinished onboarding.
  await capture('activation-1-first-mark', () =>
    sendActivationFirstMarkEmail({
      to,
      recipientName: 'Sam',
      board: 'Cambridge International',
      level: 'A-Level',
      subjects: ['Mathematics', 'Physics', 'Chemistry'],
      examDate: '2026-10-14',
      unsubscribeHref,
    })
  )

  // IB variant: no syllabus codes shown, and the scheme sentence differs.
  await capture('activation-1-first-mark-ib', () =>
    sendActivationFirstMarkEmail({
      to,
      recipientName: 'Amara',
      board: 'IB',
      level: 'IB Diploma',
      subjects: ['ib-biology-hl', 'ib-chemistry-sl'],
      examDate: null,
      unsubscribeHref,
    })
  )

  await capture('activation-2-proof', () =>
    sendActivationProofEmail({
      to,
      recipientName: 'Sam',
      board: 'Cambridge International',
      level: 'A-Level',
      subjects: ['Mathematics'],
      unsubscribeHref,
    })
  )

  await capture('activation-3-feedback', () =>
    sendActivationFeedbackEmail({
      to,
      recipientName: 'Sam',
      board: 'Cambridge International',
      level: 'A-Level',
      subjects: ['Mathematics'],
      unsubscribeHref,
    })
  )

  await capture('activation-finish-onboarding', () =>
    sendFinishOnboardingEmail({ to, recipientName: null, unsubscribeHref })
  )

  await capture('review-digest', () =>
    sendReviewDigestEmail({
      to,
      recipientName: 'Amara',
      topics: [
        { name: 'Electrolysis', subjectLabel: 'Chemistry', subjectCode: '9701', topicCode: '6.1' },
        { name: 'Moments', subjectLabel: 'Physics', subjectCode: '9702', topicCode: '4.2' },
        { name: 'Osmosis', subjectLabel: 'Biology', subjectCode: '9700', topicCode: '4.3' },
      ],
      unsubscribeHref,
    })
  )

  await capture('purchase-subscription', () =>
    sendPurchaseConfirmationEmail({
      email: to,
      kind: 'subscription',
      detail: 'Your Scholar plan is now active.',
      tier: 'scholar',
    })
  )

  await capture('purchase-credits', () =>
    sendPurchaseConfirmationEmail({
      email: to,
      kind: 'credits',
      detail: '50 marking credits have been added to your account.',
      credits: 50,
    })
  )

  await capture('contact-confirmation', () =>
    sendContactConfirmationEmail({
      email: to,
      name: 'Sam',
      message:
        'Hi, I marked a 9709 P3 integration question and I think the method mark was\nwrong — the scheme gives M1 for the substitution but it said I missed it.\nCan you take a look?',
    })
  )

  const {
    sendCommunityReplyEmail,
    sendCommunityMilestoneEmail,
    sendCommunityDigestEmail,
  } = await import('@/lib/email/community')

  await capture('community-reply', () =>
    sendCommunityReplyEmail({
      to,
      recipientName: 'Sam',
      actorUsername: 'nadia_hl',
      kind: 'reply',
      postTitle: 'Why does the 9702 markscheme want g = 9.81 here?',
      postHref: 'https://markscheme.app/community/p/abc123',
      preview:
        "Because the question says 'near the Earth's surface' — if it gave you a\nheight you'd have to recompute it. The scheme only gives A1 for the value.",
      unsubscribeHref,
    })
  )

  // Every field here is written by another student. Community markup is built by
  // hand rather than routed through the auto-escaping text path, so this case
  // exists to keep that honest — the rendered HTML must contain no live tag.
  await capture('community-reply-hostile-input', () =>
    sendCommunityReplyEmail({
      to,
      recipientName: 'Sam',
      actorUsername: '<script>alert(1)</script>',
      kind: 'mention',
      postTitle: '"><img src=x onerror=alert(1)>',
      postHref: 'https://markscheme.app/community/p/xss',
      preview: '<b>bold</b> & <a href="https://evil.example">link</a>',
      unsubscribeHref,
    })
  )

  await capture('community-milestone', () =>
    sendCommunityMilestoneEmail({
      to,
      recipientName: 'Sam',
      postTitle: 'Why does the 9702 markscheme want g = 9.81 here?',
      score: 25,
      postHref: 'https://markscheme.app/community/p/abc123',
      unsubscribeHref,
    })
  )

  await capture('community-digest', () =>
    sendCommunityDigestEmail({
      to,
      recipientName: 'Sam',
      posts: [
        {
          title: 'Why does the 9702 markscheme want g = 9.81 here?',
          href: 'https://markscheme.app/community/p/abc123',
          score: 41,
          commentCount: 12,
          subjectCode: '9702',
        },
        {
          title: 'P3 integration by substitution — when do you change the limits?',
          href: 'https://markscheme.app/community/p/def456',
          score: 28,
          commentCount: 1,
          subjectCode: '9709',
        },
      ],
      unsubscribeHref,
    })
  )

  await capture('streak-nudge', () =>
    sendStreakNudgeEmail({
      to,
      recipientName: 'Amara',
      streak: 6,
      markedThisWeek: 12,
      bestStreak: 9,
      unsubscribeHref,
    })
  )

  // The streak matching their own record renders a different third tile and a
  // different closing line — worth seeing on its own.
  await capture('streak-nudge-personal-best', () =>
    sendStreakNudgeEmail({
      to,
      recipientName: 'Amara',
      streak: 9,
      markedThisWeek: 15,
      bestStreak: 9,
      unsubscribeHref,
    })
  )

  await capture('weekly-report', () =>
    sendWeeklyReportEmail({
      to,
      recipientName: 'Sam',
      unsubscribeHref,
      data: {
        marksThisWeek: 7,
        avgPctThisWeek: 68,
        avgPctDelta: 5,
        primarySubjectLabel: 'Physics',
        predictedGrade: 'B',
        targetGrade: 'A',
        pointsToTarget: 9,
        onTrackForTarget: false,
        weakestTopicName: 'Moments',
        weakestSubjectLabel: 'Physics',
        weakTopics: [
          {
            name: 'Moments',
            subjectLabel: 'Physics',
            subjectCode: '9702',
            topicCode: '4.2',
            percentage: 41,
          },
          {
            name: 'Electrolysis',
            subjectLabel: 'Chemistry',
            subjectCode: '9701',
            topicCode: '6.1',
            percentage: 52,
          },
        ],
        examDaysLeft: 43,
      },
    })
  )

  await capture('max-vault-tour', () =>
    sendMaxVaultTourEmail({ to, recipientName: 'Hamza', wait: true })
  )

  await capture('max-welcome', () =>
    sendMaxWelcomeEmail({
      to,
      recipientName: 'Hamza',
      bonusCredits: 20,
      creditsGranted: true,
    })
  )

  // Broadcast campaigns render through the same shell. This is the live copy of
  // the re-permission ask, with the per-recipient placeholders already filled.
  const { sendBroadcastEmail } = await import('@/lib/email/broadcast')
  await capture('campaign-repermission', () =>
    sendBroadcastEmail({
      to,
      recipientName: 'Sam',
      subject: 'Do you want product updates from MarkScheme?',
      preheader: 'One question about email. Ignore it and nothing changes.',
      body: `You made a MarkScheme account, and until now the only emails we have sent you are the ones about your own work — marking results, review reminders, that kind of thing. Those carry on either way.

What we have never done is ask whether you want to hear about anything else: new subjects going live, features worth knowing about, and the occasional bit of exam-season guidance.

So this is us asking, once. No more than twice a month, and every one has a one-click unsubscribe.

If you would rather not, do nothing at all — this is the only time we will ask, and ignoring it keeps you exactly where you are.`,
      cta: { label: 'Yes, send me updates →', href: 'https://markscheme.app/email/subscribe?token=preview' },
      unsubscribeHref,
      unsubscribeLabel: 'Unsubscribe from product updates',
    })
  )

  const outDir = path.join(process.cwd(), 'tmp', 'email-preview')
  await mkdir(outDir, { recursive: true })

  for (const item of captured) {
    await writeFile(path.join(outDir, `${item.name}.html`), item.html, 'utf8')
    const headerLines = Object.entries(item.headers)
      .map(([k, v]) => `${k}: ${v}`)
      .join('\n')
    await writeFile(
      path.join(outDir, `${item.name}.txt`),
      `Subject: ${item.subject}\n${headerLines ? `${headerLines}\n` : ''}\n${item.text}\n`,
      'utf8'
    )
  }

  const index =
    `<!doctype html><meta charset="utf-8"><title>Email previews</title>` +
    `<body style="font-family:system-ui;max-width:640px;margin:40px auto;line-height:1.6">` +
    `<h1>Email previews</h1><ol>` +
    captured
      .map(
        (c) =>
          `<li><a href="./${c.name}.html">${c.name}</a> — <em>${c.subject}</em> ` +
          `(<a href="./${c.name}.txt">plain text</a>)</li>`
      )
      .join('') +
    `</ol></body>`
  await writeFile(path.join(outDir, 'index.html'), index, 'utf8')

  console.log(`Wrote ${captured.length} previews to ${outDir}`)
  for (const c of captured) {
    const oneClick = c.headers['List-Unsubscribe-Post'] ? 'one-click' : '—'
    console.log(`  ${c.name.padEnd(30)} ${oneClick.padEnd(10)} ${c.subject}`)
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
