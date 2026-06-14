import { CONTACT_EMAIL, SITE_NAME, SITE_URL } from '@/lib/site-config'

export type EmailContent = {
  subject: string
  text: string
  preheader?: string
}

export function renderBrandedEmailHtml(payload: {
  preheader?: string
  bodyHtml: string
  cta?: { label: string; href: string }
}): string {
  const preheader = payload.preheader
    ? `<span style="display:none;max-height:0;overflow:hidden">${escapeHtml(payload.preheader)}</span>`
    : ''

  const cta = payload.cta
    ? `<p style="margin:28px 0 0"><a href="${escapeAttr(payload.cta.href)}" style="display:inline-block;background:#9f1239;color:#fff;text-decoration:none;font-weight:600;padding:12px 20px;border-radius:10px">${escapeHtml(payload.cta.label)}</a></p>`
    : ''

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f6f4f0;font-family:system-ui,-apple-system,sans-serif;color:#1a1a1a">
${preheader}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f6f4f0;padding:32px 16px">
<tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#fff;border:1px solid #e8e4dc;border-radius:16px;overflow:hidden">
<tr><td style="padding:24px 28px 8px;font-family:Georgia,'Times New Roman',serif;font-size:22px;font-weight:600;color:#1a1a1a">
${escapeHtml(SITE_NAME)}<span style="color:#9f1239">.</span>
</td></tr>
<tr><td style="padding:8px 28px 28px;font-size:15px;line-height:1.6;color:#333">
${payload.bodyHtml}
${cta}
<p style="margin:28px 0 0;padding-top:20px;border-top:1px solid #eee;font-size:13px;color:#666">
Questions? Reply to this email or write to <a href="mailto:${escapeAttr(CONTACT_EMAIL)}" style="color:#9f1239">${escapeHtml(CONTACT_EMAIL)}</a>.
</p>
</td></tr>
</table>
<p style="margin:16px 0 0;font-size:12px;color:#888"><a href="${escapeAttr(SITE_URL)}" style="color:#888">${escapeHtml(SITE_URL)}</a></p>
</td></tr>
</table>
</body></html>`
}

export function textToHtmlParagraphs(text: string): string {
  return text
    .split('\n')
    .map((line) => {
      const trimmed = line.trim()
      if (!trimmed) return '<br>'
      return `<p style="margin:0 0 12px">${escapeHtml(trimmed)}</p>`
    })
    .join('')
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function escapeAttr(value: string): string {
  return escapeHtml(value)
}
