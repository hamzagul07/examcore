import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { getPageMetadata } from '@/lib/seo/page-meta'
import { AboutPersonJsonLd } from '@/components/seo/AboutPersonJsonLd'
import { PageJsonLd } from '@/components/seo/PageJsonLd'
import { MarketingHero, MarketingPageShell, MarketingSection } from '@/components/marketing/MarketingPageShell'

export const metadata = getPageMetadata('/about')

const STORY_TIMELINE = [
  {
    when: 'Late 2024',
    what: 'The frustration',
    note: 'Marked my own mocks with a green pen and a PDF scheme. Took longer than the paper.',
  },
  {
    when: 'Early 2025',
    what: 'First prototype',
    note: 'One subject (9709), one paper, my own handwriting. It caught a method mark I\u2019d missed.',
  },
  {
    when: 'Mid 2025',
    what: 'Examiner\u2019s Ink',
    note: 'Stamps on the actual script instead of a text report. Everything clicked.',
  },
  {
    when: '2026',
    what: '15 subjects, free courses',
    note: 'Whole-paper marking, progress tracking, and courses that are free forever.',
  },
  {
    when: 'Next',
    what: 'IB & more boards',
    note: 'Same loop, more syllabuses. Slowly, properly.',
  },
]

export default function AboutPage() {
  return (
    <MarketingPageShell>
      <AboutPersonJsonLd />
      <PageJsonLd
        path="/about"
        title="About MarkScheme"
        description="Built by an A-Level student: MarkScheme marks handwritten Cambridge past papers against real mark schemes."
        breadcrumbs={[
          { name: 'Home', path: '/' },
          { name: 'About', path: '/about' },
        ]}
      />
      <MarketingHero
        label="The story"
        title={
          <>
            Built by a student <em>who needed it.</em>
          </>
        }
        lead="Cambridge past-paper revision with real mark schemes — mark-by-mark feedback on your handwriting, not a generic AI grade."
      />

      <MarketingSection className="!pt-0">
        <div className="mx-auto max-w-3xl">
          <div className="ms-story-founder">
            <div className="ms-story-avatar">
              <span
                className="font-[family-name:var(--ec-font-handwriting)] text-[19px] leading-tight text-[var(--ec-brand)]"
              >
                Hassan ✎
              </span>
            </div>
            <div>
              <p className="ms-founder-quote">
                &ldquo;Past papers without the examiner&apos;s eye are half the loop. You practise,
                you check the answer, you <em>think</em> you&apos;d have scored — and then results
                day disagrees.&rdquo;
              </p>
              <p className="ms-body-2" style={{ fontSize: 16 }}>
                MarkScheme was built by Hassan, an A-Level student who got tired of waiting weeks for
                marked papers and guessing what examiners actually wanted. It marks your work the way
                Cambridge does — not a replacement for teachers, just faster, honest feedback when
                you&apos;re revising alone at midnight.
              </p>
            </div>
          </div>

          <section className="ms-sec-tight">
            <p className="ms-overline">The paper trail</p>
            <div className="ms-story-timeline">
              {STORY_TIMELINE.map((t, i) => (
                <div key={t.when} className="ms-story-row">
                  <span
                    className="ms-micro"
                    style={{
                      fontWeight: 600,
                      color:
                        i === STORY_TIMELINE.length - 1
                          ? 'var(--ec-brand)'
                          : undefined,
                    }}
                  >
                    {t.when.toUpperCase()}
                  </span>
                  <div>
                    <b className="font-[family-name:var(--font-display)] text-[19px] font-semibold text-[var(--ec-text-primary)]">
                      {t.what}
                    </b>
                    <p className="ms-body-2" style={{ marginTop: 3 }}>
                      {t.note}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="ms-sec-tight">
            <p className="ms-overline">Three promises</p>
            <div className="grid gap-4 sm:grid-cols-3">
              {[
                {
                  title: 'The courses stay free',
                  body: 'Every lesson, flashcard and practice question — free forever. Marking at scale is what\'s paid.',
                },
                {
                  title: 'Honest about AI',
                  body: 'Illegible lines get flagged, not guessed. Essay bands are approximate. Estimates say so.',
                },
                {
                  title: 'Your work is yours',
                  body: 'Export or delete everything, anytime. No training on your scripts without asking.',
                },
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

          <div className="ms-hub-card mt-12 text-center">
            <h2 className="ms-h3">Have feedback?</h2>
            <p className="ms-lead mx-auto" style={{ marginTop: 10 }}>
              We&apos;re still learning from real students. Tell us what works on your past papers
              and what we should improve.
            </p>
            <Link href="/contact" className="ec-btn-primary mt-6 inline-flex min-h-[48px]">
              Get in touch <ArrowRight className="h-5 w-5" />
            </Link>
          </div>
        </div>
      </MarketingSection>
    </MarketingPageShell>
  )
}
