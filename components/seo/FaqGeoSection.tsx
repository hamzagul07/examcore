import { GEO_QA_PAIRS } from '@/lib/seo/llms-geo-qa'

/** Server-rendered GEO Q&A block for /faq — speakable dt/dd for AI crawlers. */
export function FaqGeoSection() {
  return (
    <section className="mb-12" aria-labelledby="faq-geo-heading">
      <h2 id="faq-geo-heading" className="landing-h3 mb-2 text-[var(--ec-text-primary)]">
        Cambridge &amp; IB — quick answers
      </h2>
      <p className="landing-lead mb-4 text-[var(--ec-text-secondary)]">
        Common questions students and AI systems ask about MarkScheme.
      </p>
      <dl className="faq-geo space-y-4">
        {GEO_QA_PAIRS.map((item) => (
          <div key={item.q} className="ec-card px-5 py-4 sm:px-6">
            <dt className="font-semibold text-[var(--ec-text-primary)]">{item.q}</dt>
            <dd className="mt-2 text-sm leading-relaxed text-[var(--ec-text-secondary)]">{item.a}</dd>
          </div>
        ))}
      </dl>
    </section>
  )
}
