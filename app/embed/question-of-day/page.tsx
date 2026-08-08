import Link from 'next/link'
import { SITE_URL } from '@/lib/site-config'
import { getExpandedTopicQuestionPages } from '@/lib/seo/topic-questions-expand'
import { createPageMetadata } from '@/lib/seo/metadata'

export const metadata = createPageMetadata({
  title: 'Question of the day embed — MarkScheme',
  description: 'Embeddable daily past-paper practice prompt.',
  path: '/embed/question-of-day',
  canonicalPath: '/past-papers/topics',
  index: false,
})

function pickDaily<T>(items: T[], seed: string): T | null {
  if (!items.length) return null
  let h = 0
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0
  return items[h % items.length] ?? null
}

export default function EmbedQuestionOfDayPage() {
  const day = new Date().toISOString().slice(0, 10)
  const topics = getExpandedTopicQuestionPages('9702')
  const topic = pickDaily(topics, day)
  const href = topic
    ? `${SITE_URL}/past-papers/9702/${topic.topicSlug}?utm_source=embed&utm_medium=iframe&utm_campaign=qotd`
    : `${SITE_URL}/mark?utm_source=embed&utm_medium=iframe&utm_campaign=qotd`

  return (
    <div className="ec-card p-4">
      <p className="ms-overline">Question of the day · 9702</p>
      <h1 className="ms-h3 mt-2" style={{ fontSize: '1.15rem' }}>
        {topic?.title ?? 'Mark a Physics past-paper question'}
      </h1>
      <p className="ms-body-2 mt-2">
        {topic
          ? `Syllabus ${topic.topicCode}. Attempt a real past-paper question and get Examiner’s Ink against the official scheme.`
          : 'Practise Cambridge Physics with scheme-aligned marking.'}
      </p>
      <Link
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="ec-btn-primary mt-4 inline-flex min-h-[44px]"
      >
        Practise today →
      </Link>
      <p className="mt-4 text-center text-xs text-[var(--ec-text-faint)]">
        <Link
          href={`${SITE_URL}/?utm_source=embed&utm_medium=iframe&utm_campaign=qotd`}
          target="_blank"
          rel="noopener noreferrer"
          className="underline"
        >
          Powered by MarkScheme
        </Link>
      </p>
    </div>
  )
}
