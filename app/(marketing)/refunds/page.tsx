import Link from 'next/link'
import { getPageMetadata } from '@/lib/seo/page-meta'
import { CONTACT_EMAIL } from '@/lib/site-config'
import { LegalDisclaimer, MarketingPageShell } from '@/components/marketing/MarketingPageShell'

export const metadata = getPageMetadata('/refunds')

export default function RefundsPage() {
  return (
    <MarketingPageShell narrow className="ms-legal-page">
      <article className="ms-pg ms-content-hero py-16 sm:py-20">
        <p className="ms-overline">Legal</p>
        <h1 className="ms-h2" style={{ fontSize: 'clamp(36px, 5vw, 48px)' }}>
          Refund &amp; Cancellation Policy
        </h1>
        <LegalDisclaimer />
        <div className="prose prose-sm max-w-none space-y-6 text-[var(--ec-text-secondary)] prose-headings:text-[var(--ec-text-primary)] prose-a:text-[var(--ec-brand)] prose-strong:text-[var(--ec-text-primary)]">
          <p className="text-sm">Last updated: June 2026</p>

          <section>
            <h2 className="ms-h3">Try before you pay</h2>
            <p>
              New accounts include a{' '}
              <strong className="text-[var(--ec-text-primary)]">7-day free trial with full access and no card required</strong>.
              You will not be charged during the trial. If you do nothing, your account
              simply moves to the free plan — there is no automatic charge to refund.
              In addition, your{' '}
              <strong className="text-[var(--ec-text-primary)]">first paid subscription starts with its own 7-day free trial</strong>:
              a card is collected at checkout but nothing is charged until the trial
              ends, and cancelling before then costs nothing. We recommend using these
              trials to decide whether MarkScheme is right for you before paying.
            </p>
          </section>

          <section>
            <h2 className="ms-h3">Subscriptions and billing</h2>
            <p>
              Paid plans are billed through{' '}
              <strong className="text-[var(--ec-text-primary)]">Polar</strong>, our payment
              provider and merchant of record, on a monthly or yearly basis depending on
              the plan you choose. Polar handles card processing, receipts and any
              applicable sales tax or VAT.
              Subscriptions renew automatically at the end of each billing period until
              you cancel. Current prices are shown on our{' '}
              <Link href="/pricing">pricing page</Link>.
            </p>
          </section>

          <section>
            <h2 className="ms-h3">Cancelling your subscription</h2>
            <ul className="list-disc space-y-2 pl-5">
              <li>You can cancel at any time from your account billing settings, or by emailing us.</li>
              <li>
                When you cancel, you keep access until the end of the billing period you have
                already paid for — we do not cut off access immediately.
              </li>
              <li>After that date your plan stops renewing and you are not charged again.</li>
              <li>Cancelling stops future payments; it is not by itself a request for a refund of a payment already made (see below).</li>
            </ul>
          </section>

          <section>
            <h2 className="ms-h3">14-day cooling-off period</h2>
            <p>
              If you are a consumer in the UK, EU, or another region with equivalent
              consumer-protection law, you may have the right to cancel a purchase within{' '}
              <strong className="text-[var(--ec-text-primary)]">14 days</strong> of subscribing
              and receive a refund. Because MarkScheme is digital content delivered
              immediately, by starting to use a paid feature you ask us to begin the
              service during this period and acknowledge that your statutory right to
              cancel may be reduced or lost once the service has been fully performed.
              Where the cooling-off right applies, email us within 14 days and we will
              process the refund.
            </p>
          </section>

          <section>
            <h2 className="ms-h3">Our goodwill refund promise</h2>
            <p>Beyond your statutory rights, we want you to feel safe paying:</p>
            <ul className="list-disc space-y-2 pl-5">
              <li>
                <strong className="text-[var(--ec-text-primary)]">Monthly plans</strong> — if
                you are unhappy within 14 days of your first payment and have made little or
                no use of paid features, email us and we will refund that payment.
              </li>
              <li>
                <strong className="text-[var(--ec-text-primary)]">Yearly plans</strong> — if you
                cancel within 14 days of purchase, we will refund in full. After 14 days we may
                offer a pro-rata refund for the unused, whole months remaining at our
                discretion, less any period already used.
              </li>
              <li>
                <strong className="text-[var(--ec-text-primary)]">Billing mistakes</strong> —
                duplicate charges, charges after a confirmed cancellation, or amounts that do
                not match the plan you chose are always refunded in full.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="ms-h3">What is not normally refundable</h2>
            <ul className="list-disc space-y-2 pl-5">
              <li>Periods you have already used substantially during the billing term.</li>
              <li>Renewals you forgot to cancel before the renewal date, beyond the goodwill window above (though we will always consider these case by case).</li>
              <li>Accounts terminated for breaching our <Link href="/terms">Terms of Service</Link> (e.g. fraud or abuse).</li>
            </ul>
            <p className="mt-4">
              MarkScheme is a study companion, not a guarantee of any exam grade. Not
              achieving a particular result is not grounds for a refund.
            </p>
          </section>

          <section>
            <h2 className="ms-h3">How to request a refund</h2>
            <p>
              Email{' '}
              <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a> from the address on
              your account, with the date of the charge and a short reason. We aim to
              respond within a few business days. Approved refunds are returned to your
              original payment method via Polar and typically appear within 5–10 business
              days, depending on your bank.
            </p>
            <p>
              Please contact us before opening a card chargeback — we can almost always
              resolve billing issues faster and more cheaply than your bank can.
            </p>
          </section>

          <section>
            <h2 className="ms-h3">Price changes</h2>
            <p>
              We may change prices for new subscriptions or future renewals with advance
              notice. Changes never apply retroactively to a period you have already paid
              for. See our <Link href="/terms">Terms of Service</Link> for more.
            </p>
          </section>

          <section>
            <h2 className="ms-h3">Contact</h2>
            <p>
              Questions about billing or refunds? Email{' '}
              <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a> or visit our{' '}
              <Link href="/contact">contact page</Link>.
            </p>
          </section>
        </div>
      </article>
    </MarketingPageShell>
  )
}
