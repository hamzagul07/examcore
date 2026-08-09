import Link from 'next/link'

import { getPageMetadata } from '@/lib/seo/page-meta'
import { PageJsonLd } from '@/components/seo/PageJsonLd'
import { JsonLd } from '@/components/seo/JsonLd'
import { faqPageNode, softwareApplicationNode } from '@/lib/seo/structured-data'
import { PageHelpStrip } from '@/components/marketing/PageHelpStrip'
import { CommandWordExplorer } from '@/components/tools/CommandWordExplorer'
import { getCommandWords } from '@/lib/seo/command-words'
import { ToolInstrumentShell } from '@/components/tools/ToolInstrumentShell'

const PATH = '/tools/command-words'

const FAQS = [
  {
    q: 'What are command words in Cambridge exams?',
    a: 'Command words are the instructing verbs at the start of a question — like State, Explain, Discuss or Evaluate. They tell you the depth of answer the examiner expects, not just the topic. Reading them correctly is one of the fastest ways to stop losing marks.',
  },
  {
    q: 'What is the difference between describe and explain?',
    a: 'Describe means state the main features or points without reasons — say what happens. Explain means give the reasons or causes — say why and how it happens, making relationships clear. Explaining when asked to describe wastes time; describing when asked to explain loses marks.',
  },
  {
    q: 'What does evaluate mean in a Cambridge exam?',
    a: 'Evaluate means weigh up the strengths and weaknesses, or arguments for and against, then reach a supported conclusion. To hit the top band you must include a justified judgement — points on both sides with no conclusion stay mid-band.',
  },
  {
    q: 'Why do I lose marks when my content is correct?',
    a: 'Usually because you answered the wrong command word. Examiner reports cite command-word misreading every series. The fix is not more content — it is matching your answer to what the verb demands, then marking it against the official scheme.',
  },
]

export const metadata = getPageMetadata(PATH, {
  ogImagePath: '/api/og/tools/command-words',
  title: 'Cambridge Command Words — Explain, Evaluate, Discuss Meaning',
  description:
    'Cambridge command words explained: what State, Explain, Analyse, Discuss, Evaluate and Justify require — and the examiner mistakes that lose marks.',
  keywords: [
    'Cambridge command words',
    'command words meaning',
    'command words A Level',
    'explain vs describe',
    'evaluate command word',
  ],
})

function CommandWordsArtefact() {
  return (
    <aside
      className="ms-tools-artefact"
      aria-label="Example: Evaluate needs a justified conclusion"
    >
      <div className="ms-tools-artefact__head">
        <span className="ms-tools-artefact__kicker">Verb · depth</span>
        <span className="ms-tools-artefact__stamp" aria-hidden>
          CW
        </span>
      </div>
      <div className="ms-tools-artefact__figure">
        <span className="ms-tools-artefact__raw" style={{ fontSize: '1.75rem' }}>
          Eval
        </span>
      </div>
      <dl className="ms-tools-artefact__rows">
        <div className="ms-tools-artefact__row">
          <dt>Ask</dt>
          <dd>Both sides</dd>
        </div>
        <div className="ms-tools-artefact__row ms-tools-artefact__row--gap">
          <dt>Top band</dt>
          <dd>Judgement</dd>
        </div>
      </dl>
      <p className="ms-tools-artefact__cite" aria-hidden>
        the verb decides the depth — not the topic
      </p>
    </aside>
  )
}

export default function CommandWordsToolPage() {
  const words = getCommandWords()
  return (
    <>
      <PageJsonLd
        path={PATH}
        title="Cambridge command words explainer"
        description="Every Cambridge command word with examiner-accurate meanings and common mistakes."
        breadcrumbs={[
          { name: 'Home', path: '/' },
          { name: 'Tools', path: '/tools' },
          { name: 'Command words', path: PATH },
        ]}
      />
      <JsonLd data={[faqPageNode(FAQS), softwareApplicationNode()]} />

      <ToolInstrumentShell
        stamp="CW"
        label="Technique instrument"
        title={
          <>
            Cambridge <em>command words</em>
          </>
        }
        lead="Every command word Cambridge uses, what the examiner actually wants for each, and the mistake that costs marks. Search the verb in your question and answer to the right depth."
        note="circle the verb before you plan the answer"
        artefact={<CommandWordsArtefact />}
        breadcrumbs={[
          { name: 'Home', path: '/' },
          { name: 'Tools', path: '/tools' },
          { name: 'Command words', path: PATH },
        ]}
        after={
          <>
            <section className="ms-tool-instrument__faq" aria-labelledby="cw-faq">
              <h2 id="cw-faq" className="ms-tool-instrument__faq-title">
                FAQ
              </h2>
              <dl className="ms-tool-faq">
                {FAQS.map((f) => (
                  <div key={f.q}>
                    <dt>{f.q}</dt>
                    <dd className="ms-body-2">{f.a}</dd>
                  </div>
                ))}
              </dl>
            </section>
            <PageHelpStrip />
          </>
        }
      >
        <div className="ms-tool-instrument__links mb-6">
          <Link href="/mark" className="ec-link">
            Mark your answer free -&gt;
          </Link>
          <Link href="/blog/cambridge-command-words-explained" className="ec-link">
            Full guide -&gt;
          </Link>
          <Link href="/guides/command-words" className="ec-link">
            Per-subject pages -&gt;
          </Link>
        </div>

        <CommandWordExplorer words={words} />
      </ToolInstrumentShell>
    </>
  )
}
