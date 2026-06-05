'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { ArrowRight, BookOpen, Eye, Lightbulb, Target } from 'lucide-react'
import type { CourseLesson } from '@/lib/courses/types'
import type { EnrichedVisualLesson, VisualBlock } from '@/lib/courses/visual-types'
import type { PastPaperQuestionRef } from '@/lib/courses/types'
import { CourseLessonContent } from '@/components/courses/CourseLessonContent'
import { CoursePastPaperSection } from '@/components/courses/CoursePastPaperSection'
import { TopicDiagram } from '@/components/courses/visuals/TopicDiagram'
import { VisualStepCarousel } from '@/components/courses/visuals/VisualStepCarousel'
import { FormulaVisual } from '@/components/courses/visuals/FormulaVisual'
import { SnapshotGrid } from '@/components/courses/visuals/SnapshotGrid'
import { ConceptCompare } from '@/components/courses/visuals/ConceptCompare'

type Tab = 'visual' | 'notes' | 'practice'

function VisualBlockRenderer({ block }: { block: VisualBlock }) {
  switch (block.type) {
    case 'hero-visual':
      return (
        <div className="course-visual-hero overflow-hidden rounded-2xl border border-[var(--ec-border-subtle)] bg-[var(--ec-surface-muted)]">
          <div className="px-5 pt-5">
            <TopicDiagram template={block.template} />
          </div>
          <div className="border-t border-[var(--ec-border-subtle)] px-5 py-4">
            <p className="text-sm leading-relaxed text-[var(--ec-text-secondary)]">{block.caption}</p>
          </div>
        </div>
      )
    case 'diagram-image':
      return (
        <figure className="overflow-hidden rounded-2xl border border-[var(--ec-border-subtle)]">
          <Image
            src={block.src}
            alt={block.alt}
            width={960}
            height={540}
            className="h-auto w-full"
            unoptimized
          />
        </figure>
      )
    case 'step-carousel':
      return <VisualStepCarousel title={block.title} steps={block.steps} />
    case 'formula-visual':
      return <FormulaVisual expression={block.expression} parts={block.parts} />
    case 'snapshots':
      return <SnapshotGrid title={block.title} cards={block.cards} />
    case 'compare':
      return (
        <ConceptCompare title={block.title} simple={block.simple} exam={block.exam} />
      )
    case 'worked-visual':
      return (
        <div className="overflow-hidden rounded-2xl border border-[var(--ec-border-subtle)]">
          <div className="border-b border-[var(--ec-border-subtle)] bg-[var(--ec-surface-raised)] px-4 py-3">
            <p className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-[var(--ec-text-tertiary)]">
              <Target className="h-4 w-4" aria-hidden />
              Worked example
            </p>
            <p className="mt-1 font-medium text-[var(--ec-text-primary)]">{block.question}</p>
          </div>
          <pre className="whitespace-pre-wrap px-4 py-4 font-mono text-sm leading-relaxed text-[var(--ec-text-secondary)]">
            {block.solution}
          </pre>
        </div>
      )
    case 'exam-tip':
      return (
        <div className="flex gap-3 rounded-2xl border border-amber-500/25 bg-amber-500/8 px-4 py-4 text-sm leading-relaxed text-[var(--ec-text-secondary)]">
          <Lightbulb className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" aria-hidden />
          <div>
            <p className="mb-1 font-semibold text-[var(--ec-text-primary)]">Exam tip</p>
            <p>{block.content}</p>
          </div>
        </div>
      )
    case 'practice-cta':
      return (
        <Link
          href={block.href}
          className="ec-btn-primary inline-flex items-center gap-2 rounded-2xl px-6 py-3.5 text-base font-semibold no-underline"
        >
          {block.label}
          <ArrowRight className="h-4 w-4" aria-hidden />
        </Link>
      )
    default:
      return null
  }
}

export function CourseLessonExperience({
  lesson,
  enriched,
  pastPaperQuestions,
  topicTitle,
}: {
  lesson: CourseLesson
  enriched: EnrichedVisualLesson
  pastPaperQuestions: PastPaperQuestionRef[]
  topicTitle: string
}) {
  const [tab, setTab] = useState<Tab>('visual')

  const tabs: { id: Tab; label: string; icon: typeof Eye }[] = [
    { id: 'visual', label: 'Visual learn', icon: Eye },
    { id: 'notes', label: 'Full notes', icon: BookOpen },
    { id: 'practice', label: 'Practice', icon: Target },
  ]

  return (
    <div className="course-lesson-experience">
      <div
        className="course-visual-tabs mb-8 flex flex-wrap gap-2 rounded-2xl border border-[var(--ec-border-subtle)] bg-[var(--ec-surface-muted)] p-1.5"
        role="tablist"
        aria-label="Lesson view"
      >
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            onClick={() => setTab(id)}
            className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors ${
              tab === id
                ? 'bg-[var(--ec-surface-raised)] text-[var(--ec-text-primary)] shadow-sm'
                : 'text-[var(--ec-text-tertiary)] hover:text-[var(--ec-text-secondary)]'
            }`}
          >
            <Icon className="h-4 w-4" aria-hidden />
            {label}
          </button>
        ))}
      </div>

      {tab === 'visual' ? (
        <div className="space-y-8" role="tabpanel">
          {enriched.blocks.map((block, i) => (
            <VisualBlockRenderer key={`${block.type}-${i}`} block={block} />
          ))}
        </div>
      ) : null}

      {tab === 'notes' ? (
        <div role="tabpanel">
          <CourseLessonContent lesson={lesson} />
        </div>
      ) : null}

      {tab === 'practice' ? (
        <div className="space-y-6" role="tabpanel">
          <CoursePastPaperSection questions={pastPaperQuestions} topicTitle={topicTitle} />
          {enriched.blocks
            .filter((b): b is Extract<VisualBlock, { type: 'practice-cta' }> => b.type === 'practice-cta')
            .map((b) => (
              <VisualBlockRenderer key={b.href} block={b} />
            ))}
        </div>
      ) : null}
    </div>
  )
}
