import Link from 'next/link'
import type { Metadata } from 'next'

import { CONTACT_EMAIL, SITE_NAME } from '@/lib/site-config'
import { getPageMetadata } from '@/lib/seo/page-meta'
import { DEFAULT_BLOG_AUTHOR } from '@/lib/seo/authors'
import { getFounderSameAs } from '@/lib/seo/entity'
import { FOUNDER_AT_A_GLANCE, FOUNDER_FAQ } from '@/lib/seo/founder-faq'
import {
  breadcrumbList,
  faqPageNode,
  organizationNode,
  personNode,
  profilePageNode,
  websiteNode,
} from '@/lib/seo/structured-data'
import { JsonLd } from '@/components/seo/JsonLd'
import { MarketingHero, MarketingPageShell, MarketingSection } from '@/components/marketing/MarketingPageShell'

const PATH = '/hamza-gul-hassan'
const founder = DEFAULT_BLOG_AUTHOR

/**
 * The one page on the site that is about a person rather than the product.
 *
 * It exists so that a search for the founder's name resolves to one canonical
 * URL carrying the full name in the title, the H1, the URL and a ProfilePage +
 * Person schema that Organization.founder and every blog byline already point
 * at. The title bypasses the "— MarkScheme" template on purpose: the phrase
 * search engines should show is "Founder & CEO of MarkScheme", not a doubled
 * brand suffix.
 */
export const metadata: Metadata = {
  ...getPageMetadata(PATH),
  title: { absolute: `${founder.name} — ${founder.role} of ${SITE_NAME}` },
}

const TIMELINE = [
  { when: 'Late 2024', what: 'Marked his own mocks with a green pen and a PDF mark scheme. It took longer than the paper.' },
  { when: 'Early 2025', what: 'First prototype: one subject (9709), one paper, his own handwriting. It caught a method mark he had missed.' },
  { when: 'Mid 2025', what: 'Examiner’s Ink: stamps on the actual script instead of a text report.' },
  { when: '2026', what: 'Cambridge, IB and Edexcel marking, whole-paper marking, free syllabus courses, and Exam Room communities.' },
]

function profileLabel(url: string): string {
  const host = new URL(url).hostname.replace(/^www\./, '')
  if (host.includes('linkedin')) return 'LinkedIn'
  if (host.includes('github')) return 'GitHub'
  if (host.includes('twitter') || host === 'x.com') return 'X'
  return host
}

export default function FounderPage() {
  const profiles = getFounderSameAs()

  return (
    <MarketingPageShell>
      <JsonLd
        data={[
          organizationNode(),
          websiteNode(),
          profilePageNode(founder),
          personNode(founder),
          faqPageNode(FOUNDER_FAQ, { speakableSelectors: ['#founder-faq'] }),
          breadcrumbList([
            { name: 'Home', path: '/' },
            { name: 'About', path: '/about' },
            { name: founder.name, path: PATH },
          ]),
        ]}
      />
      <MarketingHero
        label={`${founder.role}, ${SITE_NAME}`}
        title={<>{founder.name}</>}
        lead={`${founder.name} is the founder and CEO of ${SITE_NAME}, the second-pass marking platform for Cambridge International and IB past papers. He started building it as a Cambridge A-Level student who wanted examiner-grade feedback on his own work.`}
      />

      <MarketingSection className="!pt-0">
        <div className="mx-auto max-w-3xl">
          <section className="ms-sec-tight" aria-labelledby="founder-glance">
            <p className="ms-overline">At a glance</p>
            <h2 id="founder-glance" className="sr-only">
              {founder.name} at a glance
            </h2>
            <dl className="ms-dash-card grid gap-x-6 gap-y-3 sm:grid-cols-[max-content_1fr]">
              {FOUNDER_AT_A_GLANCE.map((row) => (
                <div key={row.term} className="contents">
                  <dt className="ms-micro" style={{ fontWeight: 600 }}>
                    {row.term.toUpperCase()}
                  </dt>
                  <dd className="ms-body-2 m-0">{row.value}</dd>
                </div>
              ))}
            </dl>
          </section>

          <section className="ms-sec-tight" aria-labelledby="founder-about">
            <p className="ms-overline">Who he is</p>
            <h2 id="founder-about" className="ms-h3">
              Founder and CEO of {SITE_NAME}
            </h2>
            <p className="ms-body-2" style={{ marginTop: 10, fontSize: 16 }}>
              Hamza Gul Hassan founded {SITE_NAME} after marking his own mock papers by hand and
              finding that the marking took longer than the paper. The idea was simple: a student
              revising alone at midnight should be able to see their handwritten answer marked the way
              a Cambridge examiner marks it, against the official scheme, mark by mark, on the script
              itself. He built the first version for his own subjects, then opened it to other
              students.
            </p>
            <p className="ms-body-2" style={{ marginTop: 10, fontSize: 16 }}>
              As founder and CEO he runs the product end to end: the marking pipeline that reads
              handwriting and applies real Cambridge mark schemes and IB markbands, the free syllabus
              courses, the Exam Room student community, and most of the writing on the{' '}
              <Link href="/blog" className="ec-link font-medium">
                blog
              </Link>
              , which he writes from real revision sessions rather than generic filler.
            </p>
          </section>

          <section className="ms-sec-tight" aria-labelledby="founder-building">
            <p className="ms-overline">What he is building</p>
            <h2 id="founder-building" className="ms-h3">
              {SITE_NAME}
            </h2>
            <p className="ms-body-2" style={{ marginTop: 10 }}>
              {SITE_NAME} marks handwritten past-paper answers for Cambridge International (A-Level,
              O-Level, IGCSE), IB Diploma and Edexcel International A-Level students against the
              official mark schemes and markbands, and shows the result as examiner&apos;s ink on the
              student&apos;s own page. Around it sit free courses for every syllabus it marks and a
              community where students discuss questions with each other.
            </p>
            <div className="mt-6 grid gap-4 sm:grid-cols-3">
              {[
                { title: 'The courses stay free', body: 'Every lesson, flashcard and practice question is free forever. Marking at scale is what is paid.' },
                { title: 'Honest about AI', body: 'Illegible lines are flagged, not guessed. Essay bands are approximate, and the product says so.' },
                { title: 'Students own their work', body: 'Export or delete everything, any time. No training on scripts without asking.' },
              ].map((v, i) => (
                <div key={v.title} className="ms-dash-card">
                  <p className="ms-hiw-num" style={{ fontSize: 28 }}>
                    {['i.', 'ii.', 'iii.'][i]}
                  </p>
                  <h3 className="ms-h3">{v.title}</h3>
                  <p className="ms-body-2" style={{ marginTop: 8 }}>
                    {v.body}
                  </p>
                </div>
              ))}
            </div>
          </section>

          <section className="ms-sec-tight" aria-labelledby="founder-timeline">
            <p className="ms-overline">How it happened</p>
            <h2 id="founder-timeline" className="ms-h3">
              From a green pen to a marking platform
            </h2>
            <div className="ms-story-timeline" style={{ marginTop: 12 }}>
              {TIMELINE.map((t, i) => (
                <div key={t.when} className="ms-story-row">
                  <span
                    className="ms-micro"
                    style={{
                      fontWeight: 600,
                      color: i === TIMELINE.length - 1 ? 'var(--ec-brand)' : undefined,
                    }}
                  >
                    {t.when.toUpperCase()}
                  </span>
                  <p className="ms-body-2">{t.what}</p>
                </div>
              ))}
            </div>
            <p className="ms-body-2" style={{ marginTop: 14 }}>
              The longer version of the story, and the three promises the product is built on, are on
              the{' '}
              <Link href="/about" className="ec-link font-medium">
                About page
              </Link>
              .
            </p>
          </section>

          <section className="ms-sec-tight" aria-labelledby="founder-words">
            <p className="ms-overline">In his words</p>
            <h2 id="founder-words" className="sr-only">
              In his words
            </h2>
            <blockquote className="ms-founder-quote" style={{ margin: 0 }}>
              &ldquo;Past papers without the examiner&apos;s eye are half the loop. You practise, you
              check the answer, you <em>think</em> you&apos;d have scored, and then results day
              disagrees. I built {SITE_NAME} so the examiner&apos;s eye is there at midnight when you
              are revising alone.&rdquo;
            </blockquote>
          </section>

          <section id="founder-faq" className="ms-sec-tight" aria-labelledby="founder-faq-heading">
            <p className="ms-overline">Questions people ask</p>
            <h2 id="founder-faq-heading" className="ms-h3">
              About {founder.name}
            </h2>
            <div className="mt-3 space-y-5">
              {FOUNDER_FAQ.map((item) => (
                <div key={item.q}>
                  <h3 className="font-[family-name:var(--font-display)] text-[19px] font-semibold text-[var(--ec-text-primary)]">
                    {item.q}
                  </h3>
                  <p className="ms-body-2" style={{ marginTop: 6 }}>
                    {item.a}
                  </p>
                </div>
              ))}
            </div>
          </section>

          <section className="ms-sec-tight" aria-labelledby="founder-contact">
            <p className="ms-overline">Profiles and contact</p>
            <h2 id="founder-contact" className="ms-h3">
              Reach Hamza
            </h2>
            <ul className="ms-body-2 mt-3 list-none space-y-2 p-0">
              {profiles.map((url) => (
                <li key={url}>
                  <a href={url} rel="me noopener" target="_blank" className="ec-link font-medium">
                    {profileLabel(url)}
                  </a>{' '}
                  <span className="text-[var(--ec-text-secondary)]">{url.replace(/^https?:\/\/(www\.)?/, '')}</span>
                </li>
              ))}
              <li>
                <a href={`mailto:${CONTACT_EMAIL}`} className="ec-link font-medium">
                  Email
                </a>{' '}
                <span className="text-[var(--ec-text-secondary)]">{CONTACT_EMAIL}</span>
              </li>
              <li>
                <Link href="/research" className="ec-link font-medium">
                  Press facts
                </Link>{' '}
                <span className="text-[var(--ec-text-secondary)]">for journalists and citations</span>
              </li>
            </ul>
          </section>
        </div>
      </MarketingSection>
    </MarketingPageShell>
  )
}
