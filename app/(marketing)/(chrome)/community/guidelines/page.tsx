import Link from 'next/link'
import { getPageMetadata } from '@/lib/seo/page-meta'
import { CONTACT_EMAIL } from '@/lib/site-config'
import { LegalDisclaimer, MarketingPageShell } from '@/components/marketing/MarketingPageShell'

export const metadata = getPageMetadata('/community/guidelines')

export default function CommunityGuidelinesPage() {
  return (
    <MarketingPageShell narrow className="ms-legal-page">
      <article className="ms-pg ms-content-hero py-16 sm:py-20">
        <p className="ms-overline">Community</p>
        <h1 className="ms-h2" style={{ fontSize: 'clamp(36px, 5vw, 48px)' }}>
          Community guidelines
        </h1>
        <LegalDisclaimer />
        <div className="prose prose-sm max-w-none space-y-6 text-[var(--ec-text-secondary)] prose-headings:text-[var(--ec-text-primary)] prose-a:text-[var(--ec-brand)] prose-strong:text-[var(--ec-text-primary)]">
          <p className="text-sm">Last updated: June 2026</p>

          <section>
            <h2 className="ms-h3">The short version</h2>
            <p>
              MarkScheme&apos;s community notes and Q&amp;A exist to help students learn. Be helpful, be
              honest, and be kind. Everything is public, checked automatically, and can be reported.
            </p>
          </section>

          <section>
            <h2 className="ms-h3">Do</h2>
            <ul className="list-disc space-y-2 pl-5">
              <li>Share your own notes, explanations, and answers in your own words.</li>
              <li>Ask clear, on-topic questions about your subject.</li>
              <li>Upvote genuinely helpful contributions and accept the answer that solved your question.</li>
              <li>Credit sources when you build on someone else&apos;s work.</li>
            </ul>
          </section>

          <section>
            <h2 className="ms-h3">Don&apos;t</h2>
            <ul className="list-disc space-y-2 pl-5">
              <li>Post spam, advertising, or links unrelated to studying.</li>
              <li>Harass, bully, or post hateful, sexual, or otherwise inappropriate content.</li>
              <li>Share personal contact details or ask others for theirs.</li>
              <li>Copy and paste copyrighted material (e.g. whole textbook pages or official mark schemes) — share your own notes instead.</li>
              <li>Post during a live exam or help anyone cheat in assessed work.</li>
            </ul>
          </section>

          <section>
            <h2 className="ms-h3">How moderation works</h2>
            <p>
              New posts are screened automatically before they appear. Anyone can report a post; content
              with multiple reports is hidden for a moderator to review. We may remove content or suspend
              accounts that break these guidelines or our <Link href="/terms">Terms of Service</Link>.
            </p>
          </section>

          <section>
            <h2 className="ms-h3">Your content</h2>
            <p>
              You keep ownership of what you post, and grant MarkScheme a licence to display it within the
              service. You can ask us to remove your contributions at any time — email{' '}
              <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>. See our{' '}
              <Link href="/privacy">Privacy Policy</Link> for how we handle your data.
            </p>
          </section>

          <section>
            <h2 className="ms-h3">Reporting</h2>
            <p>
              Use the <strong>Report</strong> button on any note or answer, or email{' '}
              <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a> for anything urgent. If you&apos;re a
              student in distress, please also reach out to a trusted adult or a local support service.
            </p>
          </section>
        </div>
      </article>
    </MarketingPageShell>
  )
}
