import Link from 'next/link'
import { buildSignUpHref } from '@/lib/auth-redirect'
import { createClient } from '@/lib/supabase-server'
import { getPageMetadata } from '@/lib/seo/page-meta'
import { PageJsonLd } from '@/components/seo/PageJsonLd'
import { JsonLd } from '@/components/seo/JsonLd'
import { HubSeoIntro } from '@/components/seo/HubSeoIntro'
import { markingHowToJsonLd } from '@/lib/seo/marking-how-to'
import { PageHelpStrip } from '@/components/marketing/PageHelpStrip'
import { Hero } from '@/components/marketing/Hero'
import { LandingScreenshotSteps } from '@/components/landing/LandingScreenshotSteps'
import { InkDemoVideo } from '@/components/marketing/InkDemoVideo'
import { LandingSectionReveal } from '@/components/landing/LandingSectionReveal'
import { ToolInstrumentShell } from '@/components/tools/ToolInstrumentShell'

export const metadata = getPageMetadata('/how-it-works')

function HowItWorksArtefact() {
  return (
    <aside
      className="ms-tools-artefact"
      aria-label="Example marked line: method awarded, accuracy missed"
    >
      <div className="ms-tools-artefact__head">
        <span className="ms-tools-artefact__kicker">Script · sample</span>
        <span className="ms-tools-artefact__stamp" aria-hidden>
          M1
        </span>
      </div>
      <div className="ms-tools-artefact__figure">
        <span className="ms-tools-artefact__raw">7</span>
        <span className="ms-tools-artefact__of">/ 8</span>
      </div>
      <dl className="ms-tools-artefact__rows">
        <div className="ms-tools-artefact__row">
          <dt>Method</dt>
          <dd>M1</dd>
        </div>
        <div className="ms-tools-artefact__row ms-tools-artefact__row--gap">
          <dt>Accuracy</dt>
          <dd>A0</dd>
        </div>
      </dl>
      <p className="ms-tools-artefact__cite" aria-hidden>
        marks land on the line — not a paragraph below
      </p>
    </aside>
  )
}

export default async function HowItWorksPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const markHref = '/mark'
  const accountHref = user ? '/mark' : buildSignUpHref('/mark')

  return (
    <>
      <PageJsonLd
        path="/how-it-works"
        title="How MarkScheme marks Cambridge & IB past papers"
        description="Second-pass marking workflow: upload handwritten working for scheme-aligned Cambridge and IB feedback from real mark schemes and markbands."
        breadcrumbs={[
          { name: 'Home', path: '/' },
          { name: 'How it works', path: '/how-it-works' },
        ]}
      />
      <JsonLd data={markingHowToJsonLd()} />

      <ToolInstrumentShell
        stamp="M1"
        label="How it works"
        title={
          <>
            From photo to marked script, <em>in four honest steps.</em>
          </>
        }
        lead="No magic claimed. Here's exactly what happens to your work — and where the limits are."
        note="four steps — then the ink is on the line"
        artefact={<HowItWorksArtefact />}
        breadcrumbs={[
          { name: 'Home', path: '/' },
          { name: 'How it works', path: '/how-it-works' },
        ]}
        actions={
          <>
            <Link
              href={markHref}
              className="ec-btn-primary inline-flex min-h-[48px] items-center justify-center gap-2 px-6"
            >
              <span className="ec-ink-stamp ec-ink-stamp--inline" aria-hidden>
                M1
              </span>
              Mark a question — free
            </Link>
            <Link
              href={accountHref}
              className="ec-btn-ghost inline-flex min-h-[48px] items-center justify-center gap-2 px-6"
            >
              {user ? 'Open marking desk' : 'Create free account'}
              <span className="font-mono text-[11px] font-bold" aria-hidden>
                -&gt;
              </span>
            </Link>
          </>
        }
      >
        {/* The 38-second film first — the whole journey before the step-by-step
            stills. Lazy-mounted; costs a 55 KB poster until scrolled near. */}
        <InkDemoVideo className="mx-auto mb-12 max-w-[960px]" />

        <LandingScreenshotSteps />

        <div className="mt-12" id="marking-demo">
          <Hero primaryHref={markHref} embedded />
        </div>

        <div className="mt-14">
          <LandingSectionReveal>
            <p className="ms-overline">What you get</p>
            <h2 className="ms-h2" style={{ marginTop: 0 }}>
              Three things the ink is for
            </h2>
            <div className="mt-8 grid gap-5 md:grid-cols-3">
              <FeatureBlock
                stamp="M1"
                title="Adaptive marking"
                body="MCQ keys, B1/M1/A1 step marks, and essay band descriptors — the engine detects the question type and marks it the way Cambridge does, not with a generic rubric."
              />
              <FeatureBlock
                stamp="INK"
                title="Examiner's Ink"
                body="Red-pen-style notes anchored to your actual handwriting. See which line earned B1, where M1 was lost, or why your essay sits in a particular band — not a vague paragraph at the bottom."
              />
              <FeatureBlock
                stamp="¶"
                title="Mastery tracking"
                body="Each attempt feeds your syllabus coverage map. Spot blindspots, track progress across spec points, and know what to revise next — built from your real marking history."
              />
            </div>
          </LandingSectionReveal>
        </div>

        <div className="mt-14">
          <p className="ms-overline">Honest about the AI</p>
          <h2 className="ms-h2" style={{ marginTop: 0 }}>
            What it does well — and where it&apos;s <em>limited</em>
          </h2>
          <div className="ms-canct">
            <div className="ms-dash-card ms-canct-card ms-canct-card--ok">
              <span className="ec-ink-stamp ec-ink-stamp--inline" aria-hidden>
                ✓
              </span>
              <h3 className="ms-h3" style={{ color: 'var(--ec-brand)', marginTop: 12 }}>
                What it does well
              </h3>
              <div className="ms-canct-item">
                <span className="m" style={{ color: 'var(--ec-brand)' }}>
                  M
                </span>
                Applies the official scheme criteria, mark by mark, with citations
              </div>
              <div className="ms-canct-item">
                <span className="m" style={{ color: 'var(--ec-brand)' }}>
                  M
                </span>
                Reads most handwriting, including multi-page working
              </div>
              <div className="ms-canct-item">
                <span className="m" style={{ color: 'var(--ec-brand)' }}>
                  M
                </span>
                Spots recurring error patterns across your attempts
              </div>
            </div>
            <div className="ms-dash-card ms-canct-card ms-canct-card--limit">
              <span className="ec-ink-stamp ec-ink-stamp--inline ec-ink-stamp--crimson" aria-hidden>
                X
              </span>
              <h3 className="ms-h3" style={{ color: 'var(--ec-ink-crimson)', marginTop: 12 }}>
                Where it&apos;s limited
              </h3>
              <div className="ms-canct-item">
                <span className="m" style={{ color: 'var(--ec-ink-crimson)' }}>
                  X
                </span>
                Genuinely illegible lines are flagged, not guessed
              </div>
              <div className="ms-canct-item">
                <span className="m" style={{ color: 'var(--ec-ink-crimson)' }}>
                  X
                </span>
                Essay band judgements are approximate — a human examiner may differ
              </div>
              <div className="ms-canct-item">
                <span className="m" style={{ color: 'var(--ec-ink-crimson)' }}>
                  X
                </span>
                Grade estimates are boundary-pattern approximations, not predictions
              </div>
            </div>
          </div>
          <div className="ms-blog-cta" style={{ marginTop: 40 }}>
            <span className="ec-ink-stamp ms-blog-cta__stamp" aria-hidden>
              M1
            </span>
            <p className="ms-overline">Try the desk</p>
            <h2 className="ms-h3" style={{ fontSize: 'clamp(1.35rem, 3vw, 1.75rem)', marginTop: 8 }}>
              Put one question under the scheme
            </h2>
            <p className="ms-lead mx-auto" style={{ marginTop: 12, maxWidth: 520 }}>
              Free tier. About a minute. Not endorsed by Cambridge International.
            </p>
            <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                href={markHref}
                className="ec-btn-primary min-h-[48px] px-8 inline-flex items-center gap-2"
              >
                <span className="font-mono text-[11px] font-bold tracking-wide" aria-hidden>
                  M1
                </span>
                Mark a question — free
              </Link>
              <Link href="/compare" className="ec-btn-ghost min-h-[48px] px-8">
                Compare tools
              </Link>
            </div>
          </div>

          <div style={{ marginTop: 48 }}>
            <HubSeoIntro
              quiet
              headingLevel="h2"
              heading="Second-pass marking — how it works"
              paragraph="MarkScheme is built for scheme-aligned feedback after you self-mark: photograph handwritten Cambridge or IB answers, get B1/M1/A1 or markband breakdowns in ~30 seconds, then redo one skill before the next paper."
              links={[
                { href: '/mark', label: 'Mark a paper →', variant: 'primary' },
                { href: '/compare', label: 'Compare tools', variant: 'ghost' },
                {
                  href: '/blog/how-to-mark-cambridge-past-papers-yourself',
                  label: 'Self-marking guide',
                  variant: 'muted',
                },
              ]}
            />
          </div>
          <PageHelpStrip className="mt-10" />
        </div>
      </ToolInstrumentShell>
    </>
  )
}

function FeatureBlock({
  stamp,
  title,
  body,
}: {
  stamp: string
  title: string
  body: string
}) {
  return (
    <div className="ms-hiw-feature">
      <span className="ec-ink-stamp" aria-hidden>
        {stamp}
      </span>
      <h3 className="ms-h3" style={{ marginTop: 14 }}>
        {title}
      </h3>
      <p className="ms-body-2" style={{ marginTop: 8 }}>
        {body}
      </p>
    </div>
  )
}
