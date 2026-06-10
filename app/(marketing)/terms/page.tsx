import Link from 'next/link'
import { getPageMetadata } from '@/lib/seo/page-meta'
import { CONTACT_EMAIL } from '@/lib/site-config'
import { LegalDisclaimer, MarketingPageShell } from '@/components/marketing/MarketingPageShell'

export const metadata = getPageMetadata('/terms')

export default function TermsPage() {
  return (
    <MarketingPageShell narrow>
      <article className="ms-pg ms-content-hero py-16 sm:py-20">
        <p className="ms-overline">Legal</p>
        <h1 className="ms-h2" style={{ fontSize: 'clamp(36px, 5vw, 48px)' }}>
          Terms of Service
        </h1>
        <LegalDisclaimer />
        <div className="prose prose-sm max-w-none space-y-6 text-[var(--ec-text-secondary)] prose-headings:text-[var(--ec-text-primary)] prose-a:text-[var(--ec-brand)] prose-strong:text-[var(--ec-text-primary)]">
          <p className="text-sm">Last updated: May 2026</p>

          <section>
            <h2 className="ms-h3">What MarkScheme is</h2>
            <p>
              MarkScheme is an AI-assisted marking tool for Cambridge A-Level
              self-study. It helps you check past-paper answers against official
              mark schemes. It is not a tutoring agency, exam board, or
              replacement for qualified teachers or Cambridge examiners.
            </p>
          </section>

          <section>
            <h2 className="ms-h3">Acceptable use</h2>
            <ul className="list-disc space-y-2 pl-5">
              <li>Use MarkScheme to mark your own revision work or work you have permission to upload.</li>
              <li>Do not upload content you do not have the right to use.</li>
              <li>Do not attempt to break, scrape, or overload the service.</li>
              <li>Do not redistribute marking outputs as if they were official Cambridge grades.</li>
              <li>Do not use MarkScheme for cheating in live assessments or coursework submitted as solely your own work without disclosure where required.</li>
            </ul>
          </section>

          <section>
            <h2 className="ms-h3">AI limitations</h2>
            <p>
              AI marking is not perfect. MarkScheme provides feedback based on
              Cambridge mark schemes, but errors happen. Use it as a{' '}
              <strong className="text-[var(--ec-text-primary)]">study companion</strong>, not
              a final grade. Final grades are determined by Cambridge
              International examiners, not MarkScheme.
            </p>
            <p>
              We do not guarantee that feedback will match what a human examiner
              would award in a live exam.
            </p>
          </section>

          <section>
            <h2 className="ms-h3">Accounts</h2>
            <p>
              You are responsible for keeping your login credentials secure. You
              must provide accurate information when signing up. One person per
              account unless we agree otherwise (e.g. teacher accounts).
            </p>
          </section>

          <section>
            <h2 className="ms-h3">Suspension</h2>
            <p>
              We may suspend or terminate accounts that violate these terms,
              abuse the service, attempt fraud, or harm other users. We will
              try to give notice where reasonable, but may act immediately for
              serious abuse.
            </p>
          </section>

          <section>
            <h2 className="ms-h3">Intellectual property</h2>
            <p>
              Cambridge subject codes, syllabus references, and mark schemes
              are property of Cambridge Assessment International Education, used
              here for educational purposes. MarkScheme is not affiliated with or
              endorsed by Cambridge International.
            </p>
            <p>
              You retain ownership of work you upload. You grant us a licence to
              process it solely to provide marking and related features.
            </p>
          </section>

          <section>
            <h2 className="ms-h3">Disclaimer of warranties</h2>
            <p>
              MarkScheme is provided &quot;as is&quot; during early access. We do not
              warrant uninterrupted service, error-free marking, or fitness for
              a particular purpose. To the fullest extent permitted by law, we
              disclaim implied warranties.
            </p>
          </section>

          <section>
            <h2 className="ms-h3">Limitation of liability</h2>
            <p>
              To the fullest extent permitted by law, MarkScheme and its operators
              are not liable for indirect, incidental, or consequential damages
              arising from your use of the service, including reliance on AI
              marking for exam preparation decisions.
            </p>
          </section>

          <section>
            <h2 className="ms-h3">Pricing changes</h2>
            <p>
              Early access is currently free. We may introduce paid plans later
              with advance notice. Founding members who join during early access
              may receive discounts as described on our{' '}
              <Link href="/pricing">pricing page</Link>.
            </p>
          </section>

          <section>
            <h2 className="ms-h3">Changes to terms</h2>
            <p>
              We may update these terms. Continued use after changes constitutes
              acceptance. Material changes will be posted on this page.
            </p>
          </section>

          <section>
            <h2 className="ms-h3">Governing law</h2>
            <p>
              These terms are intended to be governed by the laws of England
              and Wales, unless local consumer protection laws require
              otherwise. If you need a different governing law for your
              jurisdiction, contact us before relying on these terms for
              compliance purposes.
            </p>
          </section>

          <section>
            <h2 className="ms-h3">Contact</h2>
            <p>
              Questions about these terms? Email{' '}
              <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
            </p>
          </section>
        </div>
      </article>
    </MarketingPageShell>
  )
}
