import type { Board } from '@/lib/community/posts'
import { HubSeoIntro } from '@/components/seo/HubSeoIntro'
import { JsonLd } from '@/components/seo/JsonLd'
import { faqPageNode } from '@/lib/seo/structured-data'
import { SITE_URL } from '@/lib/site-config'

export const COMMUNITY_FAQ = [
  {
    q: 'What is Exam Room?',
    a: "Exam Room is MarkScheme's free student community for Cambridge A-Level and IB Diploma — ask doubts, share cheat sheets and PDFs, and discuss grade boundaries and past papers in subject-specific rooms.",
  },
  {
    q: 'Is the community for Cambridge A-Level or IB?',
    a: 'Both. Every Cambridge syllabus we support has an s/{code} community (e.g. s/9702 for Physics). IB subjects use readable slugs (e.g. s/math-aa-hl). Pick your board on the home feed or browse all subjects.',
  },
  {
    q: 'Can I post PDFs, images, and notes?',
    a: 'Yes — create a Resource post to share PDFs, images, Word docs, or PowerPoints (up to 4 MB each). Discussions and questions support markdown and LaTeX for maths.',
  },
  {
    q: 'Do I need an account?',
    a: 'You can read everything without signing in. To post, comment, or vote you need a free MarkScheme account and a public username (picked at sign-up).',
  },
  {
    q: 'How is content moderated?',
    a: 'AI screening plus community reporting keeps posts on-topic and respectful. Spam, harassment, and off-topic ads are removed. See our community guidelines for details.',
  },
] as const

function submitHref(board?: Board) {
  return board ? `/community/submit?board=${board}` : '/community/submit'
}

/** SEO + intro block — keep at top of /community. */
export function CommunityHubIntro({ board }: { board?: Board }) {
  const createHref = submitHref(board)
  return (
    <>
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'WebPage',
          '@id': `${SITE_URL}/community#webpage`,
          name: 'Exam Room — Cambridge A-Level & IB student community',
          description:
            'Free Reddit-style community for Cambridge A-Level and IB students: doubts, cheat sheets, grade boundaries, and past-paper discussion.',
          url: `${SITE_URL}/community`,
          isPartOf: { '@id': `${SITE_URL}/#website` },
          about: [
            { '@type': 'Thing', name: 'Cambridge International A-Level' },
            { '@type': 'Thing', name: 'IB Diploma Programme' },
            { '@type': 'Thing', name: 'Past paper revision' },
          ],
          potentialAction: {
            '@type': 'CreateAction',
            target: `${SITE_URL}/community/submit`,
            name: 'Create a community post',
          },
        }}
      />
      <JsonLd data={faqPageNode([...COMMUNITY_FAQ], { speakableSelectors: ['.rc-faq dt', '.rc-faq dd'] })} />
      <div className="rc-hub-intro">
        <HubSeoIntro
          headingLevel="h1"
          collapsibleOnMobile
          heading="Exam Room"
          paragraph="Free student communities for every subject we support. Ask past-paper doubts, share cheat sheets and PDFs, debate grade boundaries, and help each other revise — Cambridge CAIE and IB Diploma in one place."
          links={[
            { href: createHref, label: 'Create a post →', variant: 'primary' },
            { href: '/community/subjects', label: 'Browse subjects', variant: 'ghost' },
            { href: '/community/guidelines', label: 'Guidelines', variant: 'muted' },
          ]}
        />
      </div>
    </>
  )
}

/** FAQ block — render at the bottom of /community. */
export function CommunityHubFaq() {
  return (
    <section className="rc-faq rc-faq--footer" aria-labelledby="community-faq">
      <h2 id="community-faq" className="rc-faq-title">
        Frequently asked questions
      </h2>
      <dl className="rc-faq-list">
        {COMMUNITY_FAQ.map((item) => (
          <div key={item.q}>
            <dt>{item.q}</dt>
            <dd>{item.a}</dd>
          </div>
        ))}
      </dl>
    </section>
  )
}

/** @deprecated Use CommunityHubIntro + CommunityHubFaq separately. */
export function CommunityHubSeo() {
  return (
    <>
      <CommunityHubIntro />
      <CommunityHubFaq />
    </>
  )
}
