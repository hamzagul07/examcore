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
  focusLabel: string
  hasEconomics: boolean
  hasAccounting: boolean
  vaultHref: string
  markHref: string
  coursesHref: string
  dashboardHref: string
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

/** Prefer Economics when present, but never drop the other subjects from the story. */
function pickFocusLabel(labels: string[]): string {
  const econ = labels.find((l) => /econ/i.test(l))
  if (econ) return econ
  return labels[0] || 'your subject'
}

function subjectLineForCopy(labels: string[]): string {
  if (labels.length === 0) return 'your subjects'
  if (labels.length === 1) return labels[0]!
  if (labels.length === 2) return `${labels[0]} and ${labels[1]}`
  return `${labels.slice(0, -1).join(', ')}, and ${labels[labels.length - 1]}`
}

/** Economics first in the list when present — still includes every profile subject. */
function orderedSubjectLabels(labels: string[]): string[] {
  const econ = labels.filter((l) => /econ/i.test(l))
  const rest = labels.filter((l) => !/econ/i.test(l))
  return [...econ, ...rest]
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
function cinemaStageVisual(subjectLabels: string[], focusLabel: string): string {
  const tabs =
    subjectLabels.length > 0
      ? subjectLabels
          .map((label, i) => {
            const on = /econ/i.test(label) || (i === 0 && !subjectLabels.some((l) => /econ/i.test(l)))
            return `<span style="display:inline-block;font-family:${EMAIL_SANS};font-size:11px;font-weight:700;padding:6px 10px;margin:0 4px 6px 0;border:1.5px solid ${on ? EMAIL_BRAND : EMAIL_BORDER};background:${on ? EMAIL_BRAND : '#fff'};color:${on ? '#fff' : EMAIL_INK}">${esc(label)}</span>`
          })
          .join('')
      : ''
  const beat = subjectLabels.some((l) => /econ/i.test(l))
    ? `Switch subjects in Cinema — start with ${esc(focusLabel)} (D&S, PPC, AD–AS), then open Maths or Accounting on the same desk.`
    : 'Live syllabus diagrams for each of your subjects — scrub, pause, then open the full lesson.'
  return `<div style="margin:0 0 22px;border:1.5px solid ${EMAIL_BORDER};background:linear-gradient(180deg,#fffdf8 0%,#f7f1e8 100%);padding:0;overflow:hidden">
    <div style="background:${EMAIL_BRAND};padding:10px 16px">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
        <td style="font-family:${EMAIL_SANS};font-size:10px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:#fff">Concept Cinema · live</td>
        <td align="right" style="font-family:${EMAIL_SANS};font-size:10px;letter-spacing:.08em;text-transform:uppercase;color:rgba(255,255,255,.85)">Max exclusive</td>
      </tr></table>
    </div>
    <div style="padding:22px 18px 18px;text-align:center">
      <div style="margin:0 0 12px">${tabs}</div>
      <div style="font-family:${EMAIL_SERIF};font-size:13px;color:${EMAIL_MUTED};margin:0 0 10px">Every subject gets a shelf — we open on ${esc(focusLabel)} first</div>
      <div style="font-family:${EMAIL_SERIF};font-size:28px;font-weight:600;letter-spacing:-.03em;color:${EMAIL_INK};line-height:1.15;margin:0 0 8px">Watch · Scrub · Sit a paper</div>
      <div style="height:10px;background:#ebe4d8;border-radius:999px;margin:16px auto 6px;max-width:280px;overflow:hidden">
        <div style="height:10px;width:62%;background:${EMAIL_BRAND};border-radius:999px">&nbsp;</div>
      </div>
      <div style="font-family:${EMAIL_SANS};font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:${EMAIL_MUTED}">Scrub the idea → then open your question desk</div>
      <p style="margin:14px 0 0;font-family:${EMAIL_SERIF};font-size:14.5px;line-height:1.55;color:${EMAIL_BODY}">${beat}</p>
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

function premiumCoursesBlock(ctx: TourContext): string {
  const all = subjectLineForCopy(ctx.subjectLabels)
  return (
    sectionHeading(
      'Visual premium courses',
      'Syllabus-mapped lessons with live diagrams — not walls of text.'
    ) +
    `<p style="margin:0 0 14px;font-size:15.5px;line-height:1.7;color:${EMAIL_BODY}"><strong style="color:${EMAIL_INK}">${esc(all)}</strong> each start from the full syllabus so you are never locked out of a topic. That is the floor.</p>` +
    `<p style="margin:0 0 14px;font-size:15.5px;line-height:1.7;color:${EMAIL_BODY}">Premium means <strong style="color:${EMAIL_INK}">visual</strong>: learn-with-diagram lessons, Concept Cinema next to the path, and colour that makes demand, supply, and equilibrium obvious. As you mark, Vault <strong style="color:${EMAIL_INK}">rebuilds the path</strong> per subject around where marks leak — shaky method in Maths, missing labels in Economics, soft evaluation in Accounting.</p>` +
    `<p style="margin:0 0 18px;font-size:15.5px;line-height:1.7;color:${EMAIL_BODY}">We open your desk on <strong style="color:${EMAIL_INK}">${esc(ctx.focusLabel)}</strong> first (from your recent marks); your other subjects stay one tap away.</p>` +
    journeyVisual(ctx.focusLabel) +
    midCta(ctx.coursesHref, 'Open your visual courses →')
  )
}

function askAndProgressBlock(ctx: TourContext): string {
  return (
    sectionHeading(
      'Ask MarkScheme · see your progress',
      'Max is not only a Vault — it is a study partner that tracks the grade.'
    ) +
    `<div style="background:#f7f8fb;border:1.5px solid ${EMAIL_BORDER};padding:16px 18px;margin:0 0 10px">
      <div style="font-family:${EMAIL_SANS};font-size:10px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:${EMAIL_BRAND};margin:0 0 6px">Live now</div>
      <div style="font-family:${EMAIL_SERIF};font-size:17px;font-weight:600;color:${EMAIL_INK};margin:0 0 4px">Ask MarkScheme</div>
      <div style="font-family:${EMAIL_SERIF};font-size:14.5px;line-height:1.55;color:${EMAIL_BODY}">Stuck on a diagram, a mark comment, or how to evaluate? Tap <strong style="color:${EMAIL_INK}">Ask MarkScheme</strong> anywhere in the app — it knows your subjects and can talk through the next step without sending you to a random chatbot.</div>
    </div>` +
    `<div style="background:#f7faf8;border:1.5px solid ${EMAIL_BORDER};padding:16px 18px;margin:0 0 18px">
      <div style="font-family:${EMAIL_SANS};font-size:10px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:${EMAIL_BRAND};margin:0 0 6px">Live now</div>
      <div style="font-family:${EMAIL_SERIF};font-size:17px;font-weight:600;color:${EMAIL_INK};margin:0 0 4px">Progress that tracks ${ctx.targetGrade ? esc(ctx.targetGrade) : 'your target'}</div>
      <div style="font-family:${EMAIL_SERIF};font-size:14.5px;line-height:1.55;color:${EMAIL_BODY}">Your Home desk and Vault show projected grade, weak topics, sprint days done, and models to beat — so you always know what moved and what to do next${ctx.targetGrade ? ` on the road to <strong style="color:${EMAIL_INK}">${esc(ctx.targetGrade)}</strong>` : ''}.</div>
    </div>` +
    midCta(ctx.dashboardHref, 'See your progress desk →')
  )
}

function featureStrip(ctx: TourContext): string {
  const deskBody =
    'One question desk per subject — white exam sheet, Times font, real stems. Work it, then mark answer-only. Switch tabs anytime.'
  const cinemaBody = ctx.hasEconomics
    ? `Tabs for ${subjectLineForCopy(ctx.subjectLabels)} — we cue ${ctx.focusLabel} first (D&S, PPC, AD–AS); Maths and Accounting stay on the same stage.`
    : `Live diagrams for ${subjectLineForCopy(ctx.subjectLabels)} — scrub, pause, open the lesson.`
  const items = [
    {
      status: 'Live now',
      title: 'Concept Cinema (all your subjects)',
      body: cinemaBody,
      tint: '#fdf8f9',
    },
    {
      status: 'Live now',
      title: 'Exam-paper question desks',
      body: deskBody,
      tint: '#f7f8fb',
    },
    {
      status: 'Visual + adaptive',
      title: 'Premium courses',
      body: 'Syllabus lessons with live diagrams — the path rebuilds around weak topics as you mark.',
      tint: '#f7faf8',
    },
    {
      status: 'Live now',
      title: 'Ask MarkScheme',
      body: 'Your in-app study chat — ask about a mark, a diagram, or the next move on any subject.',
      tint: '#f8f6f2',
    },
    {
      status: 'Live now',
      title: 'Progress desk',
      body: ctx.targetGrade
        ? `Projected grade toward ${ctx.targetGrade}, weak topics, sprint checklist, coach inbox, full-marks models.`
        : 'Projected grade, weak topics, sprint checklist, coach inbox, full-marks models.',
      tint: '#faf8f4',
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
  const ordered = orderedSubjectLabels(ctx.subjectLabels)
  const subjectLine = ordered.length > 0 ? ordered.join(' · ') : 'your subjects'
  const allCopy = subjectLineForCopy(ordered.length ? ordered : ctx.subjectLabels)
  const boardLine = [ctx.boardLabel, ctx.levelLabel].filter(Boolean).join(' · ')
  const focus = ctx.focusLabel

  return (
    `<p style="margin:0 0 4px;font-family:${EMAIL_SERIF};font-size:17px;color:${EMAIL_INK}">Hi ${esc(ctx.greeting)},</p>` +
    `<p style="margin:0 0 14px;font-family:${EMAIL_SERIF};font-size:24px;font-weight:600;letter-spacing:-.025em;line-height:1.25;color:${EMAIL_INK}">Your Max Vault is ready for ${esc(allCopy)}.</p>` +
    `<p style="margin:0 0 18px;font-size:15.5px;line-height:1.7;color:${EMAIL_BODY}">Not a newsletter. Not a dump of PDFs. A private Max desk for <strong style="color:${EMAIL_INK}">${esc(subjectLine)}</strong>${boardLine ? ` <span style="color:${EMAIL_MUTED}">(${esc(boardLine)})</span>` : ''} — visual premium courses, Concept Cinema, exam-paper desks, <strong style="color:${EMAIL_INK}">Ask MarkScheme</strong>, and a progress desk that tracks the grade. We open on <strong style="color:${EMAIL_INK}">${esc(focus)}</strong> first; your other subjects stay one tap away.</p>` +
    careBlock(ctx.greeting, ordered.length ? ordered : ctx.subjectLabels, ctx.targetGrade) +
    `<div style="background:${EMAIL_SURFACE};border:1.5px solid ${EMAIL_BORDER};padding:16px 18px;margin:0 0 22px">
      <div style="font-family:${EMAIL_SANS};font-size:10px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:${EMAIL_MUTED};margin:0 0 10px">All subjects on this desk · ${esc(focus)} first</div>
      ${subjectPills(ordered.length ? ordered : ctx.subjectLabels)}
    </div>` +
    cinemaStageVisual(ordered.length ? ordered : ctx.subjectLabels, focus) +
    midCta(ctx.vaultHref, 'Open your Max Vault →') +
    premiumCoursesBlock({ ...ctx, subjectLabels: ordered.length ? ordered : ctx.subjectLabels }) +
    askAndProgressBlock(ctx) +
    sectionHeading('Everything waiting for you inside', 'Open the Vault and use each one — they are already yours.') +
    featureStrip({ ...ctx, subjectLabels: ordered.length ? ordered : ctx.subjectLabels }) +
    midCta(ctx.vaultHref, 'Take me to my Vault →') +
    sectionHeading('Three caring moves this week') +
    `<div style="margin-top:4px">` +
    stepHtml(
      1,
      'Open Concept Cinema, then a visual course lesson.',
      ctx.hasEconomics
        ? `Start on ${esc(focus)} (demand & supply or AD–AS), flip to Maths or Accounting, then open the matching learn-with-diagram lesson.`
        : `Open Concept Cinema for ${esc(focus)}, then jump into the visual premium course path.`
    ) +
    stepHtml(
      2,
      'Sit an exam-paper question — then Ask MarkScheme if stuck.',
      'Work a white exam slip, mark answer-only, and use Ask MarkScheme to unpack a mark comment or the next evaluation step.'
    ) +
    stepHtml(
      3,
      'Check your progress desk.',
      ctx.targetGrade
        ? `See projected grade toward ${esc(ctx.targetGrade)}, weak topics, and the sprint checklist — then return to the lessons Vault pins for you.`
        : 'See projected grade, weak topics, and the sprint checklist — then return to the lessons Vault pins for you.'
    ) +
    `</div>` +
    `<div style="margin:26px 0 0;padding:20px 18px;background:#fff;border:1.5px solid ${EMAIL_BORDER};border-left:3px solid ${EMAIL_BRAND}">
      <p style="margin:0 0 8px;font-family:${EMAIL_SERIF};font-size:16px;font-weight:600;color:${EMAIL_INK}">We are in this with you, ${esc(ctx.greeting)}.</p>
      <p style="margin:0;font-family:${EMAIL_SERIF};font-size:15px;line-height:1.65;color:${EMAIL_BODY}">Your Vault covers every subject you listed — visual courses, Cinema, exam desks, Ask MarkScheme, and progress that moves when you mark. When something feels hard, come back — you do not have to white-knuckle a topic alone.</p>
    </div>` +
    `<p style="margin:22px 0 0;font-size:15px;line-height:1.65;color:${EMAIL_INK}">With care,<br/>${esc(SITE_NAME)} Max</p>` +
    `<div style="height:1px;background:${EMAIL_HAIRLINE};margin:22px 0 0;font-size:0;line-height:0">&nbsp;</div>`
  )
}

function buildText(ctx: TourContext): string {
  const ordered = orderedSubjectLabels(ctx.subjectLabels)
  const subjectLine = ordered.length > 0 ? ordered.join(', ') : 'your subjects'
  const allCopy = subjectLineForCopy(ordered.length ? ordered : ctx.subjectLabels)
  return [
    `Hi ${ctx.greeting},`,
    '',
    `Your Max Vault is ready for ${allCopy}.`,
    '',
    `A private Max desk for ${subjectLine}${ctx.boardLabel ? ` (${ctx.boardLabel}${ctx.levelLabel ? ` · ${ctx.levelLabel}` : ''})` : ''}.`,
    `We open on ${ctx.focusLabel} first (from your recent marks) — every other subject stays one tap away.`,
    ctx.targetGrade ? `Target: ${ctx.targetGrade}.` : '',
    '',
    'We care about your grade, not just your clicks. Vault rearranges around your marks — per subject.',
    '',
    'Inside Max:',
    `- Concept Cinema — tabs for ${allCopy} (we cue ${ctx.focusLabel} first)`,
    '- Visual premium courses — syllabus lessons with live diagrams; path rebuilds from weak topics',
    '- Exam-paper question desks — one per subject; white sheet, Times font; mark answer-only',
    '- Ask MarkScheme — in-app study chat about marks, diagrams, and next steps',
    `- Progress desk — projected grade${ctx.targetGrade ? ` toward ${ctx.targetGrade}` : ''}, weak topics, sprint, coach, models`,
    ctx.hasAccounting ? '- Accounting technique links on that shelf' : '',
    '',
    'Three moves this week:',
    `1) Cinema + a visual course lesson (start on ${ctx.focusLabel})`,
    '2) Sit an exam-paper question — Ask MarkScheme if stuck',
    '3) Check your progress desk, then return to pinned lessons',
    '',
    `Visit your Max Vault: ${ctx.vaultHref}`,
    `Progress desk: ${ctx.dashboardHref}`,
    `Mark: ${ctx.markHref}`,
    `Visual courses: ${ctx.coursesHref}`,
    '',
    `With care,`,
    `${SITE_NAME} Max`,
  ]
    .filter((line) => line !== undefined && line !== '')
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
  const subjectLabels = resolveSubjects(payload.subjects, payload.level)
  return {
    greeting,
    subjectLabels,
    boardLabel: payload.board?.trim() || null,
    levelLabel: payload.level?.trim() || null,
    targetGrade: payload.targetGrade?.trim() || null,
    focusLabel: pickFocusLabel(subjectLabels),
    hasEconomics: subjectLabels.some((l) => /econ/i.test(l)),
    hasAccounting: subjectLabels.some((l) => /account/i.test(l)),
    vaultHref: `${SITE_URL}/dashboard/vault`,
    markHref: `${SITE_URL}/mark`,
    coursesHref: `${SITE_URL}/courses`,
    dashboardHref: `${SITE_URL}/dashboard`,
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
  const allCopy = subjectLineForCopy(orderedSubjectLabels(ctx.subjectLabels))
  const preheader = `${ctx.greeting} — Vault for ${allCopy}: visual courses, Cinema, Ask MarkScheme, and progress toward ${ctx.targetGrade || 'your target'}.`
  const subject =
    ctx.subjectLabels.length > 1
      ? `${ctx.greeting}, your Max Vault for ${allCopy} is ready`
      : `${ctx.greeting}, your Max Vault for ${ctx.focusLabel} is ready`

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
        { label: 'See progress', href: ctx.dashboardHref },
        { label: 'Visual courses', href: ctx.coursesHref },
        { label: 'Mark a question', href: ctx.markHref },
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
