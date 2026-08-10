import { sendEmail, sendEmailAsync } from '@/lib/email/send'
import {
  EMAIL_BODY,
  EMAIL_BRAND,
  EMAIL_INK,
  EMAIL_MUTED,
  EMAIL_SERIF,
  EMAIL_SANS,
  EMAIL_BORDER,
  EMAIL_HAIRLINE,
  EMAIL_SURFACE,
  calloutHtml,
  escapeHtml as esc,
  renderBrandedEmailHtml,
  sectionHeading,
  stepHtml,
} from '@/lib/email/templates'
import { getSubjectById } from '@/lib/profile-options'
import { SITE_NAME, SITE_URL } from '@/lib/site-config'

export type MaxVaultTourPayload = {
  to: string
  recipientName?: string | null
  /** Profile subject ids or display names. */
  subjects?: string[] | null
  board?: string | null
  level?: string | null
  targetGrade?: string | null
  /** Await Resend (scripts / tests). Default fire-and-forget for product paths. */
  wait?: boolean
}

type TourContext = {
  greeting: string
  subjectLabels: string[]
  boardLabel: string | null
  levelLabel: string | null
  targetGrade: string | null
  vaultHref: string
  markHref: string
  coursesHref: string
}

function resolveSubjects(ids: string[] | null | undefined, level?: string | null): string[] {
  const out: string[] = []
  const seen = new Set<string>()
  for (const id of ids ?? []) {
    const opt = getSubjectById(id, level ?? undefined)
    const label = opt?.label?.trim() || id.trim()
    if (!label || seen.has(label.toLowerCase())) continue
    seen.add(label.toLowerCase())
    out.push(label)
  }
  return out
}

function subjectPills(labels: string[]): string {
  if (labels.length === 0) {
    return `<p style="margin:0;font-family:${EMAIL_SERIF};font-size:14.5px;line-height:1.6;color:${EMAIL_BODY}">Add your subjects on your profile and Vault will lock onto them.</p>`
  }
  const pills = labels
    .map(
      (label) =>
        `<span style="display:inline-block;font-family:${EMAIL_SANS};font-size:12px;font-weight:700;letter-spacing:.02em;color:${EMAIL_INK};background:#fff;border:1.5px solid ${EMAIL_BORDER};padding:7px 12px;margin:0 6px 8px 0">${esc(label)}</span>`
    )
    .join('')
  return `<div style="margin:0">${pills}</div>`
}

/** Visual strip: Mark → Spot gaps → Rebuild course */
function journeyVisual(subjectHint: string): string {
  const cells = [
    { n: '01', title: 'You mark', body: 'Real exam answers' },
    { n: '02', title: 'We listen', body: `Gaps in ${subjectHint}` },
    { n: '03', title: 'Course rebuilds', body: 'Premium path for you' },
  ]
  const tds = cells
    .map(
      (c, i) => `<td valign="top" style="width:33.33%;padding:0 ${i < 2 ? '6px' : '0'} 0 0">
      <div style="background:#fff;border:1.5px solid ${EMAIL_BORDER};padding:14px 12px;text-align:center">
        <div style="font-family:${EMAIL_SANS};font-size:10px;font-weight:700;letter-spacing:.14em;color:${EMAIL_BRAND};margin:0 0 8px">${c.n}</div>
        <div style="font-family:${EMAIL_SERIF};font-size:15px;font-weight:600;color:${EMAIL_INK};margin:0 0 4px">${esc(c.title)}</div>
        <div style="font-family:${EMAIL_SANS};font-size:12px;line-height:1.4;color:${EMAIL_MUTED}">${esc(c.body)}</div>
      </div>
    </td>`
    )
    .join('')
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 22px"><tr>${tds}</tr></table>`
}

/** Mini “cinema stage” visual for Concept Cinema */
function cinemaStageVisual(subjectLine: string): string {
  return `<div style="margin:0 0 22px;border:1.5px solid ${EMAIL_BORDER};background:linear-gradient(180deg,#fffdf8 0%,#f7f1e8 100%);padding:0;overflow:hidden">
    <div style="background:${EMAIL_BRAND};padding:10px 16px">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
        <td style="font-family:${EMAIL_SANS};font-size:10px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:#fff">Concept Cinema · live</td>
        <td align="right" style="font-family:${EMAIL_SANS};font-size:10px;letter-spacing:.08em;text-transform:uppercase;color:rgba(255,255,255,.85)">Max exclusive</td>
      </tr></table>
    </div>
    <div style="padding:22px 18px 18px;text-align:center">
      <div style="font-family:${EMAIL_SERIF};font-size:13px;color:${EMAIL_MUTED};margin:0 0 10px">Imagine the idea moving for ${esc(subjectLine)}</div>
      <div style="font-family:${EMAIL_SERIF};font-size:28px;font-weight:600;letter-spacing:-.03em;color:${EMAIL_INK};line-height:1.15;margin:0 0 8px">Watch · Scrub · Understand</div>
      <div style="height:10px;background:#ebe4d8;border-radius:999px;margin:16px auto 6px;max-width:280px;overflow:hidden">
        <div style="height:10px;width:62%;background:${EMAIL_BRAND};border-radius:999px">&nbsp;</div>
      </div>
      <div style="font-family:${EMAIL_SANS};font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:${EMAIL_MUTED}">Scrub the idea → teaching beat 3 of 4</div>
      <p style="margin:14px 0 0;font-family:${EMAIL_SERIF};font-size:14.5px;line-height:1.55;color:${EMAIL_BODY}">Live syllabus diagrams — not static textbook figures. Pause when it clicks, then open the full lesson.</p>
    </div>
  </div>`
}

function midCta(href: string, label: string): string {
  return `<p style="margin:0 0 26px;text-align:center">
    <a href="${esc(href)}" style="display:inline-block;font-family:${EMAIL_SANS};background:${EMAIL_BRAND};color:#fff;text-decoration:none;font-weight:600;font-size:14px;letter-spacing:.02em;padding:15px 28px;border-radius:3px">${esc(label)}</a>
  </p>`
}

function careBlock(greeting: string, subjects: string[], targetGrade: string | null): string {
  const subjectBit =
    subjects.length > 0
      ? `We see you studying <strong style="color:${EMAIL_INK}">${esc(subjects.join(', '))}</strong>`
      : `We see you showing up for your exams`
  const gradeBit = targetGrade
    ? ` — chasing <strong style="color:${EMAIL_INK}">${esc(targetGrade)}</strong>`
    : ''
  return calloutHtml(
    `${subjectBit}${gradeBit}. That is why Vault is not a generic dump of links. It is a desk we keep arranging around <em>your</em> marks, ${esc(greeting)} — because the students who improve are the ones who feel someone is paying attention.`,
    'We care about your grade, not just your clicks'
  )
}

function premiumCoursesBlock(subjects: string[]): string {
  const focus =
    subjects.length > 0
      ? subjects.length === 1
        ? `your ${esc(subjects[0]!)} course`
        : `your ${esc(subjects.slice(0, -1).join(', '))} and ${esc(subjects[subjects.length - 1]!)} courses`
      : 'your courses'

  return (
    sectionHeading(
      'How your premium courses are built',
      'This is the Max difference — personal, not one-size-fits-all.'
    ) +
    `<p style="margin:0 0 14px;font-size:15.5px;line-height:1.7;color:${EMAIL_BODY}">Right now ${focus} start from the full syllabus so you are never locked out of a topic. That is the floor.</p>` +
    `<p style="margin:0 0 14px;font-size:15.5px;line-height:1.7;color:${EMAIL_BODY}">As you mark questions, MarkScheme reads where marks leak — a shaky method, a missed definition, a topic you keep losing. Vault then <strong style="color:${EMAIL_INK}">rebuilds a premium path</strong> around those weak spots: the lessons you need next, with <strong style="color:${EMAIL_INK}">learn-with-diagrams</strong> so the idea is visible, not just described.</p>` +
    `<p style="margin:0 0 18px;font-size:15.5px;line-height:1.7;color:${EMAIL_BODY}">Prefer watching when reading feels heavy? <strong style="color:${EMAIL_INK}">Max videos are coming soon</strong> for the same hard topics — same desk, gentler way in.</p>` +
    journeyVisual(subjects[0] || 'your subjects')
  )
}

function featureStrip(): string {
  const items = [
    {
      status: 'Live now',
      title: 'Concept Cinema',
      body: 'Syllabus ideas that move. Scrub, pause, open the lesson.',
      tint: '#fdf8f9',
    },
    {
      status: 'Gets smarter',
      title: 'Adaptive course path',
      body: 'Pinned to your weak topics as your marks come in.',
      tint: '#f7faf8',
    },
    {
      status: 'Coming soon',
      title: 'Max videos',
      body: 'When reading feels hard — watch the same topics instead.',
      tint: '#f8f6f2',
    },
    {
      status: 'Live now',
      title: 'Sprint · coach · models',
      body: 'Weekly checklist, coach inbox, full-marks models to beat.',
      tint: '#f7f8fb',
    },
  ]
  return items
    .map(
      (item) => `<div style="background:${item.tint};border:1.5px solid ${EMAIL_BORDER};padding:16px 18px;margin:0 0 10px">
      <div style="font-family:${EMAIL_SANS};font-size:10px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:${EMAIL_BRAND};margin:0 0 6px">${esc(item.status)}</div>
      <div style="font-family:${EMAIL_SERIF};font-size:17px;font-weight:600;color:${EMAIL_INK};margin:0 0 4px">${esc(item.title)}</div>
      <div style="font-family:${EMAIL_SERIF};font-size:14.5px;line-height:1.55;color:${EMAIL_BODY}">${esc(item.body)}</div>
    </div>`
    )
    .join('')
}

function buildBodyHtml(ctx: TourContext): string {
  const subjectLine =
    ctx.subjectLabels.length > 0 ? ctx.subjectLabels.join(' · ') : 'your subjects'
  const boardLine = [ctx.boardLabel, ctx.levelLabel].filter(Boolean).join(' · ')

  return (
    `<p style="margin:0 0 4px;font-family:${EMAIL_SERIF};font-size:17px;color:${EMAIL_INK}">Hi ${esc(ctx.greeting)},</p>` +
    `<p style="margin:0 0 14px;font-family:${EMAIL_SERIF};font-size:24px;font-weight:600;letter-spacing:-.025em;line-height:1.25;color:${EMAIL_INK}">We built a Vault with your name on it.</p>` +
    `<p style="margin:0 0 18px;font-size:15.5px;line-height:1.7;color:${EMAIL_BODY}">Not a newsletter. Not a dump of PDFs. A private Max desk for <strong style="color:${EMAIL_INK}">${esc(subjectLine)}</strong>${boardLine ? ` <span style="color:${EMAIL_MUTED}">(${esc(boardLine)})</span>` : ''} — arranged so the next thing you open is the thing that moves your grade.</p>` +
    careBlock(ctx.greeting, ctx.subjectLabels, ctx.targetGrade) +
    `<div style="background:${EMAIL_SURFACE};border:1.5px solid ${EMAIL_BORDER};padding:16px 18px;margin:0 0 22px">
      <div style="font-family:${EMAIL_SANS};font-size:10px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:${EMAIL_MUTED};margin:0 0 10px">Your subjects on this desk</div>
      ${subjectPills(ctx.subjectLabels)}
    </div>` +
    cinemaStageVisual(subjectLine) +
    midCta(ctx.vaultHref, 'Visit your Max Vault now →') +
    premiumCoursesBlock(ctx.subjectLabels) +
    sectionHeading('Everything waiting for you inside', 'Open the Vault and use each one — they are already yours.') +
    featureStrip() +
    midCta(ctx.vaultHref, 'Take me to my Vault →') +
    sectionHeading('Three caring moves this week') +
    `<div style="margin-top:4px">` +
    stepHtml(
      1,
      'Step into your Vault.',
      `Open Concept Cinema for ${esc(ctx.subjectLabels[0] || 'your subject')} and watch one idea all the way through.`
    ) +
    stepHtml(
      2,
      'Mark two or three real answers.',
      'That is how we hear where you struggle — and how your premium course path gets rebuilt.'
    ) +
    stepHtml(
      3,
      'Return to the lessons we pin for you.',
      'Diagrams today. Videos coming soon when reading feels heavy.'
    ) +
    `</div>` +
    `<div style="margin:26px 0 0;padding:20px 18px;background:#fff;border:1.5px solid ${EMAIL_BORDER};border-left:3px solid ${EMAIL_BRAND}">
      <p style="margin:0 0 8px;font-family:${EMAIL_SERIF};font-size:16px;font-weight:600;color:${EMAIL_INK}">We are in this with you, ${esc(ctx.greeting)}.</p>
      <p style="margin:0;font-family:${EMAIL_SERIF};font-size:15px;line-height:1.65;color:${EMAIL_BODY}">Your Vault will keep getting sharper every time you mark. When something feels hard, come back — the diagrams (and soon the videos) are there so you never have to white-knuckle a topic alone.</p>
    </div>` +
    `<p style="margin:22px 0 0;font-size:15px;line-height:1.65;color:${EMAIL_INK}">With care,<br/>${esc(SITE_NAME)} Max</p>` +
    `<div style="height:1px;background:${EMAIL_HAIRLINE};margin:22px 0 0;font-size:0;line-height:0">&nbsp;</div>`
  )
}

function buildText(ctx: TourContext): string {
  const subjectLine =
    ctx.subjectLabels.length > 0 ? ctx.subjectLabels.join(', ') : 'your subjects'
  return [
    `Hi ${ctx.greeting},`,
    '',
    'We built a Vault with your name on it.',
    '',
    `A private Max desk for ${subjectLine}${ctx.boardLabel ? ` (${ctx.boardLabel}${ctx.levelLabel ? ` · ${ctx.levelLabel}` : ''})` : ''}.`,
    ctx.targetGrade ? `Target: ${ctx.targetGrade}.` : '',
    '',
    'We care about your grade, not just your clicks. Vault rearranges around your marks.',
    '',
    'How premium courses are built:',
    '1) You mark real answers',
    '2) We spot where marks leak',
    '3) Your course path rebuilds around those weak spots — with learn-with-diagrams (videos coming soon)',
    '',
    'Inside your Vault:',
    '- Concept Cinema — ideas that move',
    '- Adaptive course path — gets smarter as you mark',
    '- Videos coming soon',
    '- Sprint checklist, coach inbox, full-marks models',
    '- Priority deep marking',
    '',
    `Visit your Max Vault: ${ctx.vaultHref}`,
    `Mark: ${ctx.markHref}`,
    `Courses: ${ctx.coursesHref}`,
    '',
    `With care,`,
    `${SITE_NAME} Max`,
  ]
    .filter((line) => line !== undefined)
    .join('\n')
}

function buildContext(payload: {
  recipientName?: string | null
  subjects?: string[] | null
  board?: string | null
  level?: string | null
  targetGrade?: string | null
}): TourContext {
  const greeting = payload.recipientName?.trim() || 'there'
  return {
    greeting,
    subjectLabels: resolveSubjects(payload.subjects, payload.level),
    boardLabel: payload.board?.trim() || null,
    levelLabel: payload.level?.trim() || null,
    targetGrade: payload.targetGrade?.trim() || null,
    vaultHref: `${SITE_URL}/dashboard/vault`,
    markHref: `${SITE_URL}/mark`,
    coursesHref: `${SITE_URL}/courses`,
  }
}

/** Beautiful Max Vault tour — personal, visual, subject-aware. */
export function buildMaxVaultTourEmail(payload: {
  recipientName?: string | null
  subjects?: string[] | null
  board?: string | null
  level?: string | null
  targetGrade?: string | null
}): { subject: string; preheader: string; text: string; html: string } {
  const ctx = buildContext(payload)
  const subjectBit =
    ctx.subjectLabels.length > 0 ? ctx.subjectLabels.slice(0, 2).join(' & ') : 'your subjects'
  const preheader = `${ctx.greeting} — your Vault for ${subjectBit} is ready. Live diagrams, adaptive courses, videos soon.`
  const subject = `${ctx.greeting}, we built your Max Vault for ${subjectBit}`

  return {
    subject,
    preheader,
    text: buildText(ctx),
    html: renderBrandedEmailHtml({
      kicker: 'Max · built for you',
      preheader,
      bodyHtml: buildBodyHtml(ctx),
      cta: { label: 'Open your Max Vault →', href: ctx.vaultHref },
      secondaryLinks: [
        { label: 'Mark a question', href: ctx.markHref },
        { label: 'Open courses', href: ctx.coursesHref },
      ],
    }),
  }
}

export function sendMaxVaultTourEmail(payload: MaxVaultTourPayload): void | Promise<boolean> {
  const built = buildMaxVaultTourEmail(payload)
  const params = {
    to: payload.to,
    subject: built.subject,
    preheader: built.preheader,
    text: built.text,
    html: built.html,
  }
  if (payload.wait) return sendEmail(params)
  sendEmailAsync(params)
}
