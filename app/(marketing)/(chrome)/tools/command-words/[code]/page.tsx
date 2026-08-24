import Link from 'next/link'

import { notFound } from 'next/navigation'
import { getPageMetadata } from '@/lib/seo/page-meta'
import { PageJsonLd } from '@/components/seo/PageJsonLd'
import { JsonLd } from '@/components/seo/JsonLd'
import { faqPageNode } from '@/lib/seo/structured-data'
import { CommandWordExplorer } from '@/components/tools/CommandWordExplorer'
import { getCommandWords } from '@/lib/seo/command-words'
import { getCommandWordsHubEntry } from '@/lib/seo/command-words-hub'
import { getCommandWordsSubjectProfile } from '@/lib/seo/command-words-subjects'
import { isValidMarkingSubjectCode } from '@/lib/seo/programmatic-subjects'
import { getMarkingSubjectCodes } from '@/lib/seo/programmatic-subjects'
import { ToolInstrumentShell } from '@/components/tools/ToolInstrumentShell'

type Props = { params: Promise<{ code: string }> }

export function generateStaticParams() {
  return getMarkingSubjectCodes().map((code) => ({ code }))
}

export async function generateMetadata({ params }: Props) {
  const { code } = await params
  if (!isValidMarkingSubjectCode(code)) return {}
  const entry = getCommandWordsHubEntry(code)
  if (!entry) return {}
  return getPageMetadata(entry.toolPath, {
    ogImagePath: '/api/og/tools/command-words',
    title: `${code} ${entry.label} command words — Cambridge exam technique`,
    description: `Every command word that matters in Cambridge ${code} ${entry.label} (${entry.level}): what examiners reward, common mistakes, and how to mark your answers.`,
    keywords: [
      `${code} command words`,
      `Cambridge ${entry.label} command words`,
      `${code} exam technique`,
      `${code} explain vs describe`,
      `${code} evaluate questions`,
    ],
  })
}

export default async function SubjectCommandWordsPage({ params }: Props) {
  const { code } = await params
  if (!isValidMarkingSubjectCode(code)) notFound()

  const entry = getCommandWordsHubEntry(code)
  if (!entry) notFound()

  const profile = getCommandWordsSubjectProfile(code)
  const words = getCommandWords()
  const path = entry.toolPath
  const breadcrumbs = [
    { name: 'Home', path: '/' },
    { name: 'Tools', path: '/tools' },
    { name: 'Command words', path: '/tools/command-words' },
    { name: `${code} ${entry.label}`, path },
  ]

  const faqs = [
    {
      q: `What command words appear most in ${code}?`,
      a: `${entry.label} papers lean on ${profile.topVerbs.slice(0, 3).join(', ')} — but always circle the verb in each question before you plan. ${profile.paperNote}`,
    },
    {
      q: `How are ${code} answers marked?`,
      a:
        entry.markingStyle === 'bands'
          ? `Essay-style responses use level-of-response bands — command words like Evaluate and Discuss need a justified conclusion, not just points.`
          : entry.markingStyle === 'point'
            ? `Most ${code} marks are point-based — method and accuracy marks reward the working the command word implies (especially Calculate and Show that).`
            : `Mixed marking: short questions use point marks; longer responses use bands. Match depth to the verb every time.`,
    },
    {
      q: `Where can I practise ${code} questions?`,
      a: `Browse ${code} past papers, attempt timed questions, then mark against the official scheme on MarkScheme.`,
    },
  ]

  const topVerb = profile.topVerbs[0] ?? 'Explain'

  return (
    <>
      <PageJsonLd
        path={path}
        title={`${code} ${entry.label} command words`}
        description={profile.emphasis}
        breadcrumbs={breadcrumbs}
      />
      <JsonLd data={[faqPageNode(faqs)]} />

      <ToolInstrumentShell
        stamp={code.slice(0, 2)}
        label={`${code} · ${entry.level}`}
        title={
          <>
            {entry.label} <em>command words</em>
          </>
        }
        lead={profile.emphasis}
        note={`lean on ${topVerb.toLowerCase()} — but circle every verb`}
        artefact={
          <aside className="ms-tools-artefact" aria-label={`${code} command-word focus`}>
            <div className="ms-tools-artefact__head">
              <span className="ms-tools-artefact__kicker">{code} · verbs</span>
              <span className="ms-tools-artefact__stamp" aria-hidden>
                CW
              </span>
            </div>
            <div className="ms-tools-artefact__figure">
              <span className="ms-tools-artefact__raw" style={{ fontSize: '1.5rem' }}>
                {topVerb.slice(0, 6)}
              </span>
            </div>
            <dl className="ms-tools-artefact__rows">
              {profile.topVerbs.slice(0, 3).map((v) => (
                <div key={v} className="ms-tools-artefact__row">
                  <dt>Verb</dt>
                  <dd>{v}</dd>
                </div>
              ))}
            </dl>
            <p className="ms-tools-artefact__cite" aria-hidden>
              match depth to the verb every time
            </p>
          </aside>
        }
        breadcrumbs={breadcrumbs}
        after={
          <section className="ms-tool-instrument__faq" aria-labelledby="cw-subj-faq">
            <h2 id="cw-subj-faq" className="ms-tool-instrument__faq-title">
              FAQ
            </h2>
            <dl className="ms-tool-faq">
              {faqs.map((f) => (
                <div key={f.q}>
                  <dt>{f.q}</dt>
                  <dd className="ms-body-2">{f.a}</dd>
                </div>
              ))}
            </dl>
          </section>
        }
      >
        <div className="ms-tool-instrument__links mb-6">
          <Link href={`/mark?subject=${code}`} className="ec-link">
            Mark {code} free -&gt;
          </Link>
          {entry.guideSlug ? (
            <Link href={`/blog/${entry.guideSlug}`} className="ec-link">
              Full {code} guide -&gt;
            </Link>
          ) : null}
          <Link href={entry.subjectPath} className="ec-link">
            {code} marking hub -&gt;
          </Link>
          <Link href="/tools/command-words" className="ec-link">
            All command words -&gt;
          </Link>
          <Link href={`/past-papers/${code}`} className="ec-link">
            {code} past papers -&gt;
          </Link>
        </div>

        <CommandWordExplorer words={words} />
      </ToolInstrumentShell>
    </>
  )
}
