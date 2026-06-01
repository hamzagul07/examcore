import Link from 'next/link'
import { createPageMetadata } from '@/lib/seo/metadata'
import { CONTACT_EMAIL } from '@/lib/site-config'
import { LegalDisclaimer, MarketingPageShell } from '@/components/marketing/MarketingPageShell'

export const metadata = createPageMetadata({
  title: 'Privacy Policy',
  description:
    'How Examcore collects, uses, and protects your data — account info, uploads, and marking history.',
  path: '/privacy',
})

export default function PrivacyPage() {
  return (
    <MarketingPageShell narrow>
      <article className="py-16 sm:py-20">
        <p className="ec-label-tech mb-4">LEGAL</p>
        <h1 className="text-display mb-6 text-[var(--ec-text-primary)]">
          Privacy Policy
        </h1>
        <LegalDisclaimer />
        <div className="prose prose-sm max-w-none space-y-6 text-[var(--ec-text-secondary)] prose-headings:text-[var(--ec-text-primary)] prose-a:text-[var(--ec-brand)] prose-strong:text-[var(--ec-text-primary)]">
          <p className="text-sm">Last updated: May 2026</p>

          <section>
            <h2 className="landing-h3">Who we are</h2>
            <p>
              Examcore (&quot;we&quot;, &quot;us&quot;) provides an AI-assisted marking
              tool for Cambridge A-Level students at{' '}
              <Link href="/">examcore.ai</Link>. This policy explains what data we
              collect and how we use it during early access.
            </p>
          </section>

          <section>
            <h2 className="landing-h3">What we collect</h2>
            <ul className="list-disc space-y-2 pl-5">
              <li>
                <strong className="text-[var(--ec-text-primary)]">Account information</strong> — email address, password (hashed by our auth provider), and profile details you provide (name, subjects, exam board).
              </li>
              <li>
                <strong className="text-[var(--ec-text-primary)]">Uploaded work</strong> — photos, PDFs, and images of your handwritten or typed answers that you submit for marking.
              </li>
              <li>
                <strong className="text-[var(--ec-text-primary)]">Marking history</strong> — scores, feedback, syllabus tags, and metadata about each marking attempt.
              </li>
              <li>
                <strong className="text-[var(--ec-text-primary)]">Usage data</strong> — basic logs (pages visited, errors, approximate location from IP) to keep the service running and secure.
              </li>
              <li>
                <strong className="text-[var(--ec-text-primary)]">Communications</strong> — emails you send us and messages you exchange with Omni AI within the product.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="landing-h3">How we use your data</h2>
            <ul className="list-disc space-y-2 pl-5">
              <li>To mark your work and show you feedback tied to Cambridge mark schemes.</li>
              <li>To maintain your account, mastery tracking, and attempt history.</li>
              <li>To improve the product — fixing bugs, understanding which features help students.</li>
              <li>To communicate with you about your account, early access, or future pricing changes.</li>
            </ul>
            <p className="mt-4">
              We do not sell your personal data. We do not use your uploads for
              public display without your consent.
            </p>
          </section>

          <section>
            <h2 className="landing-h3">Third-party services</h2>
            <p>We rely on trusted providers to run Examcore:</p>
            <ul className="list-disc space-y-2 pl-5">
              <li><strong className="text-[var(--ec-text-primary)]">Supabase</strong> — authentication, database, and file storage.</li>
              <li><strong className="text-[var(--ec-text-primary)]">Anthropic</strong> — AI marking and Omni AI conversational features.</li>
              <li><strong className="text-[var(--ec-text-primary)]">Google (Gemini)</strong> — document extraction and OCR for uploaded scripts.</li>
              <li><strong className="text-[var(--ec-text-primary)]">Vercel</strong> — website hosting and infrastructure.</li>
            </ul>
            <p className="mt-4">
              These providers process data on our behalf under their own privacy
              policies and data-processing terms.
            </p>
          </section>

          <section>
            <h2 className="landing-h3">How long we keep data</h2>
            <p>
              We keep your account and marking history while your account is
              active. If you delete your account or ask us to remove your data,
              we will delete or anonymise it within a reasonable period, except
              where we must retain records for legal or security reasons.
            </p>
          </section>

          <section>
            <h2 className="landing-h3">Your rights</h2>
            <p>Depending on where you live, you may have the right to:</p>
            <ul className="list-disc space-y-2 pl-5">
              <li>Access a copy of the personal data we hold about you.</li>
              <li>Correct inaccurate information.</li>
              <li>Request deletion of your account and associated uploads.</li>
              <li>Object to or restrict certain processing.</li>
              <li>Export your data in a portable format (on request).</li>
            </ul>
            <p className="mt-4">
              To exercise these rights, email{' '}
              <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>. We will
              respond within a reasonable time.
            </p>
          </section>

          <section>
            <h2 className="landing-h3">Children</h2>
            <p>
              Examcore is aimed at A-Level students, who are typically 16–19.
              If you are under 16, please use Examcore with a parent or
              guardian&apos;s knowledge. We do not knowingly collect data from
              children under 13.
            </p>
          </section>

          <section>
            <h2 className="landing-h3">Changes</h2>
            <p>
              We may update this policy as the product grows. Material changes
              will be posted on this page with an updated date. Continued use
              after changes means you accept the revised policy.
            </p>
          </section>

          <section>
            <h2 className="landing-h3">Contact</h2>
            <p>
              Questions about privacy? Email{' '}
              <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a> or visit
              our <Link href="/contact">contact page</Link>.
            </p>
          </section>
        </div>
      </article>
    </MarketingPageShell>
  )
}
