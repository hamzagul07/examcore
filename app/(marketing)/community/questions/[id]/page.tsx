import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { CSSProperties } from 'react'
import { getQuestion } from '@/lib/community/qa'
import { QuestionThread } from '@/components/community/QuestionThread'
import { MarketingPageShell } from '@/components/marketing/MarketingPageShell'
import { CommunityQaJsonLd } from '@/components/seo/CommunityQaJsonLd'
import { createPageMetadata } from '@/lib/seo/metadata'

export const dynamic = 'force-dynamic'

type Props = { params: Promise<{ id: string }> }

export async function generateMetadata({ params }: Props) {
  const { id } = await params
  const data = await getQuestion(id)
  if (!data || data.question.status !== 'published') return {}
  const { question } = data
  return createPageMetadata({
    title: `${question.title} — ${question.subjectCode} Q&A`,
    description: (question.bodyMd || question.title).replace(/[#*`_>$]/g, '').slice(0, 155),
    path: `/community/questions/${id}`,
  })
}

export default async function QuestionPage({ params }: Props) {
  const { id } = await params
  const data = await getQuestion(id)
  if (!data || data.question.status !== 'published') notFound()
  const { question, answers } = data
  const subjectHref =
    question.board === 'ib' ? `/ib/subjects/${question.subjectCode}` : `/subjects/${question.subjectCode}`

  return (
    <MarketingPageShell narrow>
      <CommunityQaJsonLd question={question} answers={answers} />
      <div className="ms-pg" style={{ paddingTop: 48, '--sc': 'var(--ec-brand)' } as CSSProperties}>
        <Link href={subjectHref} className="ec-btn-underline text-[15px]">
          ← {question.subjectCode}
        </Link>
        <p className="ms-overline" style={{ marginTop: 16 }}>
          Community Q&amp;A
        </p>
        <QuestionThread
          question={{
            id: question.id,
            authorId: question.authorId,
            authorUsername: question.authorUsername,
            title: question.title,
            bodyMd: question.bodyMd,
            voteCount: question.voteCount,
            subjectName: question.subjectCode,
          }}
          answers={answers}
        />
      </div>
    </MarketingPageShell>
  )
}
