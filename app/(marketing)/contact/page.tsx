import { createPageMetadata } from '@/lib/seo/metadata'
import { CONTACT_EMAIL } from '@/lib/site-config'
import { MarketingHero, MarketingPageShell, MarketingSection } from '@/components/marketing/MarketingPageShell'

export const metadata = createPageMetadata({
  title: 'Contact',
  description:
    'Get in touch with the Examcore team — feedback, questions, and support during early access.',
  path: '/contact',
})

export default function ContactPage() {
  return (
    <MarketingPageShell narrow>
      <MarketingHero
        label="CONTACT"
        title={<span className="gradient-text">Get in touch</span>}
        lead="Questions, feedback, or something broken? We'd like to hear from you."
      />

      <div className="space-y-8">
        <div className="ec-card p-6 sm:p-8">
          <p className="ec-label-tech mb-3">EMAIL</p>
          <a
            href={`mailto:${CONTACT_EMAIL}`}
            className="text-xl font-semibold text-emerald-400 transition-colors hover:text-emerald-300"
          >
            {CONTACT_EMAIL}
          </a>
          <p className="mt-4 text-sm leading-relaxed text-[var(--ec-text-secondary)]">
            We usually reply within 24–48 hours during early access.
          </p>
        </div>

        <div className="ec-card p-6 sm:p-8">
          <p className="ec-label-tech mb-4">SEND A MESSAGE</p>
          <form
            action={`mailto:${CONTACT_EMAIL}`}
            method="GET"
            encType="text/plain"
            className="space-y-4"
          >
            <div>
              <label htmlFor="name" className="label-overline mb-2 block">
                Name
              </label>
              <input
                id="name"
                name="subject"
                type="text"
                placeholder="Your name"
                className="ec-input"
              />
            </div>
            <div>
              <label htmlFor="email" className="label-overline mb-2 block">
                Email
              </label>
              <input
                id="email"
                name="body"
                type="email"
                placeholder="you@example.com"
                className="ec-input"
              />
            </div>
            <div>
              <label htmlFor="message" className="label-overline mb-2 block">
                Message
              </label>
              <textarea
                id="message"
                name="body"
                rows={5}
                placeholder="How can we help?"
                className="ec-input min-h-[120px] resize-y"
              />
            </div>
            <button type="submit" className="ec-btn-primary w-full min-h-[48px] justify-center">
              Open in email app
            </button>
          </form>
          <p className="mt-4 text-xs text-[var(--ec-text-secondary)]">
            This opens your default email client. A built-in contact form may
            arrive in a future update.
          </p>
        </div>

        <p className="text-center text-sm text-[var(--ec-text-secondary)]">
          Twitter/X: not set up yet — follow-up if you want a public handle listed here.
        </p>
      </div>
    </MarketingPageShell>
  )
}
