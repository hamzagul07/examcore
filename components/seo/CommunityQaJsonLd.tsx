import { JsonLd } from '@/components/seo/JsonLd'
import { SITE_NAME, SITE_URL } from '@/lib/site-config'
import type { Answer, Question } from '@/lib/community/qa'

/** Strip Markdown to plain text for schema.org text fields. */
function toText(md: string, max = 1500): string {
  return (md || '')
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/[#*`_>~|]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max)
}

/**
 * QAPage structured data for community question threads. Rich-result eligible:
 * exposes the accepted (model) answer and any suggested answers to search engines.
 */
export function CommunityQaJsonLd({ question, answers }: { question: Question; answers: Answer[] }) {
  const url = `${SITE_URL}/community/questions/${question.id}`
  const accepted =
    answers.find((a) => a.id === question.acceptedAnswerId) ?? answers.find((a) => a.isAccepted)
  const suggested = answers.filter((a) => a.id !== accepted?.id)

  const mkAnswer = (a: Answer) => ({
    '@type': 'Answer',
    text: toText(a.bodyMd),
    url: `${url}#answer-${a.id}`,
    upvoteCount: Math.max(a.voteCount, 0),
    dateCreated: a.createdAt,
    author: { '@type': 'Organization', name: SITE_NAME },
  })

  const mainEntity: Record<string, unknown> = {
    '@type': 'Question',
    name: question.title,
    text: toText(question.bodyMd || question.title),
    answerCount: answers.length,
    upvoteCount: Math.max(question.voteCount, 0),
    dateCreated: question.createdAt,
    author: question.authorUsername
      ? { '@type': 'Person', name: question.authorUsername }
      : { '@type': 'Organization', name: SITE_NAME },
  }
  if (accepted) mainEntity.acceptedAnswer = mkAnswer(accepted)
  if (suggested.length) mainEntity.suggestedAnswer = suggested.map(mkAnswer)

  return <JsonLd data={{ '@type': 'QAPage', mainEntity }} />
}
