import Link from 'next/link'

import {
  MarketingHero,
  MarketingPageShell,
  MarketingSection,
} from '@/components/marketing/MarketingPageShell'
import { PageJsonLd } from '@/components/seo/PageJsonLd'
import { JsonLd } from '@/components/seo/JsonLd'
import { faqPageNode, type JsonLd as JsonLdData } from '@/lib/seo/structured-data'
import { CaieGraphNav } from '@/components/seo/CaieGraphNav'
import type { CaieSubjectRef, CaieSurface } from '@/lib/seo/caie-graph'
import { caieLessonPath, caieSurfacePath } from '@/lib/seo/caie-graph'
import type { CourseLesson } from '@/lib/courses/types'
import { CaieQuizSurface } from '@/components/seo/CaieQuizSurface'

function quizJsonLd(lesson: CourseLesson, path: string) {
  const items = (lesson.quickCheck ?? []).slice(0, 20).map((q) => ({
    '@type': 'Question',
    name: q.prompt,
    acceptedAnswer: {
      '@type': 'Answer',
      text: q.answer,
    },
  }))
  return {
    '@context': 'https://schema.org',
    '@type': 'Quiz',
    name: `${lesson.title} quick check`,
    url: path,
    educationalAlignment: lesson.topicCode,
    hasPart: items,
  }
}

function flashcardQuizJsonLd(lesson: CourseLesson, path: string) {
  const items = (lesson.flashcards ?? []).slice(0, 40).map((c) => ({
    '@type': 'Question',
    name: c.front,
    acceptedAnswer: {
      '@type': 'Answer',
      text: c.back,
    },
  }))
  return {
    '@context': 'https://schema.org',
    '@type': 'Quiz',
    name: `${lesson.title} flashcards`,
    about: lesson.title,
    url: path,
    hasPart: items,
  }
}

export function CaieSurfacePage({
  subjectRef,
  lesson,
  surface,
  path,
}: {
  subjectRef: CaieSubjectRef
  lesson: CourseLesson
  surface: CaieSurface
  path: string
}) {
  const lessonPath = caieLessonPath(subjectRef.code, lesson.slug) ?? subjectRef.hubPath
  const markHref = `/mark?subject=${encodeURIComponent(subjectRef.code)}&topic=${encodeURIComponent(lesson.topicCode)}`
  const titles: Record<CaieSurface, string> = {
    flashcards: `${lesson.title} flashcards`,
    faq: `${lesson.title} — FAQ`,
    quiz: `${lesson.title} quiz`,
    questions: `${lesson.title} — practice questions`,
    mistakes: `${lesson.title} — common mistakes`,
  }
  const leads: Record<CaieSurface, string> = {
    flashcards: `Revision flashcards for Cambridge ${subjectRef.code} ${lesson.title} (syllabus ${lesson.topicCode}). Flip, recall, then mark a real past-paper question.`,
    faq: `Frequently asked questions for ${subjectRef.code} ${lesson.title}. Direct answers first, then deeper explanation — then practise with marking.`,
    quiz: `Quick-check quiz for ${subjectRef.code} ${lesson.title}. Check yourself, then mark a past-paper question on the same syllabus point.`,
    questions: `Practice and worked examples for ${subjectRef.code} ${lesson.title}. Short previews only — attempt the full question in MarkScheme against the official scheme.`,
    mistakes: `Common exam mistakes on ${subjectRef.code} ${lesson.title}. Learn what loses marks, then practise the topic with Examiner’s Ink.`,
  }

  const examTips =
    lesson.sections?.filter((s) => s.type === 'examTip').map((s) => s.content) ?? []
  const worked =
    lesson.sections?.filter((s) => s.type === 'workedExample') ?? []
  const practiceBlocks =
    lesson.sections?.filter((s) => s.type === 'pastPaperPractice') ?? []

  const structured: JsonLdData[] = []
  if (surface === 'faq' && lesson.faq?.length) {
    structured.push(faqPageNode(lesson.faq.map((f) => ({ q: f.q, a: f.a }))))
  }
  if (surface === 'flashcards' && lesson.flashcards?.length) {
    structured.push(flashcardQuizJsonLd(lesson, path) as JsonLdData)
  }
  if (surface === 'quiz' && lesson.quickCheck?.length) {
    structured.push(quizJsonLd(lesson, path) as JsonLdData)
  }

  return (
    <MarketingPageShell>
      <PageJsonLd
        path={path}
        title={titles[surface]}
        description={leads[surface]}
        breadcrumbs={[
          { name: 'Home', path: '/' },
          { name: 'CAIE', path: '/caie' },
          { name: `${subjectRef.code} ${subjectRef.name}`, path: subjectRef.hubPath },
          { name: lesson.title, path: lessonPath },
          { name: titles[surface], path },
        ]}
      />
      {structured.length ? <JsonLd data={structured} /> : null}

      <MarketingHero
        label={`${subjectRef.code} · ${lesson.topicCode}`}
        title={titles[surface]}
        lead={leads[surface]}
        breadcrumbs={[
          { name: 'Home', path: '/' },
          { name: `${subjectRef.code}`, path: subjectRef.hubPath },
          { name: lesson.title, path: lessonPath },
          { name: surface, path },
        ]}
      />

      <MarketingSection className="!pt-0">
        <CaieGraphNav code={subjectRef.code} lesson={lesson} active={surface} />

        {surface === 'flashcards' ? (
          <ul className="grid list-none gap-3 p-0 sm:grid-cols-2">
            {(lesson.flashcards ?? []).map((card, i) => (
              <li key={i} className="ec-card ec-card--paper p-4">
                <p className="ms-overline">{card.pillLabel || 'Card'}</p>
                <p className="mt-2 font-semibold">{card.front}</p>
                <p className="ms-body-2 mt-2">{card.back}</p>
              </li>
            ))}
          </ul>
        ) : null}

        {surface === 'faq' ? (
          <dl className="space-y-4">
            {(lesson.faq ?? []).map((f) => (
              <div key={f.q} className="ec-card ec-card--paper p-5">
                <dt className="font-semibold">
                  <h2 className="text-base font-semibold">{f.q}</h2>
                </dt>
                <dd className="ms-body-2 mt-2 whitespace-pre-wrap">{f.a}</dd>
              </div>
            ))}
          </dl>
        ) : null}

        {surface === 'quiz' ? (
          <CaieQuizSurface
            lesson={lesson}
            quizHref={caieSurfacePath(subjectRef.code, lesson.slug, 'quiz') ?? path}
          />
        ) : null}

        {surface === 'questions' ? (
          <div className="space-y-6">
            {worked.map((w, i) =>
              w.type === 'workedExample' ? (
                <article key={i} className="ec-card ec-card--paper p-5">
                  <h2 className="ms-h3" style={{ fontSize: '1.1rem' }}>
                    Worked example {i + 1}
                  </h2>
                  <p className="ms-body-2 mt-3 whitespace-pre-wrap">{w.question}</p>
                  <details className="mt-3">
                    <summary className="cursor-pointer text-sm font-medium text-[var(--ec-brand)]">
                      Show solution outline
                    </summary>
                    <p className="ms-body-2 mt-2 whitespace-pre-wrap">{w.solution}</p>
                  </details>
                </article>
              ) : null
            )}
            {practiceBlocks.map((block, i) =>
              block.type === 'pastPaperPractice' ? (
                <div key={i} className="space-y-3">
                  <h2 className="ms-h3" style={{ fontSize: '1.1rem' }}>
                    Past-paper practice
                  </h2>
                  {block.questions.map((q) => (
                    <article key={q.questionId} className="ec-card ec-card--paper p-5">
                      <p className="ms-overline">
                        {q.session} · Paper {q.paperVariant} · Q{q.questionNumber} · {q.marks} marks
                      </p>
                      <p className="ms-body-2 mt-2">{q.questionTextPreview}</p>
                      <Link href={q.markHref} className="ec-btn-primary mt-3 inline-flex min-h-[44px]">
                        Attempt &amp; mark <span className="h-4 w-4" aria-hidden>-&gt;</span>
                      </Link>
                    </article>
                  ))}
                </div>
              ) : null
            )}
            {(lesson.pastPaperReferences ?? []).length > 0 ? (
              <ul className="space-y-3">
                {lesson.pastPaperReferences!.map((q) => (
                  <li key={`${q.paperCode}-${q.questionNumber}`} className="ec-card ec-card--paper p-5">
                    <p className="ms-overline">
                      {q.sessionLabel} · {q.paperCode} · Q{q.questionNumber}
                    </p>
                    <p className="ms-body-2 mt-2 line-clamp-4">{q.questionText}</p>
                    <Link href={q.markHref} className="ec-btn-primary mt-3 inline-flex min-h-[44px]">
                      Mark this question
                    </Link>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : null}

        {surface === 'mistakes' ? (
          <div className="space-y-4">
            {examTips.map((tip, i) => (
              <article key={i} className="ec-card ec-card--paper p-5">
                <h2 className="ms-h3" style={{ fontSize: '1.05rem' }}>
                  Exam tip {i + 1}
                </h2>
                <p className="ms-body-2 mt-2 whitespace-pre-wrap">{tip}</p>
              </article>
            ))}
            {(lesson.faq ?? []).slice(0, 4).map((f) => (
              <article key={f.q} className="ec-card ec-card--paper p-5">
                <h2 className="ms-h3" style={{ fontSize: '1.05rem' }}>
                  {f.q}
                </h2>
                <p className="ms-body-2 mt-2 whitespace-pre-wrap">{f.a}</p>
              </article>
            ))}
          </div>
        ) : null}

        <div className="mt-10 flex flex-wrap gap-3">
          <Link href={markHref} className="ec-btn-primary min-h-[48px]">
            Mark a {subjectRef.code} question on this topic
          </Link>
          <Link href={lessonPath} className="ec-btn-ghost min-h-[48px]">
            Full lesson
          </Link>
          <Link href={`/courses/${subjectRef.code}/${lesson.slug}`} className="ec-btn-ghost min-h-[48px]">
            Open in course studio
          </Link>
        </div>
      </MarketingSection>
    </MarketingPageShell>
  )
}
