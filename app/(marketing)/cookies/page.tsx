import Link from 'next/link'
import { getPageMetadata } from '@/lib/seo/page-meta'
import { CONTACT_EMAIL } from '@/lib/site-config'
import { LegalDisclaimer, MarketingPageShell } from '@/components/marketing/MarketingPageShell'

export const metadata = getPageMetadata('/cookies')

export default function CookiesPage() {
  return (
    <MarketingPageShell narrow className="ms-legal-page">
      <article className="ms-pg ms-content-hero py-16 sm:py-20">
        <p className="ms-overline">Legal</p>
        <h1 className="ms-h2" style={{ fontSize: 'clamp(36px, 5vw, 48px)' }}>
          Cookie Policy
        </h1>
        <LegalDisclaimer />
        <div className="prose prose-sm max-w-none space-y-6 text-[var(--ec-text-secondary)] prose-headings:text-[var(--ec-text-primary)] prose-a:text-[var(--ec-brand)] prose-strong:text-[var(--ec-text-primary)]">
          <p className="text-sm">Last updated: June 2026</p>

          <section>
            <h2 className="ms-h3">What cookies are</h2>
            <p>
              Cookies are small text files stored on your device when you visit a website.
              Similar technologies — such as <code>localStorage</code> — let a site remember
              information in your browser. MarkScheme uses a deliberately small set of these,
              mainly to keep you signed in and to remember your preferences.
            </p>
          </section>

          <section>
            <h2 className="ms-h3">How we use them</h2>
            <ul className="list-disc space-y-2 pl-5">
              <li>
                <strong className="text-[var(--ec-text-primary)]">Essential / authentication</strong> —
                to sign you in and keep your session secure (set by our authentication
                provider, Supabase). The site cannot work without these.
              </li>
              <li>
                <strong className="text-[var(--ec-text-primary)]">Preferences</strong> — to
                remember choices such as your theme (light/dark) and exam board, stored in your
                browser&apos;s <code>localStorage</code> so the app looks the way you left it.
                We also store when you dismiss the optional blog signup popup (
                <code>markscheme_blog_signup_dismissed</code>) so we do not show it again for
                seven days.
              </li>
              <li>
                <strong className="text-[var(--ec-text-primary)]">Local progress</strong> — to
                save course progress and recent activity on your device when you are not signed
                in, so you do not lose your place.
              </li>
              <li>
                <strong className="text-[var(--ec-text-primary)]">Basic analytics &amp; security</strong> —
                limited, privacy-respecting measurement of page performance and error
                monitoring to keep the service fast and reliable. We do not use cookies to
                build advertising profiles or sell your data.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="ms-h3">What we do not do</h2>
            <p>
              We do not run third-party advertising trackers, and we do not sell or share
              cookie data with advertisers. We do not use cookies to follow you across
              unrelated websites.
            </p>
          </section>

          <section>
            <h2 className="ms-h3">Third-party providers</h2>
            <p>
              Some cookies and storage are set by the trusted providers that run MarkScheme —
              for example <strong className="text-[var(--ec-text-primary)]">Supabase</strong>{' '}
              (authentication), <strong className="text-[var(--ec-text-primary)]">Stripe</strong>{' '}
              (payments and fraud prevention on checkout), and{' '}
              <strong className="text-[var(--ec-text-primary)]">Vercel</strong> (hosting). These
              are used to deliver the service and are described further in our{' '}
              <Link href="/privacy">Privacy Policy</Link>.
            </p>
          </section>

          <section>
            <h2 className="ms-h3">Managing cookies</h2>
            <p>
              You can control or delete cookies through your browser settings, and clear
              <code> localStorage</code> from the same controls. Blocking essential cookies
              will stop you from signing in or using your account. Clearing preference or
              progress storage will reset your theme and any locally-saved progress, but will
              not delete data already saved to your account.
            </p>
          </section>

          <section>
            <h2 className="ms-h3">Changes</h2>
            <p>
              We may update this policy as the product evolves. Material changes will be
              posted here with a new date.
            </p>
          </section>

          <section>
            <h2 className="ms-h3">Contact</h2>
            <p>
              Questions about cookies? Email{' '}
              <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a> or read our{' '}
              <Link href="/privacy">Privacy Policy</Link>.
            </p>
          </section>
        </div>
      </article>
    </MarketingPageShell>
  )
}
