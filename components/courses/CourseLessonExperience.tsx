'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowRight, BookOpen, Target } from 'lucide-react'
import type { CourseLesson, PastPaperQuestionRef } from '@/lib/courses/types'
import type { EnrichedVisualLesson } from '@/lib/courses/visual-types'
import { CourseLessonContent } from '@/components/courses/CourseLessonContent'
import { CoursePastPaperSection } from '@/components/courses/CoursePastPaperSection'
import { FormulaVisual } from '@/components/courses/visuals/FormulaVisual'
import { ConceptMapVisual } from '@/components/courses/visuals/ConceptMapVisual'
import { QuickCheckPanel } from '@/components/courses/visuals/QuickCheckPanel'
import { KeyTermsPanel } from '@/components/courses/visuals/KeyTermsPanel'
import { FlashcardDeck } from '@/components/courses/visuals/FlashcardDeck'
import { ComparisonTableVisual } from '@/components/courses/visuals/ComparisonTableVisual'
import { CourseExplainSimplerToggle } from '@/components/courses/CourseExplainSimplerToggle'
import { Chip } from '@/components/margin-notes'
import { CourseReadingProgress } from '@/components/courses/CourseReadingProgress'
import { CourseLessonToc } from '@/components/courses/CourseLessonToc'
import { CourseKeyTakeaways } from '@/components/courses/CourseKeyTakeaways'
import { CourseSimpleExplanation } from '@/components/courses/CourseSimpleExplanation'
import { CourseWorkedExamples } from '@/components/courses/CourseWorkedExamples'
import { CoursePastPaperPractice } from '@/components/courses/CoursePastPaperPractice'
import { CourseVisualLearning } from '@/components/courses/CourseVisualLearning'
import { CourseLegacyAnchor } from '@/components/courses/CourseLegacyAnchor'
import {
  buildNotesLesson,
  extractWorkedExamples,
  hasRenderableNotes,
  partitionEnrichedBlocks,
} from '@/lib/courses/lesson-layout'
import { buildLessonToc, extractKeyTakeaways } from '@/lib/courses/lesson-toc'

type Tab = 'learn' | 'practice'

export function CourseLessonExperience({
  lesson,
  enriched,
  pastPaperQuestions,
  topicTitle,
  subjectCode,
}: {
  lesson: CourseLesson
  enriched: EnrichedVisualLesson
  pastPaperQuestions: PastPaperQuestionRef[]
  topicTitle: string
  subjectCode: string
}) {
  const [tab, setTab] = useState<Tab>('learn')
  const [explainSimpler, setExplainSimpler] = useState(false)
  const hasSimpleExplanation = !!lesson.simpleExplanation

  const tabs: { id: Tab; label: string; hint: string; icon: typeof BookOpen }[] = [
    { id: 'learn', label: 'Learn', hint: 'Visuals + full notes', icon: BookOpen },
    { id: 'practice', label: 'Past papers', hint: 'Try questions', icon: Target },
  ]

  const partitioned = partitionEnrichedBlocks(enriched.blocks)
  const workedExamples = extractWorkedExamples(lesson)
  const notesLesson = buildNotesLesson(lesson, enriched, { omitWorkedExamples: true })
  const hasNotes = hasRenderableNotes(lesson, enriched)
  const takeaways = extractKeyTakeaways(lesson)
  const practiceSection = lesson.sections.find((s) => s.type === 'practice')
  const pastPaperPractice = lesson.sections.find((s) => s.type === 'pastPaperPractice')
  const tocEntries = buildLessonToc(lesson, enriched, partitioned)

  const hasVisual =
    partitioned.heroVisual !== null ||
    partitioned.stepCarousel !== null ||
    partitioned.diagramImage !== null || partitioned.diagramImages.length > 0

  return (
    <div
      className="course-lesson-experience ms-lesson-body"
      data-explain-simpler={explainSimpler ? 'true' : 'false'}
    >
      <CourseReadingProgress />
      <div
        className="course-visual-tabs course-studio-tabs mb-8 inline-flex w-full flex-wrap gap-1 sm:w-auto"
        role="tablist"
        aria-label="Lesson view"
      >
        {tabs.map(({ id, label, hint, icon: Icon }) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            onClick={() => setTab(id)}
            className={`flex flex-col items-center justify-center gap-0.5 rounded-xl px-5 py-2.5 transition-colors sm:min-w-[8.5rem] ${
              tab === id
                ? 'bg-[var(--ec-surface-raised)] text-[var(--ec-text-primary)] shadow-sm'
                : 'text-[var(--ec-text-tertiary)] hover:text-[var(--ec-text-secondary)]'
            }`}
          >
            <span className="flex items-center gap-2 text-sm font-semibold">
              <Icon className="h-4 w-4" aria-hidden />
              {label}
            </span>
            <span className="text-[10px] font-medium opacity-80">{hint}</span>
          </button>
        ))}
      </div>

      {tab === 'learn' ? (
        <div role="tabpanel" className="course-learn-page">
          {hasSimpleExplanation ? (
            <div className="ms-lesson-chip-row">
              <Chip variant="ok">core concept</Chip>
              <Chip variant="dim">≈ {lesson.durationMin} min</Chip>
              <CourseExplainSimplerToggle
                checked={explainSimpler}
                onChange={setExplainSimpler}
              />
            </div>
          ) : null}
          <div className="course-learn-layout">
            <div className="course-learn-main min-w-0 space-y-8">
              <div className="course-learn-toc-mobile mb-6 xl:hidden">
                <CourseLessonToc entries={tocEntries} />
              </div>

              {lesson.simpleExplanation ? (
                <CourseSimpleExplanation data={lesson.simpleExplanation} />
              ) : null}

              {hasVisual ? (
                <>
                  <CourseLegacyAnchor id="learn-steps" />
                  <CourseVisualLearning
                    partitioned={partitioned}
                    template={enriched.template}
                    lessonSlug={lesson.slug}
                  />
                </>
              ) : null}

              {partitioned.formulaVisuals.length ? (
                <div id="key-formulas" className="course-key-formulas space-y-6 scroll-mt-28">
                  {partitioned.formulaVisuals.map((block, i) => (
                    <FormulaVisual
                      key={`formula-${i}`}
                      description={block.description}
                      expressions={block.expressions}
                      expression={block.expression}
                      parts={block.parts}
                    />
                  ))}
                </div>
              ) : null}

              {hasNotes ? (
                <section id="full-notes" className="course-full-notes scroll-mt-28">
                  <CourseLegacyAnchor id="learn-notes" />
                  <header className="course-notes-transition">
                    <h2 className="course-notes-transition-title">Full topic notes</h2>
                    <p className="course-notes-transition-hint">
                      Formal explanation with the rigor you need for the exam.
                    </p>
                  </header>
                  <div className="course-notes-panel max-w-none rounded-2xl border-2 border-[var(--ec-border-subtle)] bg-[var(--ec-surface-raised)] p-5 sm:p-6 lg:p-8">
                    <CourseLessonContent lesson={notesLesson} />
                  </div>
                </section>
              ) : null}

              {workedExamples.length ? (
                <CourseWorkedExamples
                  examples={workedExamples}
                  isMcqPaper={lesson.paperType === 'mcq' || lesson.paperNumber === '1'}
                />
              ) : null}

              {pastPaperPractice?.type === 'pastPaperPractice' ? (
                <CoursePastPaperPractice
                  subjectCode={subjectCode}
                  questions={pastPaperPractice.questions}
                />
              ) : null}

              {partitioned.comparisonTable ? (
                <>
                  <CourseLegacyAnchor id="learn-compare" />
                  <div id="comparison" className="scroll-mt-28">
                    <ComparisonTableVisual
                      title={partitioned.comparisonTable.title}
                      caption={partitioned.comparisonTable.caption}
                      columns={partitioned.comparisonTable.columns}
                      rows={partitioned.comparisonTable.rows}
                    />
                  </div>
                </>
              ) : null}

              {partitioned.conceptMap ? (
                <div id="concept-map" className="scroll-mt-28">
                  <ConceptMapVisual
                    center={partitioned.conceptMap.center}
                    nodes={partitioned.conceptMap.nodes}
                    template={enriched.template}
                  />
                </div>
              ) : null}

              {partitioned.keyTerms ? (
                <>
                  <CourseLegacyAnchor id="learn-glossary" />
                  <div id="glossary" className="scroll-mt-28">
                    <KeyTermsPanel
                      title={partitioned.keyTerms.title}
                      terms={partitioned.keyTerms.terms}
                    />
                  </div>
                </>
              ) : null}

              {partitioned.quickCheck ? (
                <div id="quick-check" className="scroll-mt-28">
                  <QuickCheckPanel
                    title={partitioned.quickCheck.title}
                    items={partitioned.quickCheck.items}
                  />
                </div>
              ) : null}

              {partitioned.flashcards ? (
                <div id="flashcards" className="scroll-mt-28">
                  <FlashcardDeck
                    title={partitioned.flashcards.title}
                    cards={partitioned.flashcards.cards}
                  />
                </div>
              ) : null}

              {takeaways.length ? (
                <div id="key-takeaways" className="scroll-mt-28">
                  <CourseLegacyAnchor id="learn-takeaways" />
                  <CourseKeyTakeaways items={takeaways} />
                </div>
              ) : null}

              {practiceSection?.type === 'practice' ? (
                <div id="practice" className="scroll-mt-28">
                  <CourseLegacyAnchor id="learn-practice" />
                  <Link
                    href={practiceSection.href}
                    className="ec-btn-primary inline-flex items-center gap-2 rounded-2xl px-6 py-3.5 text-base font-semibold no-underline"
                  >
                    {practiceSection.label}
                    <ArrowRight className="h-4 w-4" aria-hidden />
                  </Link>
                </div>
              ) : null}
            </div>

            <aside className="course-learn-aside hidden xl:block">
              <CourseLessonToc entries={tocEntries} />
            </aside>
          </div>
        </div>
      ) : null}

      {tab === 'practice' ? (
        <div className="space-y-6" role="tabpanel">
          <CoursePastPaperSection questions={pastPaperQuestions} topicTitle={topicTitle} />
          {practiceSection?.type === 'practice' ? (
            <Link
              href={practiceSection.href}
              className="ec-btn-primary inline-flex items-center gap-2 rounded-2xl px-6 py-3.5 text-base font-semibold no-underline"
            >
              {practiceSection.label}
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
