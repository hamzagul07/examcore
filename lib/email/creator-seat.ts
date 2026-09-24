import { adminNotifyAddress, sendEmail, sendEmailAsync } from '@/lib/email/send'
import { SITE_NAME, SITE_URL } from '@/lib/site-config'

/** A creator applied in-product; the founder reviews it in /admin/creators. */
export function notifyAdminCreatorApplication(payload: {
  accountEmail: string | null
  handleWanted: string
  displayName: string
  tiktok: string | null
  instagram: string | null
  youtube: string | null
  exams: string | null
  audienceSize: string | null
  isAdult: boolean
  message: string | null
}): void {
  sendEmailAsync({
    to: adminNotifyAddress(),
    replyTo: payload.accountEmail ?? undefined,
    subject: `[${SITE_NAME}] Creator application — @${payload.handleWanted}`,
    text: [
      'Someone asked for a creator space.',
      '',
      `Account:   ${payload.accountEmail ?? '(unknown)'}`,
      `Handle:    @${payload.handleWanted}`,
      `Name:      ${payload.displayName}`,
      `TikTok:    ${payload.tiktok ?? '—'}`,
      `Instagram: ${payload.instagram ?? '—'}`,
      `YouTube:   ${payload.youtube ?? '—'}`,
      `Exams:     ${payload.exams ?? '—'}`,
      `Audience:  ${payload.audienceSize ?? '—'}`,
      `18 or over (self-declared): ${payload.isAdult ? 'yes' : 'no'}`,
      '',
      payload.message ? `Message:\n${payload.message}\n` : '',
      'Look at the channels before approving. Review here:',
      `  ${SITE_URL}/admin/creators`,
    ].join('\n'),
  })
}

/** The seat is on — awaited, so an approval from the CLI lands before the process exits. */
export async function sendCreatorSeatApprovedEmail(payload: {
  email: string
  handle: string
  code: string
  giftMarks: number
}): Promise<boolean> {
  const space = `${SITE_URL}/with/${payload.handle}`
  return sendEmail({
    to: payload.email,
    subject: `Your ${SITE_NAME} creator space is live — code ${payload.code}`,
    preheader: `${space} · your followers get ${payload.giftMarks} free marks with ${payload.code}.`,
    text: [
      `Your creator space is live: ${space}`,
      '',
      `Your code is ${payload.code}. Say it in a video or put it in your bio: a follower who uses it gets ` +
        `${payload.giftMarks} free marks when they sign up, and every answer they get marked counts for you.`,
      '',
      'Your studio has the share kit (bio line, pinned comment, caption — the #ad is already in), a ' +
        'share card, and the live count. Once 50 answers are in you get the one mark most of your ' +
        'followers drop, which is your next video.',
      '',
      'Two rules: you only ever see aggregates, never a script; and every post that mentions ' +
        'MarkScheme carries #ad, because the seat is a gift.',
    ].join('\n'),
    cta: { label: 'Open your studio', href: `${SITE_URL}/creator` },
  })
}
